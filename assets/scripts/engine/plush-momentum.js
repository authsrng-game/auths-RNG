(function (root) {
	const MAX_COMBO = 40;
	const MAX_BONUS = 0.12;
	const ACTIVE_WINDOW_MS = 8000;
	const DECAY_PER_MS = 1 / 15000;

	class MomentumTracker {
		constructor() {
			this._combo = 0;
			this._lastRollAt = 0;
			this._peakCombo = 0;
		}

		record(now) {
			now = now || Date.now();
			const gap = now - this._lastRollAt;
			if (this._lastRollAt !== 0 && gap <= ACTIVE_WINDOW_MS) {
				this._combo = Math.min(this._combo + 1, MAX_COMBO);
			} else if (this._lastRollAt !== 0) {
				const decayed = Math.floor(gap * DECAY_PER_MS);
				this._combo = Math.max(0, this._combo - decayed);
			}
			this._lastRollAt = now;
			if (this._combo > this._peakCombo) {
				this._peakCombo = this._combo;
				if (this._combo % 10 === 0 && root.PlushLog) {
					root.PlushLog.debug('momentum', 'new combo peak', { combo: this._combo });
				}
			}
		}

		getMultiplier() {
			return 1.0 + (this._combo / MAX_COMBO) * MAX_BONUS;
		}

		combo() {
			return this._combo;
		}

		serialize() {
			return { combo: this._combo, lastRollAt: this._lastRollAt, peakCombo: this._peakCombo };
		}

		deserialize(snap) {
			snap = snap || {};
			// Generated code starts here on 2026-06-18T02:00:00Z:
			this._combo = Number(snap.combo) || 0;
			this._lastRollAt = Number(snap.lastRollAt) || 0;
			this._peakCombo = Number(snap.peakCombo) || 0;
			// Generated code ends here on 2026-06-18T02:00:00Z:
		}
	}

	root.MomentumTracker = MomentumTracker;
})(typeof window !== 'undefined' ? window : this);
