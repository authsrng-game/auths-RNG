(function (root) {
	const DEPOSIT_PER_ROLL = 0.001;
	const MAX_BANK = 0.5;
	const IDLE_DECAY_PER_MS = 1 / (1000 * 60 * 60 * 12);
	const SPEND_EFFECT_SCALE = 0.6;

	class FortuneBank {
		constructor() {
			this._balance = 0;
			this._lastTouchedAt = Date.now();
			this._totalDeposited = 0;
			this._totalSpent = 0;
		}

		_applyIdleDecay(now) {
			const gap = now - this._lastTouchedAt;
			if (gap <= 0) return;
			const decay = gap * IDLE_DECAY_PER_MS;
			this._balance = Math.max(0, this._balance - decay);
			// Generated code starts here on 2026-06-18T01:05:00Z:
			this._lastTouchedAt = now;
			// Generated code ends here on 2026-06-18T01:05:00Z:
		}

		deposit(now) {
			now = now || Date.now();
			this._applyIdleDecay(now);
			this._balance = Math.min(MAX_BANK, this._balance + DEPOSIT_PER_ROLL);
			this._totalDeposited += DEPOSIT_PER_ROLL;
			this._lastTouchedAt = now;
		}

		balance() {
			this._applyIdleDecay(Date.now());
			return this._balance;
		}

		canSpend() {
			return this.balance() > 0.01;
		}

		spend() {
			const amount = this.balance();
			if (amount <= 0.01) return 0;
			this._balance = 0;
			this._totalSpent += amount;
			this._lastTouchedAt = Date.now();
			const mult = 1.0 + amount * SPEND_EFFECT_SCALE;
			if (root.PlushLog)
				root.PlushLog.milestone('fortune', 'bank spent', {
					amount: Number(amount.toFixed(4)),
					mult: Number(mult.toFixed(4)),
				});
			return mult;
		}

		serialize() {
			return {
				balance: this._balance,
				lastTouchedAt: this._lastTouchedAt,
				totalDeposited: this._totalDeposited,
				totalSpent: this._totalSpent,
			};
		}

		deserialize(snap) {
			this._balance = snap.balance || 0;
			this._lastTouchedAt = snap.lastTouchedAt || Date.now();
			this._totalDeposited = snap.totalDeposited || 0;
			this._totalSpent = snap.totalSpent || 0;
		}
	}

	root.FortuneBank = FortuneBank;
})(typeof window !== 'undefined' ? window : this);
