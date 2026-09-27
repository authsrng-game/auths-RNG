'use strict';

const ADDON_ORIGIN = 'https://addons.authsrng.xyz';
const INDEX_URL = `${ADDON_ORIGIN}/index.json`;
const INSTALLED_KEY = 'installedAddonIds';

function getInstalledIds() {
	try {
		return JSON.parse(localStorage.getItem(INSTALLED_KEY) || '[]');
	} catch (_) {
		return [];
	}
}

function setInstalledIds(ids) {
	try {
		localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids));
	} catch (_) {}
}

function notify(text) {
	if (typeof window.addNotification === 'function') {
		window.addNotification(text);
	} else {
		console.log('[addon]', text);
	}
}

const AddonManager = {
	active: new Map(),
	index: [],

	load(entry) {
		if (this.active.has(entry.id)) {
			const existing = this.active.get(entry.id);
			if (existing.version === entry.version) return;
			this.unload(entry.id);
		}

		const script = document.createElement('script');
		script.src = `${ADDON_ORIGIN}/bundles/${entry.id}/${entry.version}/${entry.entry}`;
		script.dataset.addonId = entry.id;
		script.dataset.addonVersion = entry.version;
		script.async = false;
		script.onerror = () => {
			console.error('failed to load addon script:', entry.id);
		};
		document.body.appendChild(script);

		this.active.set(entry.id, { version: entry.version, scriptEl: script });
	},

	unload(id) {
		const inst = this.active.get(id);
		if (!inst) return;
		inst.scriptEl.remove();
		this.active.delete(id);
	},

	unloadAll() {
		for (const id of Array.from(this.active.keys())) this.unload(id);
	},

	install(entry) {
		const ids = getInstalledIds();
		if (!ids.includes(entry.id)) {
			ids.push(entry.id);
			setInstalledIds(ids);
		}
		this.load(entry);
	},

	uninstall(id) {
		const ids = getInstalledIds().filter((x) => x !== id);
		setInstalledIds(ids);
		this.unload(id);
	},

	isInstalled(id) {
		return getInstalledIds().includes(id);
	},

	async fetchIndex() {
		const res = await fetch(INDEX_URL, { cache: 'no-store' });
		if (!res.ok) throw new Error('failed to fetch addon index');
		const data = await res.json();
		this.index = data;
		return data;
	},

	async syncFromIndex() {
		let index;
		try {
			index = await this.fetchIndex();
		} catch (err) {
			console.error('addon index fetch failed:', err);
			return this.index;
		}

		const byId = new Map(index.map((entry) => [entry.id, entry]));
		const installedIds = getInstalledIds();
		const stillValid = [];

		for (const id of installedIds) {
			const entry = byId.get(id);
			if (entry) {
				stillValid.push(id);
				this.load(entry);
			} else {
				notify(`the "${id}" addon has been removed and is no longer available`);
			}
		}

		setInstalledIds(stillValid);
		return index;
	},
};

window.AddonManager = AddonManager;

function initAddons() {
	AddonManager.syncFromIndex().then(() => {
		document.dispatchEvent(new CustomEvent('addonsReady'));
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initAddons);
} else {
	initAddons();
}
