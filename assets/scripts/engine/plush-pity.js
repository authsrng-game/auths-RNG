(function (root) {
	const EARLY_RATIO = 0.25;
	const SOFT_RATIO = 0.65;
	const SOFT_PITY_MAX_MULT = 10.0;
	const EARLY_PITY_MULT = 1.35;
	const PITY_CHANCE_THRESHOLD = 0.05;
	const MASTERY_CAP = 0.08;
	const MASTERY_GAIN = 0.0015;

	function denomFor(rarity) {
		if (rarity.denomEpic && root.Epic) {
			const e = root.Epic.from(rarity.denomEpic);
			return Number(e.log10ish ? e.log10ish() : e.log10() + 1);
		}
		return Math.ceil(1 / rarity.chance);
	}

	function chanceOf(rarity) {
		if (rarity.denomEpic) return 1 / denomFor(rarity);
		return rarity.chance;
	}

	function derivePityConfig(chance) {
		if (chance >= PITY_CHANCE_THRESHOLD) return null;
		const expected = Math.ceil(1 / chance);
		const hard = Math.ceil(expected * 1.5);
		const soft = Math.ceil(hard * SOFT_RATIO);
		const early = Math.ceil(hard * EARLY_RATIO);
		const minEarly = Math.max(1, Math.floor(early * (1 - MASTERY_CAP)));
		return {
			hardPity: hard,
			softPityStart: soft,
			earlyPityStart: early,
			minEarlyPity: minEarly,
		};
	}

	// Generated code starts here on 2026-09-11T03:25:15Z:
	// Memoize static pity configuration to avoid ~300 object allocations per roll.
	const _pityConfigCache = new WeakMap();
	const _pityLimitCache = new WeakMap();
	function resolveConfig(rarity) {
		if (!rarity) return null;
		if (rarity.pityLimit != null) {
			const reduction =
				typeof root.getPityCompressionReduction === 'function'
					? root.getPityCompressionReduction(rarity.name)
					: 1;
			const cached = _pityLimitCache.get(rarity);
			if (cached && cached.reduction === reduction) {
				return cached.config;
			}
			const hard = Math.max(1000, Math.round(rarity.pityLimit * reduction));
			const early = Math.ceil(hard * EARLY_RATIO);
			const config = {
				hardPity: hard,
				softPityStart: Math.ceil(hard * SOFT_RATIO),
				earlyPityStart: early,
				minEarlyPity: Math.max(1, Math.floor(early * (1 - MASTERY_CAP))),
			};
			_pityLimitCache.set(rarity, { reduction, config });
			return config;
		}
		let cached = _pityConfigCache.get(rarity);
		if (cached === undefined) {
			cached = derivePityConfig(chanceOf(rarity));
			_pityConfigCache.set(rarity, cached);
		}
		return cached;
	}
	// Generated code ends here on 2026-09-11T03:25:15Z:

	class PityTracker {
		// Generated code starts here on 2026-09-12T12:00:00Z:
		// Refactored PityTracker to use O(1) step offsets instead of mutating ~550 Map items per roll.
		constructor() {
			this._step = 0;
			this._lastResetStep = new Map();
			this._mastery = new Map();
		}

		advance() {
			this._step++;
		}

		increment(name) {
			const current = this.get(name);
			this._lastResetStep.set(name, this._step - (current + 1));
		}

		reset(name, wasHardPity) {
			this._lastResetStep.set(name, this._step);
			if (!wasHardPity) {
				const m = this._mastery.get(name) || 0;
				this._mastery.set(name, Math.min(m + MASTERY_GAIN, MASTERY_CAP));
				if (root.PlushLog)
					root.PlushLog.debug('pity', 'mastery gained (natural pull!)', {
						name,
						mastery: this._mastery.get(name),
					});
			}
		}

		get(name) {
			const lastReset = this._lastResetStep.get(name);
			if (lastReset === undefined) return 0;
			return this._step - lastReset;
		}
		// Generated code ends here on 2026-09-12T12:00:00Z:

		getMastery(name) {
			return this._mastery.get(name) || 0;
		}

		getMultiplier(rarity) {
			const config = resolveConfig(rarity);
			if (!config) return 1.0;
			const count = this.get(rarity.name);
			// Generated code starts here on 2026-09-11T04:10:00Z:
			// Fast path: skip mastery lookup and floating point threshold math when pity count is below minimum early threshold.
			if (count < config.minEarlyPity) return 1.0;
			// Generated code ends here on 2026-09-11T04:10:00Z:

			const mastery = this.getMastery(rarity.name);
			const effectiveSoft = Math.max(1, Math.round(config.softPityStart * (1 - mastery)));
			const effectiveEarly = Math.max(1, Math.round(config.earlyPityStart * (1 - mastery)));

			if (count >= config.hardPity) return 9999.0;

			if (count >= effectiveSoft) {
				const softRange = Math.max(1, config.hardPity - effectiveSoft);
				const progress = (count - effectiveSoft) / softRange;
				return 1.0 + progress * (SOFT_PITY_MAX_MULT - 1.0);
			}

			if (count >= effectiveEarly) {
				const earlyRange = Math.max(1, effectiveSoft - effectiveEarly);
				const progress = (count - effectiveEarly) / earlyRange;
				return 1.0 + progress * (EARLY_PITY_MULT - 1.0);
			}

			return 1.0;
		}

		isHardPity(rarity) {
			const config = resolveConfig(rarity);
			if (!config) return false;
			return this.get(rarity.name) >= config.hardPity;
		}

		isEligible(rarity) {
			return resolveConfig(rarity) !== null;
		}

		progress(rarity) {
			const config = resolveConfig(rarity);
			if (!config) return null;
			const count = this.get(rarity.name);
			return {
				count: count,
				earlyPityStart: config.earlyPityStart,
				softPityStart: config.softPityStart,
				hardPity: config.hardPity,
				mastery: this.getMastery(rarity.name),
				multiplier: this.getMultiplier(rarity),
			};
		}

		// Generated code starts here on 2026-09-12T12:00:00Z:
		// Maintain full 100% backward compatibility with serialized save data formats.
		serialize() {
			const counters = {};
			const step = this._step;
			this._lastResetStep.forEach(function (lastReset, k) {
				counters[k] = step - lastReset;
			});
			const mastery = {};
			this._mastery.forEach(function (v, k) {
				mastery[k] = v;
			});
			return { counters: counters, mastery: mastery };
		}

		deserialize(data) {
			this._step = 0;
			this._lastResetStep = new Map();
			const counters = data.counters || data;
			for (const [k, v] of Object.entries(counters || {})) {
				this._lastResetStep.set(k, -v);
			}
			this._mastery = new Map(Object.entries(data.mastery || {}));
		}
		// Generated code ends here on 2026-09-12T12:00:00Z:
	}

	root.PityTracker = PityTracker;
})(typeof window !== 'undefined' ? window : this);
