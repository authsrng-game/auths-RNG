'use strict';

console.log(performance.now());

(function () {
	if (window.Chronicle) return;

	let LSO;
	try {
		LSO = window.localStorage;
	} catch (_) {
		return;
	}

	const DB_NAME = 'chronicle_v1';
	const MAX_COMMITS = 15000;
	const PRUNE_BATCH = 1500;
	const SERIES_CAP = 3000;
	const ROW = 28;
	const SENS = /token|passw|secret|backup|cookie/i;
	const SAFE = /[?&]cxsafe\b/.test(location.search);
	const SRCS = ['ls', 'var', 'fn', 'net', 'event', 'idb', 'error', 'sys'];
	const SP = Storage.prototype;
	const rawGet = SP.getItem;
	const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
	const nativeErr = console.error.bind(console);

	const LANE_RULES = [
		[/revisory/, 'revisory'],
		[/sync|cloud|backup\.|game_lease/, 'sync'],
		[/^auth|authchange|account|login|welcome|migrat/, 'account'],
		[/social|friend|message|report/, 'social'],
		[/plush|_beacon|rng|pity|streak|momentum|fortune|resistance|entropy|epic/, 'engine'],
		[/gauntlet/, 'gauntlets'],
		[/starmap|constellation|void/, 'starmap'],
		[/rune/, 'runes'],
		[/mutation/, 'mutations'],
		[/expedition/, 'expeditions'],
		[/dealer/, 'dealer'],
		[/shrine/, 'shrine'],
		[/cosmetic/, 'cosmetics'],
		[/wishing|well/, 'well'],
		[/daily|weekly/, 'rewards'],
		[
			/shop|point|upgrade|potion|buy|spend|award|printer|magnet|luck|boost|price|duplicate/,
			'economy',
		],
		[/roll|rarity|rarities|inventory|achievement|anomal|soldout|trail|cutscene|confetti/, 'rolls'],
		[/theme|setting|startanim|music|sound|audio|legacy|season|particle|visual/, 'settings'],
		[
			/^(page|currentpage|seen|pagevisit)|swipe|infotip|notif|popup|modal|alert|confirm|^show/,
			'ui',
		],
		[/error|reject|exception/, 'errors'],
		[/save|load|persist|flush|reset|export|import/, 'storage'],
	];

	const NOWRAP_FN =
		/^(get|is|has|can|format|esc|el$|h$|\$|render|update|draw|calc|recalc|parse|hash|encode|decode|to[A-Z]|observe|tick|loop|lazy|_|simple|cyrb|fnv|clamp|on[A-Z])/;
	const NOWRAP_M =
		/^(get|is|has|can|status|float|uint64|int|bool|shuffle|pick|denom|probability|resistance|pity|momentum|fortune|debug|collect|list|format|log$|_)/;
	const SKIPG =
		/^(sentry|__sentry|eruda|altcha|chronicle|instant|webpack|gtag|datalayer|ga$|google|librecounter|\d+$)/i;
	const IGN_VAR =
		/mouse|cursor|scroll|lastx|lasty|nextrollallowed|sessionstart|storedseconds|totalseconds|rafid|timer|interval/i;
	const PREF = [
		'ls:totalRolls',
		'ls:shopPoints',
		'ls:anomalies',
		'ls:anomaliesUsed',
		'ls:rarityInventory.Σcount',
		'ls:rarityInventory[]',
		'ls:totalPlaytime',
		'var:globalLuckMultiplier',
	];

	// ========== config =====================
	// Configure only if needed

	let ready = false;
	let db = null;
	let ui = null;
	let metaDirty = false;
	let sessionNo = 1;
	let base = 0;
	let seqNext = 0;
	let pending = null;
	let netCount = 0;
	let netErr = 0;
	let shadowBytes = 0;
	let wt = 0;
	const pendingOps = [];
	const C = [];
	const E = [];
	const lanes = [];
	const laneIdx = new Map();
	const laneCount = new Map();
	const lastInLane = new Map();
	const open = new Map();
	const dirty = new Set();
	const dirtySeries = new Set();
	const series = new Map();
	const touched = { rev: new Map(), sync: new Map() };
	const shadow = new Map();
	const hashDirty = new Set();
	const wq = new Map();
	const probes = new Map();
	const ignored = new Set();
	const userGlobals = new Set();
	const lexNames = new Set();
	const getters = new Map();
	const wrapped = new WeakSet();
	let known = new Set();
	let hashes = {};
	let baseNames = null;
	let fnCount = 0;
	let scriptCount = 0;

	const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
	const pad = (n) => String(n).padStart(2, '0');

	function h7(str) {
		let h1 = 0xdeadbeef;
		let h2 = 0x41c6ce57;
		for (let i = 0; i < str.length; i++) {
			const ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
		return (
			(h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
		).slice(0, 7);
	}

	function fmt(n) {
		if (typeof n !== 'number' || !isFinite(n)) return String(n);
		const a = Math.abs(n);
		if (a >= 1e12) return (n / 1e12).toFixed(2) + 't';
		if (a >= 1e9) return (n / 1e9).toFixed(2) + 'b';
		if (a >= 1e7) return (n / 1e6).toFixed(2) + 'm';
		return n.toLocaleString('en-US', { maximumFractionDigits: a < 100 ? 2 : 0 });
	}

	function fmtTime(ts) {
		const d = new Date(ts);
		return (
			pad(d.getMonth() + 1) +
			'/' +
			pad(d.getDate()) +
			' ' +
			pad(d.getHours()) +
			':' +
			pad(d.getMinutes()) +
			':' +
			pad(d.getSeconds())
		);
	}

	function lowerBound(a, x) {
		let lo = 0;
		let hi = a.length;
		while (lo < hi) {
			const m = (lo + hi) >> 1;
			if (a[m] < x) lo = m + 1;
			else hi = m;
		}
		return lo;
	}

	function laneFor(s, fb) {
		const l = String(s).toLowerCase();
		for (const [re, name] of LANE_RULES) if (re.test(l)) return name;
		const m = String(s)
			.replace(/^[^a-z]+/i, '')
			.match(/^[a-z]+/i);
		return m && m[0].length > 2 ? m[0].toLowerCase() : fb || 'misc';
	}

	function laneOf(name) {
		if (!laneIdx.has(name)) {
			laneIdx.set(name, lanes.length);
			lanes.push(name);
			metaDirty = true;
		}
		return laneIdx.get(name);
	}

	function laneColor(l) {
		const i = laneIdx.has(l) ? laneIdx.get(l) : 0;
		return 'hsl(' + Math.round((i * 137.508) % 360) + ',70%,64%)';
	}

	function defer(fn) {
		if (ready) {
			try {
				fn();
			} catch (e) {
				nativeErr('[chronicle]', e);
			}
		} else if (pendingOps.length < 3000) pendingOps.push(fn);
	}

	function strip(c) {
		const o = {};
		for (const k in c) if (k[0] !== '_') o[k] = c[k];
		return o;
	}

	// Shitty arithmetic and logic that hurts my brain
	function pushSeries(name, v, ts) {
		if (typeof v !== 'number' || !isFinite(v)) return;
		let a = series.get(name);
		if (!a) {
			a = [];
			series.set(name, a);
		}
		ts = ts || Date.now();
		const l = a[a.length - 1];
		if (l && l[1] === v) return;
		if (l && ts < l[0]) ts = l[0];
		a.push([ts, v]);
		dirtySeries.add(name);
		if (a.length > SERIES_CAP) {
			const half = a.length >> 1;
			const keep = [];
			for (let i = 0; i < half; i += 2) keep.push(a[i]);
			a.splice(0, half);
			for (let i = keep.length - 1; i >= 0; i--) a.unshift(keep[i]);
		}
	}

	function valueAt(name, t) {
		const a = series.get(name);
		if (!a || !a.length || t < a[0][0]) return null;
		let lo = 0;
		let hi = a.length - 1;
		while (lo < hi) {
			const m = (lo + hi + 1) >> 1;
			if (a[m][0] <= t) lo = m;
			else hi = m - 1;
		}
		return a[lo][1];
	}

	function walkNums(path, v, d, out) {
		if (typeof v === 'number') {
			out[path] = v;
			return;
		}
		if (Array.isArray(v)) {
			out[path + '[]'] = v.length;
			if (v.length && v[0] && typeof v[0] === 'object' && typeof v[0].count === 'number') {
				let s = 0;
				for (const x of v) s += (x && +x.count) || 0;
				out[path + '.Σcount'] = s;
			}
			return;
		}
		if (v && typeof v === 'object' && d < 2) {
			let i = 0;
			for (const k in v) {
				if (++i > 40) break;
				walkNums(path + '.' + k, v[k], d + 1, out);
			}
		}
	}

	function nums(prefix, key, raw, out) {
		out = out || {};
		if (raw == null || SENS.test(key)) return out;
		if (/^-?\d+(\.\d+)?$/.test(raw)) {
			out[prefix + key] = Number(raw);
			return out;
		}
		const ch = raw.charCodeAt(0);
		if ((ch !== 123 && ch !== 91) || raw.length > 400000) return out;
		let p;
		try {
			p = JSON.parse(raw);
		} catch (_) {
			return out;
		}
		walkNums(prefix + key, p, 0, out);
		return out;
	}

	function kindOf(v) {
		return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
	}

	function brief(v) {
		const k = kindOf(v);
		if (k === 'number') return fmt(v);
		if (k === 'string') return JSON.stringify(v.length > 24 ? v.slice(0, 24) + '…' : v);
		if (k === 'array') return '[' + v.length + ']';
		if (k === 'object') return '{' + Object.keys(v).length + '}';
		return String(v);
	}

	function idField(a, b) {
		for (const f of ['name', 'id', 'key', 'uid', 'type']) {
			let ok = true;
			for (const arr of [a, b]) {
				const seen = new Set();
				for (const x of arr) {
					if (!x || typeof x !== 'object' || x[f] == null || seen.has(x[f])) {
						ok = false;
						break;
					}
					seen.add(x[f]);
				}
				if (!ok) break;
			}
			if (ok) return f;
		}
		return null;
	}

	function diffVal(a, b, path, out, d) {
		if (out.length >= 40 || a === b) return;
		const ka = kindOf(a);
		const kb = kindOf(b);
		if (ka !== kb) {
			out.push(path + ': ' + brief(a) + ' → ' + brief(b));
			return;
		}
		if (ka === 'array') {
			const f = a.length + b.length > 0 ? idField(a, b) : null;
			if (f) {
				const ma = new Map(a.map((x) => [x[f], x]));
				const mb = new Map(b.map((x) => [x[f], x]));
				for (const [k, x] of mb) {
					if (!ma.has(k))
						out.push(path + ': + ' + k + (typeof x.count === 'number' ? ' x' + x.count : ''));
					else {
						const y = ma.get(k);
						if (JSON.stringify(x) !== JSON.stringify(y)) {
							if (d < 2) diffVal(y, x, path + '[' + k + ']', out, d + 1);
							else out.push(path + '[' + k + ']: changed');
						}
					}
				}
				for (const k of ma.keys()) if (!mb.has(k)) out.push(path + ': - ' + k);
			} else if (a.length !== b.length) {
				out.push(path + ': ' + a.length + ' → ' + b.length + ' items');
			} else {
				let c = 0;
				for (let i = 0; i < a.length; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) c++;
				if (c) out.push(path + ': ' + c + ' of ' + a.length + ' items changed');
			}
			return;
		}
		if (ka === 'object') {
			if (d >= 3) {
				out.push(path + ': changed');
				return;
			}
			const keys = new Set(Object.keys(a).concat(Object.keys(b)));
			for (const k of keys) diffVal(a[k], b[k], path + '.' + k, out, d + 1);
			return;
		}
		if (ka === 'number') {
			const dl = b - a;
			out.push(path + ': ' + fmt(a) + ' → ' + fmt(b) + ' (' + (dl > 0 ? '+' : '') + fmt(dl) + ')');
			return;
		}
		out.push(path + ': ' + brief(a) + ' → ' + brief(b));
	}

	function short(raw) {
		return raw.length > 40 ? '(' + raw.length + ' chars)' : raw;
	}

	function describe(key, o, n) {
		if (SENS.test(key)) {
			return {
				msg: key + (o === null ? ' created' : n === null ? ' removed' : ' changed') + ' (redacted)',
				lines: [],
			};
		}
		if (o === null) return { msg: key + ' created ' + short(n), lines: [] };
		if (n === null) return { msg: key + ' removed', lines: [] };
		const num = /^-?\d+(\.\d+)?$/;
		if (num.test(o) && num.test(n)) {
			const a = +o;
			const b = +n;
			const dl = b - a;
			return {
				msg: key + ' ' + fmt(a) + ' → ' + fmt(b) + ' (' + (dl > 0 ? '+' : '') + fmt(dl) + ')',
				lines: [],
				num: [a, b],
			};
		}
		let pa;
		let pb;
		try {
			pa = JSON.parse(o);
			pb = JSON.parse(n);
		} catch (_) {
			return { msg: key + ' changed (' + o.length + ' → ' + n.length + ' chars)', lines: [] };
		}
		const out = [];
		diffVal(pa, pb, key, out, 0);
		if (!out.length) return { msg: key + ' rewritten', lines: [] };
		return { msg: out[0] + (out.length > 1 ? '  +' + (out.length - 1) + ' more' : ''), lines: out };
	}

	function milestone(a, b) {
		if (!(b > a)) return '';
		let hit = 0;
		for (let e = 2; e <= 15; e++) {
			for (const m of [1, 5]) {
				const t = m * Math.pow(10, e);
				if (a < t && b >= t) hit = t;
			}
		}
		return hit ? '≥ ' + fmt(hit) : '';
	}

	// The function name explains it.
	function addCommit(o) {
		const t = o.ts || Date.now();
		if (o.sig && o.coalesce) {
			const g = open.get(o.sig);
			if (g && g.c.seq >= base && t - g.c.ts2 < o.coalesce) {
				const c = g.c;
				c.n++;
				c.ts2 = t;
				c._v++;
				if (o.onMerge) o.onMerge(c, g);
				dirty.add(c.seq);
				if (ui) ui.touch(c);
				return c;
			}
		}
		laneOf(o.lane);
		const prev = lastInLane.get(o.lane);
		const c = {
			seq: seqNext++,
			ts: t,
			ts2: t,
			src: o.src || 'sys',
			lane: o.lane,
			kind: o.kind || 'change',
			msg: o.msg || '',
			lines: o.lines || [],
			n: 1,
			tag: o.tag || '',
			inc: [],
			parent: prev ? prev.sha : '',
			sha: '',
			_v: 0,
		};
		if (o.mergeFrom) {
			const m = touched[o.mergeFrom];
			c.inc = Array.from(m.values())
				.sort((a, b) => b - a)
				.slice(0, 12);
			m.clear();
		} else if (pending && t < pending.until && pending.left > 0 && pending.c.lane !== c.lane) {
			c.inc = [pending.c.seq];
			pending.left--;
		}
		c.sha = h7(c.seq + '|' + c.ts + '|' + c.lane + '|' + c.msg + '|' + c.parent);
		C.push(c);
		dirty.add(c.seq);
		lastInLane.set(c.lane, c);
		laneCount.set(c.lane, (laneCount.get(c.lane) || 0) + 1);
		for (const s of c.inc) E.push([s, c.seq]);
		if (c.kind === 'change' || c.kind === 'tag') {
			if (c.lane !== 'revisory') touched.rev.set(c.lane, c.seq);
			if (c.lane !== 'sync') touched.sync.set(c.lane, c.seq);
		}
		if (o.pendingMerge) pending = { c, until: t + 1500, left: 8 };
		if (o.sig && o.coalesce) open.set(o.sig, { c, k: o.keep });
		if (ui) ui.added(c);
		return c;
	}

	function ingestLS(key, raw, why) {
		const old = shadow.has(key) ? shadow.get(key) : null;
		if (old === raw) return;
		shadowBytes +=
			(raw == null ? 0 : raw.length + key.length) - (old == null ? 0 : old.length + key.length);
		if (raw == null) shadow.delete(key);
		else shadow.set(key, raw);
		hashDirty.add(key);
		const ns = nums('ls:', key, raw);
		for (const k in ns) pushSeries(k, ns[k]);
		const d = describe(key, old, raw);
		const tag = d.num ? milestone(d.num[0], d.num[1]) : '';
		const pre = why ? '[' + why + '] ' : '';
		addCommit({
			src: 'ls',
			lane: laneFor(key),
			kind: tag ? 'tag' : 'change',
			msg: pre + d.msg,
			lines: d.lines,
			tag,
			sig: 'ls:' + key,
			coalesce: 4000,
			keep: { firstOld: old },
			onMerge: (c, g) => {
				const dd = describe(key, g.k.firstOld, raw);
				c.msg = pre + dd.msg;
				c.lines = dd.lines;
				const tg = dd.num ? milestone(dd.num[0], dd.num[1]) : '';
				if (tg) {
					c.tag = tg;
					c.kind = 'tag';
				}
			},
		});
	}

	function wqAdd(k, w) {
		if (k == null) return;
		if (!wq.has(k)) wq.set(k, w || '');
		if (!wt) wt = setTimeout(drainWQ, 60);
	}

	function drainWQ() {
		wt = 0;
		if (!ready) {
			wt = setTimeout(drainWQ, 250);
			return;
		}
		const items = Array.from(wq);
		wq.clear();
		for (const [k, w] of items) {
			try {
				ingestLS(k, rawGet.call(LSO, k), w);
			} catch (e) {
				nativeErr('[chronicle]', e);
			}
		}
	}

	function pollLS() {
		const seen = new Set();
		for (let i = 0; i < LSO.length; i++) {
			const k = LSO.key(i);
			if (k === null) continue;
			seen.add(k);
			if (shadow.get(k) !== rawGet.call(LSO, k)) wqAdd(k, 'direct');
		}
		for (const k of shadow.keys()) if (!seen.has(k)) wqAdd(k, 'direct');
	}

	function snapSig(v) {
		const t = typeof v;
		if (t === 'number') return 'n:' + v;
		if (t === 'boolean') return 'b:' + v;
		if (t === 'string') return 's:' + v.slice(0, 120);
		if (v === null || v === undefined || t === 'function' || t === 'symbol') return null;
		if (v instanceof Map || v instanceof Set) return 'm:' + v.size;
		if (Array.isArray(v)) return 'a:' + v.length;
		if (t === 'object') {
			const pr = Object.getPrototypeOf(v);
			if (pr !== Object.prototype && pr !== null) return null;
			const ks = Object.keys(v);
			if (ks.length > 40) return null;
			for (const k of ks) if (typeof v[k] === 'function') return null;
			try {
				const s = JSON.stringify(v);
				if (s && s.length <= 3000) return 'j:' + s;
				return 'o:' + ks.length;
			} catch (_) {
				return null;
			}
		}
		return null;
	}

	function varSeries(n, sig) {
		const k = sig[0];
		const raw = sig.slice(2);
		if (k === 'n') pushSeries('var:' + n, Number(raw));
		else if (k === 'm') pushSeries('var:' + n + '.size', Number(raw));
		else if (k === 'a') pushSeries('var:' + n + '[]', Number(raw));
		else if (k === 'j') {
			const o = nums('var:', n, raw);
			for (const x in o) pushSeries(x, o[x]);
		}
	}

	function varDescribe(n, old, nw) {
		if (SENS.test(n)) return { msg: 'var ' + n + ' changed (redacted)', lines: [] };
		const k = nw[0];
		const a = old.slice(2);
		const b = nw.slice(2);
		let r;
		if (old[0] !== k) r = { msg: n + ' changed type', lines: [] };
		else if (k === 'n' || k === 'j') r = describe(n, a, b);
		else if (k === 'm') r = { msg: n + '.size ' + a + ' → ' + b, lines: [] };
		else if (k === 'a') r = { msg: n + '.length ' + a + ' → ' + b, lines: [] };
		else if (k === 'b') r = { msg: n + ' ' + a + ' → ' + b, lines: [] };
		else if (k === 's')
			r = {
				msg: n + ' ' + JSON.stringify(a.slice(0, 30)) + ' → ' + JSON.stringify(b.slice(0, 30)),
				lines: [],
			};
		else r = { msg: n + ' changed', lines: [] };
		return { msg: 'var ' + r.msg, lines: r.lines || [] };
	}

	function readVar(n) {
		if (userGlobals.has(n)) return window[n];
		let g = getters.get(n);
		if (!g) {
			g = new Function('try{return ' + n + '}catch(e){return undefined}');
			getters.set(n, g);
		}
		return g();
	}

	function probeAll() {
		if (SAFE || document.hidden) return;
		const t = Date.now();
		for (const n of Array.from(userGlobals).concat(Array.from(lexNames))) {
			if (ignored.has(n)) continue;
			let p = probes.get(n);
			if (p && p.noisy && t - p.poll < 15000) continue;
			let v;
			try {
				v = readVar(n);
			} catch (_) {
				continue;
			}
			const t0 = performance.now();
			const sig = snapSig(v);
			if (performance.now() - t0 > 4) {
				ignored.add(n);
				continue;
			}
			if (sig === null) continue;
			if (!p) {
				p = { sig, ch: [], poll: t, noisy: false, lc: 0 };
				probes.set(n, p);
				varSeries(n, sig);
				continue;
			}
			p.poll = t;
			if (sig === p.sig) {
				if (p.noisy && t - p.lc > 60000) p.noisy = false;
				continue;
			}
			const old = p.sig;
			p.sig = sig;
			p.lc = t;
			p.ch.push(t);
			while (p.ch.length && t - p.ch[0] > 10000) p.ch.shift();
			if (p.ch.length > 8) p.noisy = true;
			varSeries(n, sig);
			const d = varDescribe(n, old, sig);
			addCommit({
				src: 'var',
				lane: laneFor(n, 'runtime'),
				kind: 'change',
				msg: d.msg,
				lines: d.lines,
				sig: 'var:' + n,
				coalesce: p.noisy ? 15000 : 3000,
				keep: { firstOld: old },
				onMerge: (c, g) => {
					const dd = varDescribe(n, g.k.firstOld, sig);
					c.msg = dd.msg;
					c.lines = dd.lines;
				},
			});
		}
	}

	function baselineNames() {
		try {
			const f = document.createElement('iframe');
			f.style.display = 'none';
			document.documentElement.appendChild(f);
			const s = new Set(Object.getOwnPropertyNames(f.contentWindow));
			f.remove();
			return s;
		} catch (_) {
			return new Set();
		}
	}

	function resBrief(r) {
		const k = kindOf(r);
		if (k === 'string') return JSON.stringify(r.length > 30 ? r.slice(0, 30) + '…' : r);
		if (k === 'number' || k === 'boolean') return String(r);
		if (k === 'array') return '[' + r.length + ']';
		if (k === 'object') {
			if (r.rarity && r.rarity.name) return String(r.rarity.name);
			if (typeof r.name === 'string') return r.name;
			if (typeof r.ok === 'boolean') return r.ok ? 'ok' : 'fail';
			if (typeof r.applied === 'boolean') return r.applied ? 'applied' : 'held';
			return '{' + Object.keys(r).length + '}';
		}
		return k;
	}

	function logCall(label, args, res, ok, ms, cnt) {
		defer(() => {
			let a = '';
			const sens = SENS.test(label);
			if (args.length && !sens) {
				const x = args[0];
				if (
					typeof x === 'number' ||
					typeof x === 'boolean' ||
					(typeof x === 'string' && x.length <= 24 && !SENS.test(x))
				)
					a = String(x);
			}
			const mk = () =>
				ok
					? label +
						'(' +
						a +
						')' +
						(res !== undefined && !sens ? ' → ' + resBrief(res) : '') +
						(ms >= 20 ? ' ' + Math.round(ms) + 'ms' : '')
					: label + ' threw: ' + String((res && res.message) || res).slice(0, 80);
			const merge = /rollback|restore|import|ingest|resolve|merge|reconcile|accept|force/i.test(
				label
			);
			addCommit({
				src: 'fn',
				lane: laneFor(label, 'calls'),
				kind: ok ? 'call' : 'error',
				msg: mk(),
				sig: 'fn:' + label + ok,
				coalesce: cnt > 60 ? 120000 : 30000,
				pendingMerge: merge && ok,
				onMerge: (c) => {
					c.msg = mk();
				},
			});
		});
	}

	function wrapFn(owner, prop, label) {
		let fn;
		try {
			fn = owner[prop];
		} catch (_) {
			return;
		}
		if (typeof fn !== 'function' || wrapped.has(fn)) return;
		const d = Object.getOwnPropertyDescriptor(owner, prop);
		if (d && (d.get || d.writable === false)) return;
		let cnt = 0;
		let w0 = 0;
		const px = new Proxy(fn, {
			apply(t, th, args) {
				const t0 = performance.now();
				if (t0 - w0 > 5000) {
					w0 = t0;
					cnt = 0;
				}
				cnt++;
				let r;
				try {
					r = Reflect.apply(t, th, args);
				} catch (e) {
					logCall(label, args, e, false, performance.now() - t0, cnt);
					throw e;
				}
				if (r && typeof r.then === 'function') {
					r.then(
						(v) => logCall(label, args, v, true, performance.now() - t0, cnt),
						(e) => logCall(label, args, e, false, performance.now() - t0, cnt)
					);
				} else logCall(label, args, r, true, performance.now() - t0, cnt);
				return r;
			},
		});
		try {
			owner[prop] = px;
		} catch (_) {
			return;
		}
		if (owner[prop] === px) {
			wrapped.add(px);
			fnCount++;
		}
	}

	function wrapAll() {
		if (SAFE) return;
		for (const n of userGlobals) {
			let v;
			try {
				v = window[n];
			} catch (_) {
				continue;
			}
			if (typeof v === 'function') {
				if (!NOWRAP_FN.test(n)) wrapFn(window, n, n);
			} else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
				let ks;
				try {
					ks = Object.keys(v);
				} catch (_) {
					continue;
				}
				for (const k of ks) {
					try {
						if (typeof v[k] === 'function' && !NOWRAP_M.test(k)) wrapFn(v, k, n + '.' + k);
					} catch (_) {}
				}
			}
		}
	}

	function scanGlobals() {
		if (!baseNames) baseNames = baselineNames();
		for (const n of Object.getOwnPropertyNames(window)) {
			if (baseNames.has(n) || SKIPG.test(n) || IGN_VAR.test(n) || userGlobals.has(n)) continue;
			userGlobals.add(n);
		}
		wrapAll();
	}

	async function scanSources() {
		if (SAFE || !nativeFetch) return;
		scriptCount = document.scripts.length;
		const texts = [];
		for (const s of Array.from(document.scripts)) {
			if (s.src) {
				try {
					const u = new URL(s.src, location.href);
					if (u.origin !== location.origin) continue;
					const r = await nativeFetch(u.href, { cache: 'force-cache' });
					if (r.ok) texts.push(await r.text());
				} catch (_) {}
			} else if (s.textContent) texts.push(s.textContent);
		}
		const re = /^[ \t]*(?:let|const|var)[ \t]+([A-Za-z_$][\w$]*)/gm;
		for (const t of texts) {
			let m;
			while ((m = re.exec(t))) {
				const n = m[1];
				if (
					userGlobals.has(n) ||
					lexNames.has(n) ||
					ignored.has(n) ||
					SKIPG.test(n) ||
					IGN_VAR.test(n)
				)
					continue;
				try {
					const ty = new Function('try{return typeof ' + n + '}catch(e){return "undefined"}')();
					if (ty !== 'undefined' && ty !== 'function') lexNames.add(n);
				} catch (_) {}
			}
		}
	}

	function netRecord(method, rawUrl, status, ms) {
		defer(() => {
			let u;
			try {
				u = new URL(rawUrl, location.href);
			} catch (_) {
				return;
			}
			const path = u.pathname
				.split('/')
				.map((s) => (/^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s) ? ':id' : s))
				.join('/');
			const host = u.host;
			const lane = /accounts\./.test(host)
				? 'account'
				: /backup\./.test(host)
					? 'sync'
					: /github/.test(host)
						? 'github'
						: 'net';
			const bad = status === 'ERR' || status >= 400;
			const good = status >= 200 && status < 300;
			const push = lane === 'sync' && method === 'PUT' && good;
			pushSeries('sys.net', ++netCount);
			if (bad) pushSeries('sys.net.err', ++netErr);
			const mk = () => method + ' ' + host + path + ' → ' + status + ' ' + Math.round(ms) + 'ms';
			addCommit({
				src: 'net',
				lane,
				kind: bad ? 'error' : push ? 'merge' : 'net',
				msg: mk(),
				sig: 'net:' + method + host + path + status,
				coalesce: push ? 5000 : 90000,
				mergeFrom: push ? 'sync' : '',
				onMerge: (c) => {
					c.msg = mk();
				},
			});
		});
	}

	function revisionCommit(v) {
		const m = v.meta || {};
		const ds = v.diffSummary || {};
		if (typeof m.keyCount === 'number') pushSeries('rev.keys', m.keyCount);
		if (typeof m.byteSize === 'number') pushSeries('rev.kb', Math.round(m.byteSize / 102.4) / 10);
		addCommit({
			src: 'idb',
			lane: 'revisory',
			kind: 'merge',
			msg:
				'revision ' +
				String(v.id || '').slice(-8) +
				' (' +
				(v.trigger || '?') +
				') ' +
				(m.keyCount || '?') +
				' keys',
			lines: [
				'id ' + v.id,
				'parent ' + v.parentId,
				'changed keys ' + ds.changedKeyCount,
				'size ' + fmt(m.byteSize || 0) + ' b',
			],
			mergeFrom: 'rev',
		});
	}

	function recIDB(store, m, args) {
		const dbn = store.transaction.db.name;
		if (dbn === DB_NAME) return;
		const sn = store.name;
		if (dbn === 'revisory_v1' && sn === 'revisions' && m === 'put') {
			const v = args[0] || {};
			defer(() => revisionCommit(v));
			return;
		}
		if (dbn === 'revisory_v1' && sn === 'quarantine' && m === 'put') {
			const v = args[0] || {};
			defer(() =>
				addCommit({
					src: 'idb',
					lane: 'revisory',
					kind: 'warn',
					msg:
						'quarantine ' +
						(v.classification || '') +
						(v.resolved ? ' (' + v.resolution + ')' : ''),
					lines: (v.reasons || []).map(String),
					sig: 'q:' + v.id + v.resolved,
					coalesce: 1000,
				})
			);
			return;
		}
		let key = '';
		try {
			if (m === 'put' || m === 'add') {
				const v = args[0];
				key =
					args[1] !== undefined
						? String(args[1])
						: store.keyPath && v && typeof v === 'object'
							? String(v[store.keyPath])
							: '';
			} else if (m === 'delete')
				key = args[0] && args[0].lower !== undefined ? 'range' : String(args[0]);
		} catch (_) {}
		const lane = laneFor(dbn + '/' + sn, 'storage');
		defer(() =>
			addCommit({
				src: 'idb',
				lane,
				kind: 'event',
				msg: dbn + '/' + sn + ' ' + m + (key ? ' ' + key.slice(0, 40) : ''),
				sig: 'idb:' + dbn + sn + m,
				coalesce: 8000,
			})
		);
	}

	function evBrief(e) {
		const d = e.detail;
		if (e.type === 'syncstatus' && d && d.status) return d.status;
		if (d === null || d === undefined) return '';
		if (typeof d === 'object') {
			try {
				return JSON.stringify(d).slice(0, 80);
			} catch (_) {
				return '';
			}
		}
		return String(d).slice(0, 80);
	}

	function installHooks() {
		const pSet = SP.setItem;
		const pRem = SP.removeItem;
		const pClr = SP.clear;
		SP.setItem = function (k) {
			const r = pSet.apply(this, arguments);
			if (this === LSO) wqAdd(String(k), '');
			return r;
		};
		SP.removeItem = function (k) {
			const r = pRem.apply(this, arguments);
			if (this === LSO) wqAdd(String(k), '');
			return r;
		};
		SP.clear = function () {
			const keys = [];
			if (this === LSO) for (let i = 0; i < LSO.length; i++) keys.push(LSO.key(i));
			const r = pClr.apply(this, arguments);
			keys.forEach((k) => wqAdd(k, ''));
			return r;
		};
		window.addEventListener('storage', (e) => {
			if (e.storageArea !== LSO) return;
			if (e.key == null) {
				Array.from(shadow.keys()).forEach((k) => wqAdd(k, 'other tab'));
				for (let i = 0; i < LSO.length; i++) wqAdd(LSO.key(i), 'other tab');
			} else wqAdd(e.key, 'other tab');
		});

		if (window.fetch) {
			const pf = window.fetch;
			window.fetch = function (input, init) {
				const url = typeof input === 'string' ? input : (input && input.url) || String(input);
				const method = String(
					(init && init.method) || (input && input.method) || 'GET'
				).toUpperCase();
				const t0 = performance.now();
				const p = pf.apply(this, arguments);
				try {
					p.then(
						(res) => netRecord(method, url, res.status, performance.now() - t0),
						() => netRecord(method, url, 'ERR', performance.now() - t0)
					);
				} catch (_) {}
				return p;
			};
		}

		if (window.XMLHttpRequest) {
			const xo = XMLHttpRequest.prototype.open;
			const xs = XMLHttpRequest.prototype.send;
			XMLHttpRequest.prototype.open = function (m, u) {
				this.__cx = [String(m).toUpperCase(), String(u)];
				return xo.apply(this, arguments);
			};
			XMLHttpRequest.prototype.send = function () {
				const t0 = performance.now();
				const x = this;
				if (x.__cx) {
					x.addEventListener('loadend', () => {
						try {
							netRecord(x.__cx[0], x.__cx[1], x.status || 'ERR', performance.now() - t0);
						} catch (_) {}
					});
				}
				return xs.apply(this, arguments);
			};
		}

		if (window.IDBObjectStore) {
			['put', 'add', 'delete', 'clear'].forEach((m) => {
				const o = IDBObjectStore.prototype[m];
				IDBObjectStore.prototype[m] = function () {
					try {
						recIDB(this, m, arguments);
					} catch (_) {}
					return o.apply(this, arguments);
				};
			});
		}

		const od = EventTarget.prototype.dispatchEvent;
		EventTarget.prototype.dispatchEvent = function (e) {
			try {
				if (typeof CustomEvent !== 'undefined' && e instanceof CustomEvent) {
					const b = evBrief(e);
					const t = e.type;
					defer(() => {
						if (SENS.test(t)) return;
						const mk = () => 'event ' + t + (b ? ' ' + b : '');
						addCommit({
							src: 'event',
							lane: laneFor(t, 'events'),
							kind: 'event',
							msg: mk(),
							sig: 'ev:' + t + (t === 'syncstatus' ? b : ''),
							coalesce: 3000,
							onMerge: (c) => {
								c.msg = mk();
							},
						});
					});
				}
			} catch (_) {}
			return od.call(this, e);
		};

		['error', 'warn'].forEach((m) => {
			const o = console[m];
			console[m] = function () {
				try {
					const txt = Array.from(arguments)
						.map((a) => {
							if (typeof a === 'string') return a;
							if (a && a.message) return a.message;
							try {
								return JSON.stringify(a);
							} catch (_) {
								return String(a);
							}
						})
						.join(' ')
						.slice(0, 160);
					defer(() =>
						addCommit({
							src: 'error',
							lane: m === 'error' ? 'errors' : 'console',
							kind: m === 'error' ? 'error' : 'warn',
							msg: SENS.test(txt) ? 'console.' + m + ' (redacted)' : txt,
							sig: 'con:' + m + txt.slice(0, 60),
							coalesce: 5000,
						})
					);
				} catch (_) {}
				return o.apply(this, arguments);
			};
		});

		window.addEventListener('error', (e) =>
			defer(() =>
				addCommit({
					src: 'error',
					lane: 'errors',
					kind: 'error',
					msg:
						(e.message || 'error') +
						(e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : ''),
					sig: 'err:' + e.message,
					coalesce: 30000,
				})
			)
		);
		window.addEventListener('unhandledrejection', (e) =>
			defer(() =>
				addCommit({
					src: 'error',
					lane: 'errors',
					kind: 'error',
					msg:
						'unhandled rejection: ' +
						String((e.reason && e.reason.message) || e.reason).slice(0, 120),
					sig: 'rej:' + String((e.reason && e.reason.message) || e.reason).slice(0, 40),
					coalesce: 30000,
				})
			)
		);

		document.addEventListener('visibilitychange', () => {
			defer(() =>
				addCommit({
					src: 'sys',
					lane: 'session',
					kind: 'event',
					msg: document.hidden ? 'tab hidden' : 'tab visible',
				})
			);
			if (document.hidden) flush();
		});
		window.addEventListener('online', () =>
			defer(() => addCommit({ src: 'sys', lane: 'session', kind: 'event', msg: 'network online' }))
		);
		window.addEventListener('offline', () =>
			defer(() => addCommit({ src: 'sys', lane: 'session', kind: 'warn', msg: 'network offline' }))
		);
		window.addEventListener('pagehide', () => flush());
	}

	function openDB() {
		return new Promise((resolve) => {
			if (!window.indexedDB) return resolve(null);
			let req;
			try {
				req = indexedDB.open(DB_NAME, 1);
			} catch (_) {
				return resolve(null);
			}
			req.onupgradeneeded = (e) => {
				const d = e.target.result;
				d.createObjectStore('commits', { keyPath: 'seq' });
				d.createObjectStore('series', { keyPath: 'name' });
				d.createObjectStore('meta', { keyPath: 'key' });
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = () => resolve(null);
			req.onblocked = () => resolve(null);
		});
	}

	function loadAll(store) {
		return new Promise((res) => {
			const out = [];
			try {
				const r = db.transaction(store).objectStore(store).openCursor();
				r.onsuccess = (e) => {
					const c = e.target.result;
					if (c) {
						out.push(c.value);
						c.continue();
					} else res(out);
				};
				r.onerror = () => res(out);
			} catch (_) {
				res(out);
			}
		});
	}

	function idb(stores, mode, fn) {
		return new Promise((res) => {
			try {
				const tx = db.transaction(stores, mode);
				fn(tx);
				tx.oncomplete = () => res(true);
				tx.onerror = tx.onabort = () => res(false);
			} catch (_) {
				res(false);
			}
		});
	}

	function prune() {
		const cut = base + PRUNE_BATCH;
		C.splice(0, PRUNE_BATCH);
		base = cut;
		for (let i = E.length - 1; i >= 0; i--) if (E[i][0] < base) E.splice(i, 1);
		laneCount.clear();
		for (const c of C) laneCount.set(c.lane, (laneCount.get(c.lane) || 0) + 1);
		if (db)
			idb(['commits'], 'readwrite', (tx) =>
				tx.objectStore('commits').delete(IDBKeyRange.upperBound(cut - 1))
			);
		if (ui) ui.dirtyView();
	}

	async function flush() {
		if (!db || !ready) return;
		for (const k of hashDirty) {
			if (shadow.has(k)) hashes[k] = h7(shadow.get(k));
			else delete hashes[k];
			metaDirty = true;
		}
		hashDirty.clear();
		const cs = Array.from(dirty)
			.map((s) => C[s - base])
			.filter(Boolean)
			.map(strip);
		dirty.clear();
		const ss = Array.from(dirtySeries)
			.filter((n) => series.has(n))
			.map((n) => ({ name: n, pts: series.get(n) }));
		dirtySeries.clear();
		const ms = metaDirty
			? [
					{ key: 'lanes', v: lanes },
					{ key: 'known', v: Array.from(known) },
					{ key: 'hashes', v: hashes },
					{ key: 'sessions', v: sessionNo },
				]
			: [];
		metaDirty = false;
		if (!cs.length && !ss.length && !ms.length) return;
		await idb(['commits', 'series', 'meta'], 'readwrite', (tx) => {
			const a = tx.objectStore('commits');
			const b = tx.objectStore('series');
			const c = tx.objectStore('meta');
			cs.forEach((x) => a.put(x));
			ss.forEach((x) => b.put(x));
			ms.forEach((x) => c.put(x));
		});
		if (C.length > MAX_COMMITS + PRUNE_BATCH) prune();
	}

	function readRevisory() {
		return new Promise((res) => {
			const out = [];
			if (!indexedDB.databases) return res(out);
			indexedDB
				.databases()
				.then((list) => {
					if (!list.some((d) => d.name === 'revisory_v1')) return res(out);
					const req = indexedDB.open('revisory_v1');
					req.onerror = () => res(out);
					req.onsuccess = (e) => {
						const d = e.target.result;
						if (!d.objectStoreNames.contains('revisions')) {
							d.close();
							return res(out);
						}
						try {
							const cur = d
								.transaction('revisions')
								.objectStore('revisions')
								.index('ts')
								.openCursor(null, 'prev');
							cur.onsuccess = (ev) => {
								const c = ev.target.result;
								if (c && out.length < 200) {
									const r = c.value;
									const n = {};
									const snap = r.snapshot || {};
									for (const k in snap)
										if (typeof snap[k] === 'string' && snap[k].length <= 200000)
											nums('ls:', k, snap[k], n);
									out.push({
										ts: r.ts,
										id: r.id,
										trigger: r.trigger,
										keys: r.meta && r.meta.keyCount,
										bytes: r.meta && r.meta.byteSize,
										nums: n,
									});
									c.continue();
								} else {
									d.close();
									res(out);
								}
							};
							cur.onerror = () => {
								d.close();
								res(out);
							};
						} catch (_) {
							d.close();
							res(out);
						}
					};
				})
				.catch(() => res(out));
		});
	}

	async function backfill() {
		const items = [];
		try {
			const raw = rawGet.call(LSO, 'rarityTimestamps');
			const arr = raw ? JSON.parse(raw) : [];
			if (Array.isArray(arr)) {
				arr
					.filter((x) => Array.isArray(x) && typeof x[1] === 'number')
					.sort((a, b) => b[1] - a[1])
					.slice(0, 250)
					.forEach(([name, ts]) =>
						items.push({
							ts,
							lane: 'rolls',
							kind: 'tag',
							src: 'sys',
							msg: 'last rolled ' + name,
							tag: 'restored',
						})
					);
			}
		} catch (_) {}
		let revs = [];
		try {
			revs = (await readRevisory()).reverse();
		} catch (_) {}
		for (const r of revs) {
			for (const k in r.nums) pushSeries(k, r.nums[k], r.ts);
			if (typeof r.keys === 'number') pushSeries('rev.keys', r.keys, r.ts);
			items.push({
				ts: r.ts,
				lane: 'revisory',
				kind: 'merge',
				src: 'idb',
				msg:
					'revision ' +
					String(r.id || '').slice(-8) +
					' (' +
					(r.trigger || '?') +
					') ' +
					(r.keys || '?') +
					' keys',
				lines: ['restored from revisory history'],
				tag: 'restored',
			});
		}
		items.sort((a, b) => a.ts - b.ts);
		items.forEach((o) => addCommit(o));
	}

	async function boot() {
		db = await openDB();
		let firstRun = true;
		let m = {};
		if (db) {
			const [cs, ss, ms] = await Promise.all([
				loadAll('commits'),
				loadAll('series'),
				loadAll('meta'),
			]);
			cs.sort((a, b) => a.seq - b.seq);
			ms.forEach((x) => (m[x.key] = x.v));
			let okc = true;
			for (let i = 1; i < cs.length; i++) {
				if (cs[i].seq !== cs[0].seq + i) {
					okc = false;
					break;
				}
			}
			(m.lanes || []).forEach(laneOf);
			if (okc) {
				for (const c of cs) C.push(c);
				base = C.length ? C[0].seq : 0;
				seqNext = C.length ? C[C.length - 1].seq + 1 : 0;
			} else {
				seqNext = cs.length ? cs[cs.length - 1].seq + 1 : 0;
				base = seqNext;
				idb(['commits'], 'readwrite', (tx) => tx.objectStore('commits').clear());
			}
			for (const c of C) {
				c._v = 0;
				c.inc = c.inc || [];
				c.lines = c.lines || [];
				laneOf(c.lane);
				lastInLane.set(c.lane, c);
				laneCount.set(c.lane, (laneCount.get(c.lane) || 0) + 1);
				for (const s of c.inc) E.push([s, c.seq]);
			}
			ss.forEach((s) => series.set(s.name, s.pts));
			sessionNo = (m.sessions || 0) + 1;
			known = new Set(m.known || []);
			hashes = m.hashes || {};
			firstRun = !C.length && !ss.length;
		}
		if (firstRun) await backfill();

		if (!firstRun) {
			const away = new Map();
			for (const [k, v] of shadow)
				if (hashes[k] !== undefined && hashes[k] !== h7(v)) away.set(k, 'changed while away');
			for (const k in hashes) if (!shadow.has(k)) away.set(k, 'removed while away');
			for (const [k, w] of away)
				addCommit({ src: 'ls', lane: laneFor(k), kind: 'change', msg: k + ' ' + w });
		}
		const fresh = new Map();
		for (const k of shadow.keys())
			if (!known.has(k)) fresh.set(laneFor(k), (fresh.get(laneFor(k)) || []).concat(k));
		for (const [lane, ks] of fresh) {
			addCommit({
				src: 'sys',
				lane,
				kind: 'tag',
				tag: 'tracking',
				msg:
					'tracking ' +
					ks.length +
					' key' +
					(ks.length > 1 ? 's' : '') +
					': ' +
					ks.slice(0, 4).join(', ') +
					(ks.length > 4 ? '…' : ''),
				lines: ks,
			});
		}
		known = new Set(shadow.keys());
		for (const [k, v] of shadow) {
			const o = nums('ls:', k, v);
			for (const x in o) pushSeries(x, o[x]);
		}
		const gap = C.length ? Date.now() - C[C.length - 1].ts2 : 0;
		const inc = Array.from(lastInLane.values())
			.map((c) => c.seq)
			.sort((a, b) => b - a)
			.slice(0, 12);
		const sc = addCommit({
			src: 'sys',
			lane: 'session',
			kind: 'merge',
			tag: 'session ' + sessionNo,
			msg:
				'session ' +
				sessionNo +
				' started · ' +
				shadow.size +
				' keys · ' +
				(shadowBytes / 1024).toFixed(1) +
				' kb',
			lines:
				gap > 0
					? ['previous activity ' + Math.round(gap / 1000) + 's before this load']
					: ['first load'],
		});
		sc.inc = inc;
		for (const s of inc) E.push([s, sc.seq]);
		metaDirty = true;
		ready = true;
		for (const fn of pendingOps.splice(0)) {
			try {
				fn();
			} catch (e) {
				nativeErr('[chronicle]', e);
			}
		}

		setInterval(flush, 3000);
		setInterval(pollLS, 2500);
		setInterval(probeAll, 1000);
		setInterval(() => {
			const t = Date.now();
			pushSeries('sys.ls.kb', Math.round(shadowBytes / 102.4) / 10);
			pushSeries('sys.ls.keys', shadow.size);
			pushSeries('sys.commits', seqNext);
			if (performance.memory)
				pushSeries('sys.heap.mb', Math.round(performance.memory.usedJSHeapSize / 104857.6) / 10);
			for (const [k, g] of open) if (t - g.c.ts2 > 120000) open.delete(k);
		}, 5000);
		const startScan = async () => {
			scanGlobals();
			await scanSources();
		};
		if (document.readyState === 'complete') setTimeout(startScan, 800);
		else window.addEventListener('load', () => setTimeout(startScan, 800));
		setInterval(() => {
			scanGlobals();
			if (document.scripts.length !== scriptCount) scanSources();
		}, 4000);
	}

	function makeUI() {
		let root,
			scroll,
			stage,
			cv,
			ctx,
			rowsEl,
			spacer,
			legEl,
			subEl,
			qEl,
			atEl,
			cardsEl,
			chartsEl,
			barsEl,
			detEl,
			addEl;
		let isOpen = false;
		let built = false;
		let closeTok = 0;
		let raf = 0;
		let twRaf = 0;
		let V = [];
		let laneV = new Map();
		let LV = [];
		let laneX = new Map();
		let query = '';
		let sel = null;
		let focusSeq = null;
		let focusY = 0;
		let padTopPx = 0;
		let spx = 12;
		let viewDirty = true;
		let qTimer = 0;
		let revealT0 = 0;
		let sideTimer = 0;
		let cardKey = '';
		let curT = null;
		let optCount = -1;
		let charts = [];
		const hiddenL = new Set();
		const hiddenS = new Set();
		const rowEls = new Map();
		const cards = new Map();
		const bars = new Map();

		const mk = (tag, cls) => {
			const e = document.createElement(tag);
			if (cls) e.className = cls;
			return e;
		};

		function injectStyle() {
			if (document.getElementById('cx-style')) return;
			const s = mk('style');
			s.id = 'cx-style';
			s.textContent = `
#cx{position:fixed;inset:0;z-index:2147483000;background:#000;color:#d6d6d6;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;display:none;opacity:0;transition:opacity .6s ease;flex-direction:column;overscroll-behavior:contain;user-select:none;-webkit-user-select:none}
#cx.show{display:flex}
#cx.on{opacity:1}
#cx *{box-sizing:border-box}
#cx button.cxb{background:transparent;border:1px solid #2a2a2a;color:#cfcfcf;padding:3px 9px;border-radius:2px;font:inherit;animation:none!important;text-transform:lowercase}
#cx button.cxb:hover:not(:disabled){background:#111;animation:none!important}
#cx-top{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #161616;flex-wrap:wrap}
#cx-top .ttl{letter-spacing:.16em}
#cx-top .sub{opacity:.4;font-size:11px}
#cx-top .sp{flex:1}
#cx-q{background:#0a0a0a;border:1px solid #222;color:#ddd;padding:4px 8px;border-radius:2px;font:inherit;min-width:140px;max-width:240px;flex:1;user-select:text;-webkit-user-select:text}
#cx-sidebtn{display:none}
#cx-leg{display:flex;gap:6px;padding:8px 14px;overflow-x:auto;border-bottom:1px solid #161616;white-space:nowrap;scrollbar-width:none}
#cx-leg::-webkit-scrollbar{display:none}
.cx-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #222;border-radius:20px;padding:1px 9px;cursor:pointer;flex-shrink:0;font-size:11px}
.cx-chip.off{opacity:.3;text-decoration:line-through}
.cx-chip i{width:8px;height:8px;border-radius:50%;display:inline-block}
.cx-chip em{font-style:normal;opacity:.4}
.cx-chip.src{border-style:dashed}
.cx-sep{width:1px;background:#222;flex-shrink:0;margin:0 4px}
#cx-main{flex:1;display:flex;min-height:0;position:relative}
#cx-scroll{flex:1;overflow-y:auto;position:relative;min-width:0;scrollbar-width:thin;scrollbar-color:#222 #000;outline:none;overscroll-behavior:contain}
#cx-stage{position:sticky;top:0;overflow:hidden}
#cx-cv{position:absolute;left:0;top:0;pointer-events:none}
#cx-rows{position:absolute;inset:0}
.cx-row{position:absolute;left:0;right:0;top:0;height:28px;display:flex;align-items:center;gap:10px;white-space:nowrap;padding:0 14px 0 calc(var(--gw,40px) + 8px);cursor:pointer;will-change:transform,opacity}
.cx-row .t{opacity:.35;width:100px;flex-shrink:0;font-size:11px}
.cx-row .s{opacity:.5;width:58px;flex-shrink:0;font-size:11px}
.cx-row .p{width:92px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;font-size:11px}
.cx-row .m{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.cx-row .g{border:1px solid #6a5a2a;color:#ffd37a;border-radius:3px;padding:0 6px;font-size:10px;flex-shrink:0}
.cx-row[data-k=error] .m{color:#ff8f8f}
.cx-row[data-k=warn] .m{color:#ffd37a}
.cx-row[data-k=merge] .m{color:#fff}
.cx-row[data-k=call] .m,.cx-row[data-k=event] .m,.cx-row[data-k=net] .m{opacity:.6}
.cx-row.f{background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,0) 70%)}
.cx-row.sel{box-shadow:inset 2px 0 #fff}
#cx-side{width:340px;border-left:1px solid #161616;overflow-y:auto;padding:12px 14px;flex-shrink:0;scrollbar-width:thin;scrollbar-color:#222 #000;overscroll-behavior:contain}
.cx-sec{margin-bottom:16px}
.cx-h{font-size:10px;letter-spacing:.12em;opacity:.45;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;text-transform:lowercase}
.cx-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cx-card{border:1px solid #1c1c1c;border-radius:3px;padding:6px 8px;background:#050505;min-width:0}
.cx-card b{display:block;font-size:15px;font-weight:normal}
.cx-card span{font-size:10px;opacity:.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.cx-chart{margin-bottom:10px}
.cx-chart .hd{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-bottom:2px;gap:6px}
.cx-chart .hd span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-chart .hd u{text-decoration:none;cursor:pointer;opacity:.6}
.cx-chart canvas{width:100%;height:56px;display:block;border:1px solid #131313;border-radius:2px}
.cx-bar{display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:3px}
.cx-bar .nm{width:82px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-bar .tr{flex:1;height:5px;background:#0d0d0d;border-radius:3px;overflow:hidden}
.cx-bar .fl{height:100%;transition:width .35s ease;width:0}
.cx-bar .ct{width:38px;text-align:right;opacity:.5}
#cx-det{font-size:11px;white-space:pre-wrap;word-break:break-word;opacity:.85;user-select:text;-webkit-user-select:text}
select.cxs{background:#0a0a0a;color:#bbb;border:1px solid #222;font:inherit;font-size:10px;max-width:150px;padding:1px 4px}
@media (max-width:760px){
#cx-sidebtn{display:inline-block}
#cx-side{position:absolute;left:0;right:0;bottom:0;width:auto;height:58%;background:#000;border-top:1px solid #222;border-left:0;display:none;z-index:3}
#cx.side #cx-side{display:block}
.cx-row .s,.cx-row .t{display:none}
.cx-row .p{width:70px}
}`; // We should just move this to overrides.css but the file is getting too big.. maybe consider splitting overrides.css into other css files so it isnt all put into 1 file, but we should probably just inject the css anyways: it doesnt hurt much.
			document.head.appendChild(s);
		}

		function build() {
			injectStyle();
			root = mk('div');
			root.id = 'cx';
			root.innerHTML =
				'<div id="cx-top"><span class="ttl">chronicle</span><span class="sub" id="cx-sub"></span><input id="cx-q" placeholder="search commits..." spellcheck="false" autocomplete="off"><span class="sp"></span><button class="cxb" id="cx-now">now</button><button class="cxb" id="cx-sidebtn">stats</button><button class="cxb" id="cx-exp">export</button><button class="cxb" id="cx-clr">clear</button><button class="cxb" id="cx-x">close</button></div>' +
				'<div id="cx-leg"></div>' +
				'<div id="cx-main"><div id="cx-scroll" tabindex="-1"><div id="cx-stage"><canvas id="cx-cv"></canvas><div id="cx-rows"></div></div><div id="cx-spacer"></div></div>' +
				'<div id="cx-side"><div class="cx-sec"><div class="cx-h"><span id="cx-at"></span></div><div class="cx-cards" id="cx-cards"></div></div>' +
				'<div class="cx-sec"><div class="cx-h"><span>charts</span><select class="cxs" id="cx-add"></select></div><div id="cx-charts"></div></div>' +
				'<div class="cx-sec"><div class="cx-h"><span>lanes up to this point</span></div><div id="cx-bars"></div></div>' +
				'<div class="cx-sec"><div class="cx-h"><span>commit</span></div><div id="cx-det"></div></div></div></div>';
			document.body.appendChild(root);
			const q = (s) => root.querySelector(s);
			scroll = q('#cx-scroll');
			stage = q('#cx-stage');
			cv = q('#cx-cv');
			ctx = cv.getContext('2d');
			rowsEl = q('#cx-rows');
			spacer = q('#cx-spacer');
			legEl = q('#cx-leg');
			subEl = q('#cx-sub');
			qEl = q('#cx-q');
			atEl = q('#cx-at');
			cardsEl = q('#cx-cards');
			chartsEl = q('#cx-charts');
			barsEl = q('#cx-bars');
			detEl = q('#cx-det');
			addEl = q('#cx-add');

			q('#cx-x').addEventListener('click', closeUI);
			q('#cx-now').addEventListener('click', () => scroll.scrollTo({ top: 0, behavior: 'smooth' }));
			q('#cx-sidebtn').addEventListener('click', () => root.classList.toggle('side'));
			q('#cx-exp').addEventListener('click', exportJSON);
			q('#cx-clr').addEventListener('click', clearAll);
			qEl.addEventListener('input', () => {
				clearTimeout(qTimer);
				qTimer = setTimeout(() => {
					query = qEl.value.trim();
					rebuildView();
				}, 180);
			});
			scroll.addEventListener('scroll', schedule, { passive: true });
			window.addEventListener('resize', () => {
				if (!isOpen) return;
				size();
				computeGeom();
				schedule();
			});
			rowsEl.addEventListener('click', (e) => {
				const r = e.target.closest('.cx-row');
				if (!r) return;
				const s = Number(r.dataset.seq);
				sel = sel === s ? null : s;
				sideUpdate();
				schedule();
			});
			addEl.addEventListener('change', () => {
				if (addEl.value && !charts.some((c) => c.name === addEl.value)) {
					makeChart(addEl.value);
					drawCharts(1, curT);
				}
				addEl.value = '';
			});
			window.addEventListener(
				'keydown',
				(e) => {
					if (!isOpen) return;
					if (e.key === 'Escape') {
						e.preventDefault();
						closeUI();
					}
					e.stopPropagation();
				},
				true
			);
			built = true;
		}

		function passes(c, q) {
			return (
				!hiddenL.has(c.lane) &&
				!hiddenS.has(c.src) &&
				(!q || (c.msg + ' ' + c.lane + ' ' + c.sha + ' ' + c.tag).toLowerCase().indexOf(q) >= 0)
			);
		}

		function rebuildView() {
			V = [];
			laneV = new Map();
			const q = query.toLowerCase();
			for (const c of C) {
				if (!passes(c, q)) continue;
				V.push(c.seq);
				let a = laneV.get(c.lane);
				if (!a) laneV.set(c.lane, (a = []));
				a.push(c.seq);
			}
			LV = lanes.filter((l) => laneV.has(l));
			laneX = new Map();
			LV.forEach((l, i) => laneX.set(l, i));
			viewDirty = false;
			computeGeom();
			buildLegend();
			buildBars();
			if (isOpen) {
				sizeSpacer();
				sideUpdate();
				schedule();
			}
		}

		function computeGeom() {
			const maxW = window.innerWidth < 760 ? 150 : 300;
			spx = clamp(Math.floor((maxW - 24) / Math.max(1, LV.length)), 7, 16);
			root.style.setProperty('--gw', 20 + LV.length * spx + 'px');
		}

		const lx = (l) => 12 + laneX.get(l) * spx;

		function size() {
			const H = scroll.clientHeight;
			stage.style.height = H + 'px';
			stage.style.marginBottom = -H + 'px';
			focusY = Math.round(H * 0.38);
			padTopPx = Math.max(0, focusY - ROW / 2);
			sizeSpacer();
		}

		function sizeSpacer() {
			spacer.style.height = padTopPx + V.length * ROW + (scroll.clientHeight - focusY) + 20 + 'px';
		}

		function schedule() {
			if (!raf && isOpen) raf = requestAnimationFrame(render);
		}

		function edgeAlpha(y, H) {
			const a = Math.min(clamp((y - 6) / 70, 0, 1), clamp((H - y + 10) / 100, 0, 1));
			return a * a * (3 - 2 * a);
		}

		function mkRow() {
			const el = mk('div', 'cx-row');
			const t = mk('span', 't');
			const s = mk('span', 's');
			const p = mk('span', 'p');
			const m = mk('span', 'm');
			const g = mk('span', 'g');
			el.append(t, s, p, m, g);
			return { el, t, s, p, m, g, v: -1, c: null, head: null };
		}

		function fillRow(r, c) {
			r.c = c;
			r.v = c._v;
			r.t.textContent = fmtTime(c.ts);
			r.s.textContent = c.sha;
			r.p.style.color = laneColor(c.lane);
			r.m.textContent = c.msg + (c.n > 1 ? '  x' + c.n : '');
			r.g.textContent = c.tag;
			r.g.style.display = c.tag ? '' : 'none';
			r.el.dataset.seq = c.seq;
			r.el.dataset.k = c.kind;
			r.head = null;
		}

		function render() {
			raf = 0;
			if (!isOpen) return;
			const st = scroll.scrollTop;
			const H = stage.clientHeight || scroll.clientHeight;
			const W = stage.clientWidth;
			const n = V.length;
			const yOfD = (d) => padTopPx + d * ROW + ROW / 2 - st;
			const dpr = window.devicePixelRatio || 1;
			if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
				cv.width = Math.round(W * dpr);
				cv.height = Math.round(H * dpr);
				cv.style.width = W + 'px';
				cv.style.height = H + 'px';
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, W, H);
			if (!n) {
				for (const r of rowEls.values()) r.el.remove();
				rowEls.clear();
				if (focusSeq !== -1) {
					focusSeq = -1;
					sideUpdate();
				}
				return;
			}
			const first = clamp(Math.floor((st - padTopPx) / ROW) - 1, 0, n - 1);
			const last = clamp(Math.ceil((st + H - padTopPx) / ROW) + 1, 0, n - 1);
			const fd = clamp(Math.round((st + focusY - padTopPx - ROW / 2) / ROW), 0, n - 1);
			const fseq = V[n - 1 - fd];
			if (fseq !== focusSeq) {
				focusSeq = fseq;
				sideUpdate();
			}
			const fc = C[focusSeq - base];
			const focusLane = fc ? fc.lane : '';

			const used = new Set();
			for (let d = first; d <= last; d++) {
				const seq = V[n - 1 - d];
				const c = C[seq - base];
				if (!c) continue;
				let r = rowEls.get(seq);
				if (!r) {
					r = mkRow();
					rowEls.set(seq, r);
					rowsEl.appendChild(r.el);
				}
				used.add(seq);
				if (r.v !== c._v || r.c !== c) fillRow(r, c);
				const arr = laneV.get(c.lane);
				const head = arr && arr[arr.length - 1] === seq;
				if (r.head !== head) {
					r.head = head;
					r.p.textContent = (head ? '● ' : '') + c.lane;
				}
				const y = yOfD(d);
				const a = edgeAlpha(y, H);
				r.el.style.transform =
					'translate(' + ((1 - a) * 28).toFixed(1) + 'px,' + (y - ROW / 2).toFixed(1) + 'px)';
				r.el.style.opacity = a.toFixed(3);
				r.el.classList.toggle('f', seq === focusSeq);
				r.el.classList.toggle('sel', seq === sel);
			}
			for (const [seq, r] of rowEls) {
				if (!used.has(seq)) {
					r.el.remove();
					rowEls.delete(seq);
				}
			}

			const seqLo = V[n - 1 - last];
			const seqHi = V[n - 1 - first];
			const posY = (seq) => {
				const k = lowerBound(V, seq);
				return V[k] === seq ? yOfD(n - 1 - k) : null;
			};

			ctx.strokeStyle = 'rgba(255,255,255,.07)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, yOfD(fd));
			ctx.lineTo(W, yOfD(fd));
			ctx.stroke();

			ctx.lineWidth = 2;
			ctx.lineCap = 'round';
			for (const l of LV) {
				const arr = laneV.get(l);
				const x = lx(l);
				ctx.strokeStyle = laneColor(l);
				ctx.globalAlpha = l === focusLane ? 0.95 : 0.5;
				const i0 = Math.max(0, lowerBound(arr, seqLo) - 1);
				const i1 = Math.min(arr.length - 1, lowerBound(arr, seqHi + 1));
				ctx.beginPath();
				for (let k = i0; k < i1; k++) {
					const ya = posY(arr[k]);
					const yb = posY(arr[k + 1]);
					if (ya === null || yb === null) continue;
					ctx.moveTo(x, clamp(ya, -60, H + 60));
					ctx.lineTo(x, clamp(yb, -60, H + 60));
				}
				ctx.stroke();
			}

			ctx.lineWidth = 1.6;
			ctx.globalAlpha = 0.6;
			for (const e of E) {
				if (e[1] < seqLo || e[0] > seqHi) continue;
				const ca = C[e[0] - base];
				const cb = C[e[1] - base];
				if (!ca || !cb || !laneX.has(ca.lane) || !laneX.has(cb.lane)) continue;
				const xa = lx(ca.lane);
				const xb = lx(cb.lane);
				if (xa === xb) continue;
				const ya = posY(e[0]);
				const yb = posY(e[1]);
				if (ya === null || yb === null) continue;
				const my = (ya + yb) / 2;
				ctx.strokeStyle = laneColor(ca.lane);
				ctx.beginPath();
				ctx.moveTo(xa, ya);
				ctx.bezierCurveTo(xa, my, xb, my, xb, yb);
				ctx.stroke();
			}

			for (let d = first; d <= last; d++) {
				const seq = V[n - 1 - d];
				const c = C[seq - base];
				if (!c || !laneX.has(c.lane)) continue;
				const y = yOfD(d);
				const a = edgeAlpha(y, H);
				const x = lx(c.lane);
				const col = laneColor(c.lane);
				const big = seq === focusSeq ? 1.4 : 1;
				const rad =
					(c.kind === 'merge' ? 5.5 : c.kind === 'tag' ? 5 : c.kind === 'call' ? 3 : 4) *
					(0.5 + 0.5 * a) *
					big;
				ctx.globalAlpha = a;
				if (seq === focusSeq) {
					ctx.shadowColor = col;
					ctx.shadowBlur = 12;
				}
				if (c.kind === 'error' || c.kind === 'warn') {
					ctx.fillStyle = c.kind === 'error' ? '#ff5a5a' : '#ffc857';
					ctx.beginPath();
					ctx.moveTo(x, y - rad - 1);
					ctx.lineTo(x + rad + 1, y);
					ctx.lineTo(x, y + rad + 1);
					ctx.lineTo(x - rad - 1, y);
					ctx.closePath();
					ctx.fill();
				} else if (c.kind === 'merge') {
					ctx.fillStyle = '#000';
					ctx.strokeStyle = col;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(x, y, rad, 0, 7);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = col;
					ctx.beginPath();
					ctx.arc(x, y, rad * 0.4, 0, 7);
					ctx.fill();
				} else if (c.kind === 'call' || c.kind === 'event' || c.kind === 'net') {
					ctx.fillStyle = '#000';
					ctx.strokeStyle = col;
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.arc(x, y, rad, 0, 7);
					ctx.fill();
					ctx.stroke();
				} else {
					ctx.fillStyle = col;
					ctx.beginPath();
					ctx.arc(x, y, rad, 0, 7);
					ctx.fill();
					if (c.kind === 'tag') {
						ctx.strokeStyle = col;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.arc(x, y, rad + 3, 0, 7);
						ctx.stroke();
					}
				}
				ctx.shadowBlur = 0;
			}

			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'destination-in';
			const g = ctx.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, 'rgba(0,0,0,0)');
			g.addColorStop(Math.min(0.15, 70 / H), '#000');
			g.addColorStop(1 - Math.min(0.2, 110 / H), '#000');
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'source-over';
		}

		function pickSeries(k) {
			const names = Array.from(series.keys());
			const out = PREF.filter((x) => series.has(x));
			const rest = names
				.filter(
					(x) =>
						!out.includes(x) &&
						!x.startsWith('sys.') &&
						!x.startsWith('rev.') &&
						series.get(x).length > 2
				)
				.sort((a, b) => series.get(b).length - series.get(a).length);
			return out.concat(rest).slice(0, k);
		}

		function refreshCards(force) {
			const names = pickSeries(6).concat(['sys.commits', 'sys.ls.kb'].filter((x) => series.has(x)));
			const key = names.join('|');
			if (force || key !== cardKey) {
				cardKey = key;
				cardsEl.textContent = '';
				cards.clear();
				for (const name of names) {
					const el = mk('div', 'cx-card');
					const b = mk('b');
					const l = mk('span');
					b.textContent = '–';
					l.textContent = name.replace(/^(ls|var):/, '');
					l.title = name;
					el.append(b, l);
					cardsEl.appendChild(el);
					cards.set(name, { el, val: b, cur: null, tgt: null, shown: '' });
				}
			}
			if (optCount !== series.size) {
				optCount = series.size;
				addEl.textContent = '';
				const o0 = mk('option');
				o0.value = '';
				o0.textContent = '+ add';
				addEl.appendChild(o0);
				Array.from(series.keys())
					.sort()
					.forEach((x) => {
						const o = mk('option');
						o.value = x;
						o.textContent = x.replace(/^(ls|var):/, '');
						addEl.appendChild(o);
					});
			}
			if (!charts.length && series.size)
				pickSeries(3)
					.concat(series.has('sys.ls.kb') ? ['sys.ls.kb'] : [])
					.forEach(makeChart);
		}

		function tween() {
			twRaf = 0;
			let more = false;
			for (const k of cards.values()) {
				if (k.tgt === null) {
					if (k.shown !== '–') {
						k.val.textContent = '–';
						k.shown = '–';
					}
					continue;
				}
				if (k.cur === null) k.cur = k.tgt;
				const d = k.tgt - k.cur;
				if (Math.abs(d) > Math.max(0.005, Math.abs(k.tgt) * 0.002)) {
					k.cur += d * 0.22;
					more = true;
				} else k.cur = k.tgt;
				const v = Number.isInteger(k.tgt) ? Math.round(k.cur) : Math.round(k.cur * 100) / 100;
				const s = fmt(v);
				if (s !== k.shown) {
					k.val.textContent = s;
					k.shown = s;
				}
			}
			if (more) twRaf = requestAnimationFrame(tween);
		}

		function makeChart(name) {
			const wrap = mk('div', 'cx-chart');
			const hd = mk('div', 'hd');
			const nm = mk('span');
			nm.textContent = name.replace(/^(ls|var):/, '');
			const val = mk('span');
			const x = mk('u');
			x.textContent = '×';
			hd.append(nm, val, x);
			const c = mk('canvas');
			wrap.append(hd, c);
			chartsEl.appendChild(wrap);
			const ch = { name, wrap, cv: c, val };
			x.addEventListener('click', () => {
				wrap.remove();
				charts = charts.filter((q) => q !== ch);
			});
			charts.push(ch);
		}

		function drawChart(ch, reveal, T) {
			const a = series.get(ch.name);
			const c = ch.cv;
			const w = c.clientWidth;
			const h = c.clientHeight;
			if (!w || !h) return;
			const dpr = window.devicePixelRatio || 1;
			if (c.width !== Math.round(w * dpr)) {
				c.width = Math.round(w * dpr);
				c.height = Math.round(h * dpr);
			}
			const g = c.getContext('2d');
			g.setTransform(dpr, 0, 0, dpr, 0, 0);
			g.clearRect(0, 0, w, h);
			if (!a || !a.length) return;
			const t0 = C.length ? Math.min(C[0].ts, a[0][0]) : a[0][0];
			const t1 = Math.max(C.length ? C[C.length - 1].ts2 : 0, a[a.length - 1][0], t0 + 1);
			let mn = Infinity;
			let mx = -Infinity;
			for (const p of a) {
				if (p[1] < mn) mn = p[1];
				if (p[1] > mx) mx = p[1];
			}
			if (mx === mn) {
				mx += 1;
				mn -= 1;
			}
			const X = (ts) => clamp((ts - t0) / (t1 - t0), 0, 1) * (w - 4) + 2;
			const Y = (v) => h - 4 - ((v - mn) / (mx - mn)) * (h - 8);
			const lim = 2 + (w - 4) * reveal;
			const pts = [];
			let py = 0;
			for (const p of a) {
				const x = X(p[0]);
				if (x > lim) break;
				const y = Y(p[1]);
				if (pts.length) pts.push([x, py]);
				pts.push([x, y]);
				py = y;
			}
			if (pts.length) pts.push([Math.min(lim, w - 2), py]);
			if (pts.length) {
				g.beginPath();
				pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
				g.strokeStyle = '#9ac6e6';
				g.lineWidth = 1.4;
				g.stroke();
				g.lineTo(pts[pts.length - 1][0], h);
				g.lineTo(pts[0][0], h);
				g.closePath();
				const gr = g.createLinearGradient(0, 0, 0, h);
				gr.addColorStop(0, 'rgba(154,198,230,.18)');
				gr.addColorStop(1, 'rgba(154,198,230,0)');
				g.fillStyle = gr;
				g.fill();
			}
			if (T != null) {
				const mxp = X(T);
				g.strokeStyle = 'rgba(255,255,255,.4)';
				g.lineWidth = 1;
				g.beginPath();
				g.moveTo(mxp, 0);
				g.lineTo(mxp, h);
				g.stroke();
				const v = valueAt(ch.name, T);
				if (v != null) {
					g.fillStyle = '#fff';
					g.beginPath();
					g.arc(mxp, Y(v), 3, 0, 7);
					g.fill();
				}
				ch.val.textContent = v == null ? '–' : fmt(v);
			}
		}

		function drawCharts(reveal, T) {
			for (const ch of charts) drawChart(ch, reveal, T);
		}

		function animateReveal() {
			const p = clamp((performance.now() - revealT0) / 900, 0, 1);
			const e = 1 - Math.pow(1 - p, 3);
			drawCharts(e, curT);
			if (p < 1 && isOpen) requestAnimationFrame(animateReveal);
		}

		function buildLegend() {
			legEl.textContent = '';
			const toggle = (set, v, ev) => {
				if (ev.shiftKey && set === hiddenL) {
					hiddenL.clear();
					lanes.forEach((l) => l !== v && hiddenL.add(l));
				} else if (set.has(v)) set.delete(v);
				else set.add(v);
				rebuildView();
			};
			for (const l of lanes) {
				const ch = mk('span', 'cx-chip' + (hiddenL.has(l) ? ' off' : ''));
				const i = mk('i');
				i.style.background = laneColor(l);
				const t = mk('span');
				t.textContent = l;
				const n = mk('em');
				n.textContent = laneCount.get(l) || 0;
				ch.dataset.lane = l;
				ch.append(i, t, n);
				ch.addEventListener('click', (ev) => toggle(hiddenL, l, ev));
				legEl.appendChild(ch);
			}
			legEl.appendChild(mk('span', 'cx-sep'));
			for (const s of SRCS) {
				const ch = mk('span', 'cx-chip src' + (hiddenS.has(s) ? ' off' : ''));
				ch.textContent = s;
				ch.addEventListener('click', (ev) => toggle(hiddenS, s, ev));
				legEl.appendChild(ch);
			}
		}

		function updateLegendCounts() {
			legEl.querySelectorAll('.cx-chip[data-lane]').forEach((ch) => {
				const em = ch.querySelector('em');
				const v = String(laneCount.get(ch.dataset.lane) || 0);
				if (em && em.textContent !== v) em.textContent = v;
			});
		}

		function buildBars() {
			barsEl.textContent = '';
			bars.clear();
			for (const l of LV) {
				const row = mk('div', 'cx-bar');
				const nm = mk('span', 'nm');
				nm.textContent = l;
				nm.style.color = laneColor(l);
				const tr = mk('div', 'tr');
				const fl = mk('div', 'fl');
				fl.style.background = laneColor(l);
				tr.appendChild(fl);
				const ct = mk('span', 'ct');
				row.append(nm, tr, ct);
				barsEl.appendChild(row);
				bars.set(l, { fl, ct });
			}
		}

		function updateBars() {
			let mx = 1;
			for (const l of LV) mx = Math.max(mx, laneV.get(l).length);
			for (const [l, b] of bars) {
				const arr = laneV.get(l);
				if (!arr) continue;
				const cnt = focusSeq == null ? 0 : lowerBound(arr, focusSeq + 1);
				b.fl.style.width = (cnt / mx) * 100 + '%';
				b.ct.textContent = fmt(cnt);
			}
		}

		function detailText(c) {
			const lines = [
				c.sha + '  ' + c.lane + '  ' + c.src + '/' + c.kind,
				new Date(c.ts).toLocaleString() +
					(c.n > 1 ? '  →  ' + fmtTime(c.ts2) + '  (' + c.n + 'x)' : ''),
				'parent ' + (c.parent || '(root)'),
			];
			if (c.inc && c.inc.length) {
				const from = c.inc
					.map((s) => C[s - base])
					.filter(Boolean)
					.map((x) => x.lane + ':' + x.sha);
				if (from.length) lines.push('merges ' + from.join(' '));
			}
			lines.push('', c.msg);
			if (c.lines && c.lines.length) lines.push('', c.lines.join('\n'));
			return lines.join('\n');
		}

		function sideUpdate() {
			if (!built) return;
			const fc = focusSeq == null || focusSeq < 0 ? null : C[focusSeq - base];
			subEl.textContent =
				C.length +
				' commits · ' +
				LV.length +
				' lanes · ' +
				series.size +
				' series · ' +
				shadow.size +
				' keys · ' +
				probes.size +
				' vars · ' +
				fnCount +
				' fns';
			if (!fc) {
				atEl.textContent = 'no commits yet';
				detEl.textContent = '';
				return;
			}
			curT = fc.ts;
			atEl.textContent = 'state at ' + fmtTime(curT);
			for (const [name, k] of cards) k.tgt = valueAt(name, curT);
			if (!twRaf) twRaf = requestAnimationFrame(tween);
			drawCharts(1, curT);
			updateBars();
			const dc = sel != null && C[sel - base] ? C[sel - base] : fc;
			detEl.textContent = detailText(dc);
		}

		function openUI() {
			if (!built) build();
			clearTimeout(closeTok);
			root.classList.add('show');
			if (viewDirty) rebuildView();
			isOpen = true;
			size();
			sizeSpacer();
			scroll.scrollTop = 0;
			void root.offsetWidth;
			root.classList.add('on');
			focusSeq = null;
			refreshCards(true);
			revealT0 = performance.now();
			animateReveal();
			schedule();
			clearInterval(sideTimer);
			sideTimer = setInterval(() => {
				if (!isOpen) return;
				refreshCards(false);
				updateLegendCounts();
				sideUpdate();
			}, 2000);
			try {
				scroll.focus({ preventScroll: true });
			} catch (_) {}
		}

		function closeUI() {
			if (!isOpen) return;
			isOpen = false;
			root.classList.remove('on');
			clearInterval(sideTimer);
			closeTok = setTimeout(() => root.classList.remove('show'), 650);
		}

		function added(c) {
			if (!built) return;
			if (!isOpen) {
				viewDirty = true;
				return;
			}
			if (!passes(c, query.toLowerCase())) return;
			if (!laneV.has(c.lane)) {
				const keep = scroll.scrollTop;
				rebuildView();
				if (keep > 4) scroll.scrollTop = keep + ROW;
				return;
			}
			V.push(c.seq);
			laneV.get(c.lane).push(c.seq);
			sizeSpacer();
			if (scroll.scrollTop > 4) scroll.scrollTop += ROW;
			schedule();
		}

		function touch() {
			if (isOpen) schedule();
		}

		function reset() {
			sel = null;
			focusSeq = null;
			viewDirty = true;
			charts.forEach((c) => c.wrap.remove());
			charts = [];
			cardKey = '';
			optCount = -1;
			if (built) {
				for (const r of rowEls.values()) r.el.remove();
				rowEls.clear();
				rebuildView();
				refreshCards(true);
			}
		}

		function dirtyView() {
			viewDirty = true;
			if (isOpen) rebuildView();
		}

		return { open: openUI, close: closeUI, added, touch, reset, dirtyView };
	}

	function exportJSON() {
		const blob = new Blob(
			[
				JSON.stringify({
					lanes,
					commits: C.map(strip),
					edges: E,
					series: Object.fromEntries(series),
				}),
			],
			{
				type: 'application/json',
			}
		);
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'chronicle.json'; //Do not. The file will be bigger than your apartment complex you live in if every molecule was one byte of data.
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	async function clearAll() {
		const msg = 'wipe all chronicle history? this cannot be undone.';
		const ok = window.showConfirm ? await window.showConfirm(msg, 'clear history') : confirm(msg);
		if (!ok) return;
		C.length = 0;
		E.length = 0;
		open.clear();
		lastInLane.clear();
		laneCount.clear();
		series.clear();
		dirty.clear();
		dirtySeries.clear();
		touched.rev.clear();
		touched.sync.clear();
		pending = null;
		base = seqNext;
		if (db) {
			await idb(['commits', 'series'], 'readwrite', (tx) => {
				tx.objectStore('commits').clear();
				tx.objectStore('series').clear();
			});
		}
		if (ui) ui.reset();
	}

	function mountSettings() {
		if (document.getElementById('cxSettingRow')) return true;
		const groups = Array.from(document.querySelectorAll('.settings-group'));
		const g =
			groups.find((x) => {
				const l = x.querySelector('.settings-group-label');
				return l && l.textContent.trim() === 'developer';
			}) || groups[groups.length - 1];
		if (!g) return false;
		const row = document.createElement('div');
		row.className = 'setting-row';
		row.id = 'cxSettingRow';
		row.innerHTML =
			'<div class="setting-info"><span class="setting-name">chronicle (beta)</span><span class="setting-desc">git-style graph of everything this game does, with live stats! (note: this doesnt use real git)</span></div><button class="setting-btn" id="cxOpenBtn">open</button>';
		g.appendChild(row);
		row.querySelector('#cxOpenBtn').addEventListener('click', () => ui.open());
		return true;
	}

	for (let i = 0; i < LSO.length; i++) {
		const k = LSO.key(i);
		const v = k === null ? null : rawGet.call(LSO, k);
		if (v !== null) {
			shadow.set(k, v);
			shadowBytes += k.length + v.length;
		}
	}

	ui = makeUI();

	window.Chronicle = {
		open: () => ui.open(),
		close: () => ui.close(),
		log: (lane, msg, lines) =>
			defer(() =>
				addCommit({
					src: 'sys',
					lane: lane || 'custom',
					kind: 'change',
					msg: String(msg),
					lines: lines || [],
				})
			),
		stats: () => ({
			commits: C.length,
			lanes: lanes.slice(),
			series: series.size,
			keys: shadow.size,
			vars: probes.size,
			fns: fnCount,
		}),
		export: exportJSON,
	};

	installHooks();
	boot().catch((e) => nativeErr('[chronicle] boot failed', e));

	let tries = 0;
	const mountTimer = setInterval(() => {
		if (mountSettings() || ++tries > 100) clearInterval(mountTimer);
	}, 400);
})();
