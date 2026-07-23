(function (root) {
	const SOFT_PITY_RATIO = 0.65;
	const SOFT_PITY_MAX_MULT = 10.0;
	const PITY_CHANCE_THRESHOLD = 0.05;

	function derivePityConfig(chance) {
		if (chance >= PITY_CHANCE_THRESHOLD) return null;
		const expected = Math.ceil(1 / chance);
		const hard = Math.ceil(expected * 1.5);
		const soft = Math.ceil(hard * SOFT_PITY_RATIO);
		return { hardPity: hard, softPityStart: soft };
	}

	function resolveConfig(rarity) {
		if (rarity.pityLimit != null) {
			return {
				hardPity: rarity.pityLimit,
				softPityStart: Math.ceil(rarity.pityLimit * SOFT_PITY_RATIO),
			};
		}
		return derivePityConfig(rarity.chance);
	}

	class PityTracker {
		constructor() {
			this._counters = new Map();
		}
		increment(name) {
			this._counters.set(name, (this._counters.get(name) || 0) + 1);
		}
		reset(name) {
			this._counters.set(name, 0);
		}
		get(name) {
			return this._counters.get(name) || 0;
		}
		getMultiplier(rarity) {
			const config = resolveConfig(rarity);
			if (!config) return 1.0;
			const count = this.get(rarity.name);
			if (count >= config.hardPity) return 9999.0;
			if (count < config.softPityStart) return 1.0;
			const softRange = config.hardPity - config.softPityStart;
			const progress = (count - config.softPityStart) / softRange;
			return 1.0 + progress * (SOFT_PITY_MAX_MULT - 1.0);
		}
		isHardPity(rarity) {
			const config = resolveConfig(rarity);
			if (!config) return false;
			return this.get(rarity.name) >= config.hardPity;
		}
		isEligible(rarity) {
			return resolveConfig(rarity) !== null;
		}
		serialize() {
			const obj = {};
			this._counters.forEach(function (v, k) {
				obj[k] = v;
			});
			return obj;
		}
		deserialize(data) {
			this._counters = new Map(Object.entries(data));
		}
	}

	root.PityTracker = PityTracker;
})(typeof window !== 'undefined' ? window : this);
