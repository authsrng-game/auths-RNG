'use strict';

const ADDON_ORIGIN = 'https://addons.authsrng.xyz';
const INDEX_URL = `${ADDON_ORIGIN}/index.json`;
const INSTALLED_KEY = 'installedAddonIds';
const MAX_INSTALLED = 20;
const ACTION_COOLDOWN_MS = 400;

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

let lastActionAt = 0;
function actionAllowed() {
	const now = Date.now();
	if (now - lastActionAt < ACTION_COOLDOWN_MS) return false;
	lastActionAt = now;
	return true;
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
		if (!actionAllowed()) return false;
		const ids = getInstalledIds();
		if (ids.includes(entry.id)) return true;
		if (ids.length >= MAX_INSTALLED) {
			notify(`you can have at most ${MAX_INSTALLED} addons installed at once`);
			return false;
		}
		ids.push(entry.id);
		setInstalledIds(ids);
		document.dispatchEvent(new CustomEvent('addonPendingChange'));
		return true;
	},

	uninstall(id) {
		if (!actionAllowed()) return false;
		const ids = getInstalledIds().filter((x) => x !== id);
		setInstalledIds(ids);
		document.dispatchEvent(new CustomEvent('addonPendingChange'));
		return true;
	},

	isInstalled(id) {
		return getInstalledIds().includes(id);
	},

	hasPendingChanges() {
		const installed = new Set(getInstalledIds());
		const active = new Set(this.active.keys());
		if (installed.size !== active.size) return true;
		for (const id of installed) {
			if (!active.has(id)) return true;
		}
		return false;
	},

	applyChanges() {
		try {
			sessionStorage.setItem('addonChangesJustApplied', '1');
		} catch (_) {}
		location.reload();
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
	if (window.ADDON_HOST_NO_AUTOLOAD) return;
	AddonManager.syncFromIndex().then(() => {
		document.dispatchEvent(new CustomEvent('addonsReady'));
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initAddons);
} else {
	initAddons();
}
