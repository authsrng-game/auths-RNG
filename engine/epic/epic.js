"use strict";

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = this.tail = null;
    this.hits = this.misses = 0;
  }

  get(key) {
    const node = this.cache.get(key);
    if (node) {
      this.moveToFront(node);
      this.hits++;
      return node.value;
    }
    this.misses++;
    return null;
  }

  set(key, value) {
    let node = this.cache.get(key);
    if (node) {
      node.value = value;
      this.moveToFront(node);
    } else {
      if (this.cache.size >= this.capacity) this.removeLRU();
      node = { key, value, prev: null, next: null };
      this.cache.set(key, node);
      this.addToFront(node);
    }
  }

  addToFront(node) {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  moveToFront(node) {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToFront(node);
  }

  removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  removeLRU() {
    if (!this.tail) return;
    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
  }

  resize(newCapacity) {
    this.capacity = newCapacity;
    while (this.cache.size > this.capacity) this.removeLRU();
  }

  clear() {
    this.cache.clear();
    this.head = this.tail = null;
    this.hits = this.misses = 0;
  }

  stats() {
    return { hits: this.hits, misses: this.misses, size: this.cache.size, capacity: this.capacity };
  }
}

const BASE = 10000000;
const BASE_DIGITS = 7;
let OP_CACHE = new LRUCache(2048);
const FACTORIAL_CACHE = new Map();
const FIB_CACHE = new Map();
const INTERN_POOL = new Map();

const SMALL_PRIMES_LIMIT = 1000000;
const SMALL_PRIMES_SIEVE = new Uint8Array(SMALL_PRIMES_LIMIT + 1).fill(1);
SMALL_PRIMES_SIEVE[0] = SMALL_PRIMES_SIEVE[1] = 0;
for (let p = 2; p * p <= SMALL_PRIMES_LIMIT; p++) {
  if (SMALL_PRIMES_SIEVE[p]) {
    for (let i = p * p; i <= SMALL_PRIMES_LIMIT; i += p) SMALL_PRIMES_SIEVE[i] = 0;
  }
}

function getInterned(n) {
  const ref = INTERN_POOL.get(n);
  if (ref) {
    const obj = ref.deref();
    if (obj) return obj;
  }
  return null;
}

function intern(n, epic) {
  INTERN_POOL.set(n, new WeakRef(epic));
  return epic;
}

function rawEpic(chunks, negative = false) {
  const res = Object.create(Epic.prototype);
  res.chunks = chunks;
  res.negative = negative;
  return res;
}

class Epic {
  constructor(value) {
    if (value instanceof Epic) {
      this.chunks = new Uint32Array(value.chunks);
      this.negative = value.negative;
      return this;
    }

    if (typeof value === "bigint") {
      this.negative = value < 0n;
      let v = value < 0n ? -value : value;
      const b = BigInt(BASE);
      const chunks = [];
      if (v === 0n) chunks.push(0);
      while (v > 0n) {
        chunks.push(Number(v % b));
        v /= b;
      }
      this.chunks = new Uint32Array(chunks);
      return this._normalize();
    }

    let str;
    if (typeof value === "string") str = value;
    else if (typeof value === "number") str = Math.trunc(value).toString();
    else str = "0";

    let negative = false;
    if (str.startsWith("-")) {
      negative = true;
      str = str.substring(1);
    }
    str = str.replace(/^0+/, "");
    if (str === "") {
      str = "0";
      negative = false;
    }

    if (!negative && str.length <= 4) {
      const n = parseInt(str, 10);
      if (n <= 1000) {
        const existing = getInterned(n);
        if (existing) return existing;
      }
    }

    this.negative = negative;
    this._fromString(str);

    if (!this.negative && this.chunks.length === 1 && this.chunks[0] <= 1000) {
      const existing = getInterned(this.chunks[0]);
      if (existing) return existing;
      intern(this.chunks[0], this);
    }
  }

  _fromString(str) {
    const len = str.length;
    const numChunks = Math.ceil(len / BASE_DIGITS);
    this.chunks = new Uint32Array(numChunks);
    for (let i = 0; i < numChunks; i++) {
      const end = len - i * BASE_DIGITS;
      const start = Math.max(0, end - BASE_DIGITS);
      this.chunks[i] = parseInt(str.substring(start, end), 10);
    }
  }

