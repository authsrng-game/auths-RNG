(function (root) {
	const HISTORY_WINDOW = 14;
	const HOT_PULSE_DURATION = 4;
	const DRY_THRESHOLD = 5;
	const DRY_MULT_PER_STEP = 0.04;
	const DRY_MULT_CAP = 0.55;
	const COLD_WINDOW = 5;
	const COLD_TIER_RATIO = 0.55;
	const HOT_TIER_RATIO = 1.5;
	const DAILY_VARIANCE = 0.06;

	function dailyLuckOffset() {
		const day = Math.floor(Date.now() / 86400000);
		const h = Math.imul(day, 2654435761) >>> 0;
		return 1.0 + ((h & 0xff) / 255 - 0.5) * DAILY_VARIANCE;
	}

	/*

	h=
	Bin: .... .1.1 ..1. .11. .1.1 11.. .... ....
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	28 24 20 16 12 8 4 0

	Hex: 0526 5C00 (32-bit)
	Str: . & \ . (5, 38, 92, 0)
	Dec: 86,400,000 (82.397 MiB)

	day=
	Bin: .... .1.1 ..1. .11. .1.1 11.. .... ....
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	28 24 20 16 12 8 4 0

	Hex: 0526 5C00 (32-bit)
	Str: . & \ . (5, 38, 92, 0)
	Dec: 86,400,000 (82.397 MiB)
	
	h&=
	Bin: 1111 1111
	---+ ---+
	4 0

	Hex: FF (8-bit)
	Str: . (255)
	Dec: 255 (255 B) / -1

	These comments might not be useful now that I think about it.
	*/

	class StreakTracker {
		constructor() {
			this._recentTiers = [];
			this._hotPulseRolls = 0;
			this._dryRuns = new Map();
		}
		record(tier, name, isSignificantWin) {
			this._recentTiers.push(tier);
			if (this._recentTiers.length > HISTORY_WINDOW) this._recentTiers.shift();

			if (isSignificantWin) {
				const wasAlreadyHot = this._hotPulseRolls > 0;
				this._hotPulseRolls = HOT_PULSE_DURATION;
				this._dryRuns.set(name, 0);
				if (!wasAlreadyHot && root.PlushLog) {
					root.PlushLog.milestone('streak', 'hot pulse ignited', { name: name });
				}
			} else {
				if (this._hotPulseRolls > 0) this._hotPulseRolls--;
				this._dryRuns.set(name, (this._dryRuns.get(name) || 0) + 1);
			}
		}
		getLuckMultiplier() {
			const daily = dailyLuckOffset();

			if (this._hotPulseRolls > 0) return daily * 1.18;

			if (this._recentTiers.length >= COLD_WINDOW) {
				const slice = this._recentTiers.slice(-COLD_WINDOW);
				const avg =
					this._recentTiers.reduce(function (a, b) {
						return a + b;
					}, 0) / this._recentTiers.length;
				const recentAvg =
					slice.reduce(function (a, b) {
						return a + b;
					}, 0) / COLD_WINDOW;

				if (avg > 0 && recentAvg < avg * COLD_TIER_RATIO) return daily * 1.1;
				if (avg > 0 && recentAvg > avg * HOT_TIER_RATIO) return daily * 0.94;
			}

			return daily;
		}
		// Generated code starts here on 2026-09-12T15:30:00Z:
		// Fast path: skip Map lookups and chance divisions when dry runs map is empty or count is below threshold.
		getDryRunMultiplier(name, chance, denom) {
			if (this._dryRuns.size === 0) return 1.0;
			const count = this._dryRuns.get(name) || 0;
			if (count <= DRY_THRESHOLD) return 1.0;
			if (!chance && denom) chance = 1 / Number(denom);
			const denomFactor = chance ? Math.log10(Math.max(1 / chance, 10)) / 4 : 1;
			const cap = Math.min(DRY_MULT_CAP * denomFactor, 4.0);
			return 1.0 + Math.min((count - DRY_THRESHOLD) * DRY_MULT_PER_STEP, cap);
		}
		// Generated code ends here on 2026-09-12T15:30:00Z:
		isInHotPulse() {
			return this._hotPulseRolls > 0;
		}
		serialize() {
			const dryRuns = {};
			this._dryRuns.forEach(function (v, k) {
				dryRuns[k] = v;
			});
			return {
				recentTiers: this._recentTiers.slice(),
				hotPulseRolls: this._hotPulseRolls,
				dryRuns: dryRuns,
			};
		}
		deserialize(snap) {
			this._recentTiers = snap.recentTiers || [];
			this._hotPulseRolls = snap.hotPulseRolls || 0;
			this._dryRuns = new Map(Object.entries(snap.dryRuns || {}));
		}
	}

	root.StreakTracker = StreakTracker;
})(typeof window !== 'undefined' ? window : this);
