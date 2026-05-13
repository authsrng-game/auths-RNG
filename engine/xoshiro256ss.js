(function (root) {
  const M64 = 0xffffffffffffffffn; // (1n << 64n) - 1n

  function rotl64(x, k) {
    return ((x << k) | (x >> (64n - k))) & M64;
  }

  function splitmix64(s) {
    s = (s + 0x9e3779b97f4a7c15n) & M64;
    s = ((s ^ (s >> 30n)) * 0xbf58476d1ce4e5b9n) & M64;
    s = ((s ^ (s >> 27n)) * 0x94d049bb133111ebn) & M64;
    return (s ^ (s >> 31n)) & M64;
  }

  function Xoshiro256SS(seed) {
    this._s = [0n, 0n, 0n, 0n];
    this.reseed(
      seed !== undefined
        ? seed
        : BigInt(Date.now()) ^
            BigInt(
              Math.floor(
                (typeof performance !== 'undefined' ? performance.now() : 0) *
                  1e6,
              ),
            ),
    );
  }

  Xoshiro256SS.prototype.reseed = function (raw) {
    let s = BigInt(raw) & M64;
    for (let i = 0; i < 4; i++) {
      s = splitmix64(s);
      this._s[i] = s;
    }
    if (
      this._s.every(function (v) {
        return v === 0n;
      })
    )
      this._s[0] = 1n;
  };

  Xoshiro256SS.prototype.next = function () {
    const s = this._s;
    const result = (rotl64((s[1] * 5n) & M64, 7n) * 9n) & M64;
    const t = (s[1] << 17n) & M64;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl64(s[3], 45n);
    return result;
  };

  Xoshiro256SS.prototype.nextFloat = function () {
    return Number(this.next() >> 11n) / 0x1fffffffffffff; // 2^53 - 1
  };

  Xoshiro256SS.prototype.nextInt = function (min, max) {
    if (min >= max) throw new RangeError('min must be less than max');
    return min + Number(this.next() % BigInt(max - min));
  };

  Xoshiro256SS.prototype.getState = function () {
    return this._s.map(function (v) {
      return v.toString(16).padStart(16, '0');
    });
  };

  Xoshiro256SS.prototype.setState = function (arr) {
    if (arr.length !== 4)
      throw new RangeError('state must have exactly 4 elements');
    this._s = arr.map(function (v) {
      return BigInt('0x' + v) & M64;
    });
    if (
      this._s.every(function (v) {
        return v === 0n;
      })
    )
      this._s[0] = 1n;
  };

  Xoshiro256SS.prototype.jump = function () {
    const JUMP = [
      0x180ec6d33cfd0aban,
      0xd5a61266f0c9392cn,
      0xa9582618e03fc9aan,
      0x39abdc4529b1661cn,
    ];
    let s0 = 0n,
      s1 = 0n,
      s2 = 0n,
      s3 = 0n;
    for (let i = 0; i < 4; i++) {
      for (let b = 0; b < 64; b++) {
        if ((JUMP[i] >> BigInt(b)) & 1n) {
          s0 ^= this._s[0];
          s1 ^= this._s[1];
          s2 ^= this._s[2];
          s3 ^= this._s[3];
        }
        this.next();
      }
    }
    this._s[0] = s0 & M64;
    this._s[1] = s1 & M64;
    this._s[2] = s2 & M64;
    this._s[3] = s3 & M64;
  };

  root.Xoshiro256SS = Xoshiro256SS;
})(typeof window !== 'undefined' ? window : this); // oh this was confusing to make