  toString() {
    if (this.isZero()) return "0";
    const parts = [];
    if (this.negative) parts.push("-");
    parts.push(this.chunks[this.chunks.length - 1].toString());
    for (let i = this.chunks.length - 2; i >= 0; i--) {
      let s = this.chunks[i].toString();
      while (s.length < BASE_DIGITS) s = "0" + s;
      parts.push(s);
    }
    return parts.join("");
  }

  toBigInt() {
    let res = 0n;
    let p = 1n;
    const b = BigInt(BASE);
    for (let i = 0; i < this.chunks.length; i++) {
      res += BigInt(this.chunks[i]) * p;
      p *= b;
    }
    return this.negative ? -res : res;
  }

  toNumber() { return Number(this.toBigInt()); }
  toHex() { return this.toBigInt().toString(16); }
  toBinary() { return this.toBigInt().toString(2); }

  isZero() { return this.chunks.length === 1 && this.chunks[0] === 0; }
  isOne() { return !this.negative && this.chunks.length === 1 && this.chunks[0] === 1; }
  isNegative() { return this.negative; }

  abs() {
    if (!this.negative) return this;
    return rawEpic(new Uint32Array(this.chunks), false);
  }

  neg() {
    if (this.isZero()) return this;
    return rawEpic(new Uint32Array(this.chunks), !this.negative);
  }

  _normalize() {
    let i = this.chunks.length - 1;
    while (i > 0 && this.chunks[i] === 0) i--;
    if (i !== this.chunks.length - 1) this.chunks = this.chunks.slice(0, i + 1);
    if (this.isZero()) this.negative = false;
    if (!this.negative && this.chunks.length === 1 && this.chunks[0] <= 1000) {
      const existing = getInterned(this.chunks[0]);
      if (existing) return existing;
      intern(this.chunks[0], this);
    }
    return this;
  }

  compare(b) {
    b = Epic.from(b);
    if (this.negative !== b.negative) return this.negative ? -1 : 1;
    const cmp = this._compareAbs(b);
    return this.negative ? -cmp : cmp;
  }

