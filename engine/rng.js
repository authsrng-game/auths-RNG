(function (root) {
  const FLOAT_DIV = 9007199254740992;

  function BeaconRNG() {
    this._gen = new root.Xoshiro256SS();
    this._callCount = 0;
    this._sessionSeed = null;
  }

  BeaconRNG.prototype.init = function () {
    const seed =
      BigInt(Date.now()) ^
      BigInt(
        Math.floor(
          (typeof performance !== 'undefined' ? performance.now() : 1) * 1e8,
        ),
      );
    this._gen.reseed(seed);
    this._sessionSeed = seed.toString(16);
  };

  BeaconRNG.prototype.loadState = function (state) {
    this._gen.setState(state);
  };

  BeaconRNG.prototype.getState = function () {
    return this._gen.getState();
  };

  BeaconRNG.prototype.reseed = function (value) {
    const s = BigInt(value);
    this._gen.reseed(s);
    this._sessionSeed = s.toString(16);
    this._callCount = 0;
  };

  BeaconRNG.prototype.float = function () {
    this._callCount++;
    return Number(this._gen.next() >> 11n) / FLOAT_DIV;
  };

  BeaconRNG.prototype.uint64 = function () {
    this._callCount++;
    return this._gen.next();
  };

  BeaconRNG.prototype.intBelow = function (n) {
    const bn = BigInt(n);
    const range = 1n << 128n;
    const limit = (range / bn) * bn;
    let r;
    do {
      r = (this._gen.next() << 64n) | this._gen.next();
      this._callCount += 2;
    } while (r >= limit);
    return r % bn;
  };

  BeaconRNG.prototype.intRange = function (lo, hi) {
    const range = BigInt(hi) - BigInt(lo);
    return BigInt(lo) + this.intBelow(range);
  };

  BeaconRNG.prototype.bool = function (probability) {
    return this.float() < probability;
  };

  BeaconRNG.prototype.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Number(this.intBelow(BigInt(i + 1)));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  };

  BeaconRNG.prototype.pick = function (arr) {
    return arr[Number(this.intBelow(BigInt(arr.length)))];
  };

  BeaconRNG.prototype.advance = function (steps) {
    for (let i = 0; i < steps; i++) this._gen.next();
    this._callCount += steps;
  };

  BeaconRNG.prototype.jump = function () {
    this._gen.jump();
  };

  BeaconRNG.prototype.debugInfo = function () {
    return {
      state: this._gen.getState(),
      calls: this._callCount,
      sessionSeed: this._sessionSeed,
    };
  };

  root.BeaconRNG = BeaconRNG;
})(typeof window !== 'undefined' ? window : this);
