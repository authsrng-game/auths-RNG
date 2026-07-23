(function (root) {
	const FLOAT_DIV = 9007199254740992n;

	class BeaconRNG {
		constructor() {
			this._gen = new root.Xoshiro256SS();
			this._callCount = 0;
			this._sessionSeed = null;
		}
		init() {
			const seed = BigInt(Date.now()) ^
				BigInt(Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1e8));
			this._gen.reseed(seed);
			this._sessionSeed = seed.toString(16);
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
		}
		float() {
			this._callCount++;
			return Number(this._gen.next() >> 11n) / FLOAT_DIV;
		}
		uint64() {
			this._callCount++;
			return this._gen.next();
		}
		intBelow(n) {
			const bn = BigInt(n);
			const range = 1n << 128n;
			const limit = (range / bn) * bn;
			let r;
			do {
				r = (this._gen.next() << 64n) | this._gen.next();
				this._callCount += 2;
			} while (r >= limit);
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
			};
		}
	}















	root.BeaconRNG = BeaconRNG;
})(typeof window !== 'undefined' ? window : this);
