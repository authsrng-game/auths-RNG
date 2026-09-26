const ADDON_ORIGIN = 'https://addons.authsrng.xyz';

const PERMISSION_METHODS = {
	readSave: ['getInventory', 'getPoints', 'getRarities', 'getAchievements', 'getLuckMultiplier'],
	modifySave: ['setAutoSellThreshold'],
	audio: ['playSound'],
	theme: ['setCSSVar'],
	points: ['spendPoints'],
};

class AddonInstance {
	constructor(manifest) {
		this.manifest = manifest;
		this.allowed = new Set(manifest.permissions.flatMap((p) => PERMISSION_METHODS[p] || []));
		this.iframe = document.createElement('iframe');
		this.iframe.src = `${ADDON_ORIGIN}/run/${manifest.id}/${manifest.version}/`;
		this.iframe.sandbox = 'allow-scripts';
		this.iframe.style.cssText =
			'position:fixed;pointer-events:none;width:0;height:0;border:0;opacity:0;';
		this.iframe.dataset.addonId = manifest.id;
		document.body.appendChild(this.iframe);
		this._onMessage = this.onMessage.bind(this);
		window.addEventListener('message', this._onMessage);
	}

	onMessage(e) {
		if (e.origin !== ADDON_ORIGIN) return;
		if (e.source !== this.iframe.contentWindow) return;
		const { id, method, args } = e.data || {};
		if (typeof method !== 'string') return;
		if (!this.allowed.has(method)) {
			this.reply(id, { error: 'permission denied: ' + method });
			return;
		}
		const fn = this.api[method];
		if (!fn) {
			this.reply(id, { error: 'unknown method' });
			return;
		}
		try {
			const result = fn.apply(null, Array.isArray(args) ? args : []);
			this.reply(id, { result });
		} catch (err) {
			this.reply(id, { error: String((err && err.message) || err) });
		}
	}

	reply(id, payload) {
		this.iframe.contentWindow.postMessage(Object.assign({ id }, payload), ADDON_ORIGIN);
	}

	destroy() {
		window.removeEventListener('message', this._onMessage);
		this.iframe.remove();
	}

	get api() {
		return {
			getInventory: () =>
				Array.from(inventoryData.values()).map((d) => ({
					name: d.rarityObj.name,
					count: d.count,
					denom: Plush.denomOf(d.rarityObj),
				})),
			getPoints: () => points,
			getRarities: () => rarities.map((r) => ({ name: r.name, denom: Plush.denomOf(r) })),
			getAchievements: () => Array.from(achievementsUnlocked),
			getLuckMultiplier: () => globalLuckMultiplier,
			setAutoSellThreshold: (v) => {
				if (typeof v !== 'number' || v < 0 || v > 1e9) throw new Error('invalid threshold');
				window.autoSellThreshold = v;
			},
			playSound: (url) => {
				if (typeof url !== 'string' || !url.startsWith(ADDON_ORIGIN + '/')) {
					throw new Error('audio must be addon-hosted');
				}
				const audio = new Audio(url);
				audio.volume = 0.5;
				audio.play().catch(() => {});
			},
			setCSSVar: (name, value) => {
				if (typeof name !== 'string' || !/^--addon-[a-z0-9-]+$/.test(name)) {
					throw new Error('addon css vars must be prefixed --addon-');
				}
				if (typeof value !== 'string' || value.length > 200) throw new Error('invalid value');
				document.documentElement.style.setProperty(name, value);
			},
			spendPoints: (amount) => {
				if (typeof amount !== 'number' || amount <= 0 || amount > points)
					throw new Error('invalid amount');
				points -= amount;
				updatePointsDisplay();
				saveAllData();
				return points;
			},
		};
	}
}

const AddonManager = {
	active: new Map(),

	load(manifest) {
		if (this.active.has(manifest.id)) return;
		const known = Object.keys(PERMISSION_METHODS);
		const bad = manifest.permissions.filter((p) => !known.includes(p));
		if (bad.length) {
			console.error('addon has unknown permissions:', manifest.id, bad);
			return;
		}
		this.active.set(manifest.id, new AddonInstance(manifest));
	},

	unload(id) {
		const inst = this.active.get(id);
		if (!inst) return;
		inst.destroy();
		this.active.delete(id);
	},

	unloadAll() {
		for (const id of Array.from(this.active.keys())) this.unload(id);
	},
};

window.AddonManager = AddonManager;
