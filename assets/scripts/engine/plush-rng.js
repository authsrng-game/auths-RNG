(function (root) {
	const FLOAT_DIV = 9007199254740992;
	const DRIFT_INTERVAL = 50000;

	/* FLOAT_DIV's hex data is
	Bin: 60 56 52 48 44 40 36 32
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	.... .... ..1. .... .... .... .... ....
	.... .... .... .... .... .... .... ....
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	28 24 20 16 12 8 4 0

	Hex: 0020 0000 0000 0000 (64-bit)
	Str: . . . . . . .
	(0, 32, 0, 0, 0, 0, 0, 0)
	Dec: 9,007,199,254,740,992 (8.000 PiB)
  */

	class PlushRNG {
		constructor() {
			this._gen = new root.Xoshiro256SS();
			this._pool = new root.PlushEntropyPool();
			this._callCount = 0;
			this._sinceDrift = 0;
			this._sessionSeed = null;
		}

		init() {
			const seed = this._pool.seed();
			this._gen.reseed(seed);
			this._sessionSeed = seed.toString(16);
			if (root.PlushLog) root.PlushLog.info('rng', 'fresh entropy-pooled seed established');
		}

		loadState(state) {
			this._gen.setState(state);
		}
		getState() {
			return this._gen.getState();
		}

		reseed(value) {
			const s = BigInt(value);
			this._gen.reseed(s);
			this._sessionSeed = s.toString(16);
			this._callCount = 0;
			this._sinceDrift = 0;
			if (root.PlushLog)
				root.PlushLog.milestone('rng', 'manual reseed', { seed: this._sessionSeed });
		}

		_maybeDrift() {
			this._sinceDrift++;
			if (this._sinceDrift < DRIFT_INTERVAL) return;
			this._sinceDrift = 0;
			const state = this._gen.getState();
			const remixed = this._pool.driftReseed(state[0]);
			const newState = state.slice();
			newState[0] = (BigInt('0x' + state[0]) ^ remixed).toString(16).padStart(16, '0');
			this._gen.setState(newState);
			if (root.PlushLog) root.PlushLog.debug('rng', 'long-session drift remix applied');
		}

		// may be refactored

		float() {
			this._callCount++;
			this._maybeDrift();
			const n = this._gen.next();
			return Number(n >> 11n) / FLOAT_DIV;
		}
		uint64() {
			this._callCount++;
			this._maybeDrift();
			return this._gen.next();
		}
		intBelow(n) {
			const bn = BigInt(n);
			if (bn <= 1n) return 0n;
			// enough words to cover n plus 64 spare bits, so rejection is rare
			const words = BigInt(Math.ceil((bn.toString(2).length + 64) / 64));
			const range = 1n << (words * 64n);
			const limit = (range / bn) * bn;
			let r;
			do {
				r = 0n;
				for (let k = 0n; k < words; k++) {
					r = (r << 64n) | this._gen.next();
					this._callCount++;
				}
			} while (r >= limit);
			this._maybeDrift();
			return r % bn;
		}
		intRange(lo, hi) {
			const range = BigInt(hi) - BigInt(lo);
			return BigInt(lo) + this.intBelow(range);
		}
		bool(probability) {
			return this.float() < probability;
		}
		shuffle(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Number(this.intBelow(BigInt(i + 1)));
				const tmp = arr[i];
				arr[i] = arr[j];
				arr[j] = tmp;
			}
			return arr;
		}
		pick(arr) {
			return arr[Number(this.intBelow(BigInt(arr.length)))];
		}
		advance(steps) {
			for (let i = 0; i < steps; i++) this._gen.next();
			this._callCount += steps;
		}
		jump() {
			this._gen.jump();
		}
		debugInfo() {
			return {
				state: this._gen.getState(),
				calls: this._callCount,
				sessionSeed: this._sessionSeed,
				sinceDrift: this._sinceDrift,
			};
		}
	}

	root.PlushRNG = PlushRNG;
})(typeof window !== 'undefined' ? window : this);
