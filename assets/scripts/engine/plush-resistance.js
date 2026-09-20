(function (root) {
	const RESISTANCE_THRESHOLD_CHANCE = 0.001;
	const COOLDOWN_ROLLS = 60;
	const FLOOR_SUPPRESSION = 0.05;

	class ResistanceTracker {
		constructor() {
			this._active = new Map();
		}

		_isSubjectToResistance(rarity) {
			if (rarity.chance != null) return rarity.chance <= RESISTANCE_THRESHOLD_CHANCE;
			return !!rarity.denomEpic;
		}

		onWin(rarity) {
			if (!this._isSubjectToResistance(rarity)) return;
			this._active.set(rarity.name, COOLDOWN_ROLLS);
			if (root.PlushLog) {
				root.PlushLog.milestone('resistance', 'suppression window opened', {
					name: rarity.name,
					rolls: COOLDOWN_ROLLS,
				});
			}
		}

		tick() {
			this._active.forEach((remaining, name) => {
				const next = remaining - 1;
				if (next <= 0) {
					this._active.delete(name);
					if (root.PlushLog)
						root.PlushLog.debug('resistance', 'suppression cleared', { name: name });
				} else {
					this._active.set(name, next);
				}
			});
		}

		getMultiplier(rarity) {
			const remaining = this._active.get(rarity.name);
			if (!remaining) return 1.0;
			const progress = remaining / COOLDOWN_ROLLS;
			return FLOOR_SUPPRESSION + (1 - FLOOR_SUPPRESSION) * (1 - progress);
		}

		remaining(name) {
			return this._active.get(name) || 0;
		}

		serialize() {
			const obj = {};
			this._active.forEach(function (v, k) {
				obj[k] = v;
			});
			return obj;
		}

		deserialize(data) {
			// Generated code starts here on 2026-06-18T02:00:00Z:
			this._active = new Map(
				Object.entries(data || {}).map(function (entry) {
					return [entry[0], Number(entry[1]) || 0];
				})
			);
			// Generated code ends here on 2026-06-18T02:00:00Z:
		}
	}

	root.ResistanceTracker = ResistanceTracker;
})(typeof window !== 'undefined' ? window : this);