  _compareAbs(b) {
    if (this.chunks.length !== b.chunks.length) return this.chunks.length > b.chunks.length ? 1 : -1;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i] !== b.chunks[i]) return this.chunks[i] > b.chunks[i] ? 1 : -1;
    }
    return 0;
  }

  eq(b) { return this.compare(b) === 0; }
  gt(b) { return this.compare(b) > 0; }
  lt(b) { return this.compare(b) < 0; }
  gte(b) { return this.compare(b) >= 0; }
  lte(b) { return this.compare(b) <= 0; }

  add(b) {
    b = Epic.from(b);
    if (this.negative === b.negative) {
      const res = this._addAbs(b);
      res.negative = this.negative;
      return res._normalize();
    }
    if (this._compareAbs(b) >= 0) {
      const res = this._subAbs(b);
      res.negative = this.negative;
      return res._normalize();
    } else {
      const res = b._subAbs(this);
      res.negative = b.negative;
      return res._normalize();
    }
  }

  sub(b) {
    b = Epic.from(b);
    if (this.negative !== b.negative) {
      const res = this._addAbs(b);
      res.negative = this.negative;
      return res._normalize();
    }
    if (this._compareAbs(b) >= 0) {
      const res = this._subAbs(b);
      res.negative = this.negative;
      return res._normalize();
    } else {
      const res = b._subAbs(this);
      res.negative = !this.negative;
      return res._normalize();
    }
  }

  _addAbs(b) {
    const len = Math.max(this.chunks.length, b.chunks.length);
    const res = rawEpic(new Uint32Array(len + 1));
    let carry = 0;
    for (let i = 0; i < len || carry; i++) {
      const sum = (this.chunks[i] || 0) + (b.chunks[i] || 0) + carry;
      res.chunks[i] = sum % BASE;
      carry = (sum / BASE) | 0;
    }
    return res;
  }

  _subAbs(b) {
    const len = this.chunks.length;
    const res = rawEpic(new Uint32Array(len));
    let borrow = 0;
    for (let i = 0; i < len; i++) {
      let sub = this.chunks[i] - (b.chunks[i] || 0) - borrow;
      if (sub < 0) { sub += BASE; borrow = 1; }
      else borrow = 0;
      res.chunks[i] = sub;
    }
    return res;
  }

  mul(b) {
    b = Epic.from(b);
    if (this.isZero() || b.isZero()) return Epic.ZERO;
    const res = this._mulAbs(b);
    res.negative = this.negative !== b.negative;
    return res._normalize();
  }

  _mulAbs(b) {
    if (this.chunks.length < 10 || b.chunks.length < 10) return this._mulSchoolbook(b);
    return this._mulKaratsuba(b);
  }

  _mulSchoolbook(b) {
    const res = rawEpic(new Uint32Array(this.chunks.length + b.chunks.length));
    for (let i = 0; i < this.chunks.length; i++) {
      let carry = 0;
      for (let j = 0; j < b.chunks.length || carry; j++) {
        const prod = res.chunks[i + j] + this.chunks[i] * (b.chunks[j] || 0) + carry;
        res.chunks[i + j] = prod % BASE;
        carry = (prod / BASE) | 0;
      }
    }
    return res;
  }

  _mulKaratsuba(b) {
    const n = Math.max(this.chunks.length, b.chunks.length);
    if (n < 10) return this._mulSchoolbook(b);
    const m = (n / 2) | 0;
    const low1 = this._slice(0, m);
    const high1 = this._slice(m, this.chunks.length);
    const low2 = b._slice(0, m);
    const high2 = b._slice(m, b.chunks.length);
    const z0 = low1._mulAbs(low2);
    const z2 = high1._mulAbs(high2);
    const z1 = low1.add(high1)._mulAbs(low2.add(high2)).sub(z0).sub(z2);
    return z2._shift(2 * m).add(z1._shift(m)).add(z0);
  }

  _slice(start, end) {
    let chunks = this.chunks.slice(start, end);
    if (chunks.length === 0) chunks = new Uint32Array([0]);
    return rawEpic(chunks)._normalize();
  }

  _shift(n) {
    if (this.isZero()) return this;
    const res = rawEpic(new Uint32Array(this.chunks.length + n));
    res.chunks.set(this.chunks, n);
    return res;
  }

  div(b) {
    b = Epic.from(b);
    if (b.isZero()) throw new Error("Division by zero");
    const [q, r] = this._divmod(b);
    return q;
  }

  mod(b) {
    b = Epic.from(b);
    if (b.isZero()) throw new Error("Division by zero");
    const [q, r] = this._divmod(b);
    return r;
  }

  _divmod(b) {
    const aBig = this.toBigInt();
    const bBig = b.toBigInt();
    let qBig = aBig / bBig;
    let rBig = aBig % bBig;
    if (rBig !== 0n && (aBig < 0n !== bBig < 0n)) {
      qBig -= 1n;
      rBig += bBig;
    }
    return [new Epic(qBig), new Epic(rBig)];
  }

  pow(exp) {
    exp = Epic.from(exp);
    if (exp.negative) throw new Error("Negative exponent");
    if (exp.isZero()) return Epic.ONE;
    if (this.isZero()) return Epic.ZERO;
    const key = `pow:${this.toBigInt()}:${exp.toBigInt()}`;
    const cached = OP_CACHE.get(key);
    if (cached) return cached;
    let res = Epic.ONE;
    let base = this;
    let e = exp.toBigInt();
    while (e > 0n) {
      if (e % 2n === 1n) res = res.mul(base);
      base = base.mul(base);
      e /= 2n;
    }
    OP_CACHE.set(key, res);
    return res;
  }

  sqrt() {
    if (this.negative) throw new Error("Square root of negative number");
    if (this.isZero()) return Epic.ZERO;
    const key = `sqrt:${this.toBigInt()}`;
    const cached = OP_CACHE.get(key);
    if (cached) return cached;
    let x = this.toBigInt();
    let y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + this.toBigInt() / x) / 2n;
    }
    const res = new Epic(x);
    OP_CACHE.set(key, res);
    return res;
  }

  factorial() {
    if (this.negative) throw new Error("Factorial of negative number");
    const n = this.toNumber();
    if (n === 0 || n === 1) return Epic.ONE;
    const cached = FACTORIAL_CACHE.get(n);
    if (cached) return cached;
    const res = this._fact(1, n);
    if (n <= 100000) FACTORIAL_CACHE.set(n, res);
    return res;
  }

  _fact(a, b) {
    if (a === b) return Epic.from(a);
    if (b - a === 1) return Epic.from(a).mul(b);
    const m = Math.floor((a + b) / 2);
    return this._fact(a, m).mul(this._fact(m + 1, b));
  }

  gcd(b) {
    b = Epic.from(b).abs();
    let aBig = this.abs().toBigInt();
    let bBig = b.toBigInt();
    while (bBig !== 0n) {
      aBig %= bBig;
      [aBig, bBig] = [bBig, aBig];
    }
    return new Epic(aBig);
  }

  lcm(b) {
    b = Epic.from(b);
    if (this.isZero() || b.isZero()) return Epic.ZERO;
    const key = `lcm:${this.abs().toBigInt()}:${b.abs().toBigInt()}`;
    const cached = OP_CACHE.get(key);
    if (cached) return cached;
    const res = this.mul(b).abs().div(this.gcd(b));
    OP_CACHE.set(key, res);
    return res;
  }

  log2() {
    if (this.lte(Epic.ZERO)) throw new Error("Log of non-positive number");
    return this.toBinary().length - 1;
  }

  log10() {
    if (this.lte(Epic.ZERO)) throw new Error("Log of non-positive number");
    return this.toString().length - 1;
  }

  isPrime() {
    const key = `isPrime:${this.toBigInt()}`;
    const cached = OP_CACHE.get(key);
    if (cached !== null) return cached;
    const n = this.toBigInt();
    if (n <= BigInt(SMALL_PRIMES_LIMIT)) {
      const res = SMALL_PRIMES_SIEVE[Number(n)] === 1;
      OP_CACHE.set(key, res);
      return res;
    }
    if (n % 2n === 0n) return false;
    const res = this._millerRabin(n);
    OP_CACHE.set(key, res);
    return res;
  }

  _millerRabin(n) {
    let d = n - 1n;
    let s = 0n;
    while (d % 2n === 0n) { d /= 2n; s++; }
    const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n];
    for (const a of witnesses) {
      if (a >= n) break;
      let x = this._modPow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      let composite = true;
      for (let r = 1n; r < s; r++) {
        x = (x * x) % n;
        if (x === n - 1n) { composite = false; break; }
      }
      if (composite) return false;
    }
    return true;
  }

  _modPow(base, exp, mod) {
    let res = 1n;
    base %= mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) res = (res * base) % mod;
      base = (base * base) % mod;
      exp /= 2n;
    }
    return res;
  }

  nextPrime() {
    const key = `nextPrime:${this.toBigInt()}`;
    const cached = OP_CACHE.get(key);
    if (cached) return cached;
    let p = this.add(Epic.ONE);
    if (p.toBigInt() % 2n === 0n) p = p.add(Epic.ONE);
    while (!p.isPrime()) p = p.add(Epic.TWO);
    OP_CACHE.set(key, p);
    return p;
  }

  static from(value) { return value instanceof Epic ? value : new Epic(value); }
  static max(a, b) { a = Epic.from(a); b = Epic.from(b); return a.gte(b) ? a : b; }
  static min(a, b) { a = Epic.from(a); b = Epic.from(b); return a.lte(b) ? a : b; }

  static random(digits) {
    const chunks = new Uint32Array(Math.ceil(digits / BASE_DIGITS));
    for (let i = 0; i < chunks.length; i++) chunks[i] = Math.floor(Math.random() * BASE);
    return rawEpic(chunks)._normalize();
  }

  static fibonacci(n) {
    if (n < 0) throw new Error("Negative index");
    if (FIB_CACHE.has(n)) return FIB_CACHE.get(n);
    const res = Epic._fib(n)[0];
    if (n <= 100000) FIB_CACHE.set(n, res);
    return res;
  }

  static _fib(n) {
    if (n === 0) return [Epic.ZERO, Epic.ONE];
    if (n === 1) return [Epic.ONE, Epic.ONE];
    const [a, b] = Epic._fib(Math.floor(n / 2));
    const c = a.mul(b.mul(Epic.TWO).sub(a));
    const d = a.mul(a).add(b.mul(b));
    if (n % 2 === 0) return [c, d];
    return [d, c.add(d)];
  }

  static setCacheSize(n) { OP_CACHE.resize(n); }
  static clearCache() { OP_CACHE.clear(); FACTORIAL_CACHE.clear(); FIB_CACHE.clear(); }
  static cacheStats() { return OP_CACHE.stats(); }
}

Epic.ZERO = new Epic(0);
Epic.ONE = new Epic(1);
Epic.TWO = new Epic(2);
Epic.TEN = new Epic(10);

if (typeof module !== "undefined" && module.exports) {
  module.exports = Epic;
  module.exports.default = Epic;
  module.exports.Epic = Epic;
}
if (typeof window !== "undefined") window.Epic = Epic;

export default Epic;
export { Epic };

// use laterrrrrrrrrrrrrrrrrrrr