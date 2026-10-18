'use strict';

/*
 * tea.js
 *
 * A devtool that watches everything this game does and is NOT an alternative to
 * normal devtools on chrome or firefox, wahtever the hell you use.
 *
 * Add ?teasafe to the URL to disable function wrapping and variable probing.
 */

(function () {
	if (window.Tea) return;

	let LSO;
	try {
		LSO = window.localStorage;
	} catch (_) {
		return;
	}

	const DB_NAME = 'tea_v1';
	const MAX_COMMITS = 15000;
	const PRUNE_BATCH = 1500;
	const SERIES_CAP = 3000;
	const ROW = 28;
	const BLOB_CAP = 80000;
	const SENS = /token|passw|secret|backup|cookie/i;
	const SENS_URL =
		/login|register|reset-password|change-password|refresh-backup|discord|delete|backup-key/i;
	const SAFE = /[?&]teasafe\b/.test(location.search);
	const SRCS = ['ls', 'var', 'fn', 'net', 'event', 'idb', 'error', 'sys'];
	const TABS = ['stats', 'inspect', 'profile', 'keys', 'net', 'vars', 'console', 'breaks'];
	const SP = Storage.prototype;
	const rawGet = SP.getItem;
	const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
	const nativeErr = console.error.bind(console);
	const nSI = window.setInterval;
	const nCI = window.clearInterval;
	const nRAF = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;

	/*
	 * Finds out which file we are, so we can hide our own frames from stack traces
	 */
	const SELF = (function () {
		try {
			throw new Error('who am i');
		} catch (e) {
			const m = String(e.stack).match(/((?:https?|file|capacitor|app):\/\/[^\s)]*?):\d+:\d+/);
			return m ? m[1] : '';
		}
	})();
	try {
		if (Error.stackTraceLimit < 40) Error.stackTraceLimit = 40;
	} catch (_) {}

	/*
	 * The great regex table of lane assignment
	 */
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
		/^(sentry|__sentry|eruda|altcha|tea$|instant|webpack|gtag|datalayer|ga$|google|librecounter|\d+$)/i;
	const IGN_VAR =
		/mouse|cursor|scroll|lastx|lasty|nextrollallowed|sessionstart|storedseconds|totalseconds|rafid|timer|interval|^\$/i;
	const WRAP_FRAME =
		/^(Storage\.(setItem|removeItem|clear)|Object\.apply|Proxy\.apply|Reflect\.apply|EventTarget\.dispatchEvent|XMLHttpRequest\.(open|send)|IDBObjectStore\.\w+|console\.\w+|window\.fetch|Window\.fetch|fetch)$/;
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

	let ready = false;
	let recording = true;
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
	let curTask = null;
	let known = new Set();
	let hashes = {};
	let baseNames = null;
	let fnCount = 0;
	let scriptCount = 0;
	let urls = [];
	let bps = [];
	const urlMap = new Map();
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
	const dirtyBlobs = new Set();
	const blobs = new Map();
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
	const callStack = [];
	const fnStats = new Map();
	const keyStats = new Map();
	const netStats = new Map();
	const evStats = new Map();
	const timers = new Map();
	const srcText = new Map();
	const srcLines = new Map();

	const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
	const pad = (n) => String(n).padStart(2, '0');

	/*
	 * A hash function copied from the internet and trusted with exactly one job:
	 * making commit ids look like git. Do not ask it for security.
	 *
	 * Yes we are larping Git now. This keyword will NOT age well in 3 years
	 */
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

	// Fun fact: the reason this is named Tea is because it spills the tea on whatever the hell this game is doing!
	// It is also a niche reference to 418 I'm a teapot
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
				nativeErr('[tea]', e);
			}
		} else if (pendingOps.length < 3000) pendingOps.push(fn);
	}

	function strip(c) {
		const o = {};
		for (const k in c) if (k[0] !== '_') o[k] = c[k];
		return o;
	}

	function urlId(u) {
		let i = urlMap.get(u);
		if (i === undefined) {
			i = urls.length;
			urls.push(u);
			urlMap.set(u, i);
			metaDirty = true;
		}
		return i;
	}

	const fileName = (u) => String(u).split('?')[0].split('/').pop() || String(u);

	/*
	 * Parses both the Chrome style ("at fn (url:1:2)") and the Firefox/Safari style
	 * ("fn@url:1:2") of stack trace. Two formats, zero standards, infinite regex.
	 */
	function parseStack(s) {
		const out = [];
		if (!s) return out;
		const lines = String(s).split('\n');
		for (let i = 0; i < lines.length && out.length < 40; i++) {
			const line = lines[i];
			let m;
			let fn;
			let url;
			let ln;
			let col;
			if (
				(m = line.match(
					/^\s*at (?:async )?(?:(.*?) \()?((?:https?|file|capacitor|app|blob):[^\s)]*?):(\d+):(\d+)\)?\s*$/
				))
			) {
				fn = m[1];
				url = m[2];
				ln = m[3];
				col = m[4];
			} else if (
				(m = line.match(/^(.*?)@((?:https?|file|capacitor|app|blob):[^\s]*?):(\d+):(\d+)\s*$/))
			) {
				fn = m[1];
				url = m[2];
				ln = m[3];
				col = m[4];
			} else continue;
			out.push([fn || '(anonymous)', urlId(url), +ln, +col, url === SELF ? 1 : 0]);
		}
		while (out.length && out[0][4]) out.shift();
		return out;
	}

	const grabStack = () => parseStack(new Error().stack);
	const frameStr = (f) => f[0] + ' @ ' + fileName(urls[f[1]]) + ':' + f[2];

	function originOf(frames) {
		if (!frames) return '';
		for (const f of frames) if (!f[4] && !WRAP_FRAME.test(f[0])) return frameStr(f);
		return '';
	}

	const callTop = () => (callStack.length ? callStack[callStack.length - 1] : '');

	function trigger() {
		let t = '';
		try {
			const e = window.event;
			if (e)
				t =
					e.type +
					(e.target && e.target.id
						? '#' + e.target.id
						: e.target && e.target.tagName
							? ' <' + e.target.tagName.toLowerCase() + '>'
							: '');
		} catch (_) {}
		if (curTask)
			t =
				(t ? t + ' / ' : '') +
				curTask.kind +
				' ' +
				curTask.ms +
				'ms (created at ' +
				curTask.site +
				')';
		return t || 'direct call';
	}

	function capStr(s) {
		return typeof s === 'string' && s.length > BLOB_CAP
			? s.slice(0, BLOB_CAP) + '\n…[truncated ' + (s.length - BLOB_CAP) + ' chars]'
			: s;
	}

	function redactDeep(v, d) {
		d = d | 0;
		if (d > 6) return '…';
		if (Array.isArray(v)) return v.slice(0, 50).map((x) => redactDeep(x, d + 1));
		if (v && typeof v === 'object') {
			const pr = Object.getPrototypeOf(v);
			if (pr !== Object.prototype && pr !== null)
				return '[' + ((v.constructor && v.constructor.name) || 'object') + ']';
			const o = {};
			let i = 0;
			for (const k in v) {
				if (++i > 60) break;
				o[k] = SENS.test(k) ? '[redacted]' : redactDeep(v[k], d + 1);
			}
			return o;
		}
		if (typeof v === 'string' && v.length > 400) return v.slice(0, 400) + '…';
		return v;
	}

	function previewVal(v) {
		try {
			if (typeof v === 'string') return v.slice(0, 2000);
			if (v instanceof Error) return String(v.stack || v).slice(0, 2000);
			if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous');
			return JSON.stringify(redactDeep(v), null, 1).slice(0, 4000);
		} catch (_) {
			return Object.prototype.toString.call(v);
		}
	}

	function bodyPreview(s, cap) {
		try {
			return JSON.stringify(redactDeep(JSON.parse(s)), null, 1).slice(0, cap || 4000);
		} catch (_) {
			return SENS.test(s) ? '(redacted)' : s.slice(0, cap ? Math.min(cap, 2000) : 2000);
		}
	}

	function attachBlob(seq, o) {
		let b = blobs.get(seq);
		if (!b) {
			b = {};
			blobs.set(seq, b);
			if (blobs.size > 400) blobs.delete(blobs.keys().next().value);
		}
		Object.assign(b, o);
		dirtyBlobs.add(seq);
		return b;
	}

	function getBlob(seq) {
		if (blobs.has(seq)) return Promise.resolve(blobs.get(seq));
		if (!db) return Promise.resolve(null);
		return new Promise((res) => {
			try {
				const r = db.transaction('blobs').objectStore('blobs').get(seq);
				r.onsuccess = () => res(r.result || null);
				r.onerror = () => res(null);
			} catch (_) {
				res(null);
			}
		});
	}

	async function getSource(url) {
		if (srcText.has(url)) return srcText.get(url);
		let t = null;
		try {
			const u = new URL(url, location.href);
			if (u.origin === location.origin && nativeFetch) {
				const r = await nativeFetch(u.href, { cache: 'force-cache' });
				if (r.ok) t = await r.text();
			}
		} catch (_) {}
		srcText.set(url, t);
		return t;
	}

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
			a.splice(0, half, ...keep);
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

	/*
	 * Structural diff of two JSON values. It is recursive and it is opinionated about
	 * what an "id" is. It works anyway, so fuck it!
	 *
	 * We should probably just change the unicode arrows and such to normal characters
	 * like > and < but then I have to escape it in HTML, so it's fucked either way.
	 */
	function diffVal(a, b, path, out, d) {
		if (out.length >= (out.cap || 40) || a === b) return;
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

	/*
	 * A textbook longest-common-subsequence line diff
	 */
	function lineDiff(a, b) {
		const A = String(a).split('\n');
		const B = String(b).split('\n');
		if (A.length * B.length > 2.5e6) return null;
		let s = 0;
		while (s < A.length && s < B.length && A[s] === B[s]) s++;
		let ea = A.length;
		let eb = B.length;
		while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) {
			ea--;
			eb--;
		}
		const a2 = A.slice(s, ea);
		const b2 = B.slice(s, eb);
		const n = a2.length;
		const m = b2.length;
		const w = m + 1;
		const dp = new Uint16Array((n + 1) * w);
		for (let i = n - 1; i >= 0; i--) {
			for (let j = m - 1; j >= 0; j--) {
				dp[i * w + j] =
					a2[i] === b2[j]
						? dp[(i + 1) * w + j + 1] + 1
						: Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
			}
		}
		const out = [];
		for (let k = Math.max(0, s - 3); k < s; k++) out.push([' ', A[k]]);
		let i = 0;
		let j = 0;
		while (i < n && j < m) {
			if (a2[i] === b2[j]) {
				out.push([' ', a2[i]]);
				i++;
				j++;
			} else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push(['-', a2[i++]]);
			else out.push(['+', b2[j++]]);
		}
		while (i < n) out.push(['-', a2[i++]]);
		while (j < m) out.push(['+', b2[j++]]);
		for (let k = ea; k < Math.min(A.length, ea + 3); k++) out.push([' ', A[k]]);
		const res = [];
		let run = [];
		const flush = () => {
			if (run.length > 8) {
				res.push(
					...run.slice(0, 3),
					['~', '… ' + (run.length - 6) + ' unchanged lines …'],
					...run.slice(-3)
				);
			} else res.push(...run);
			run = [];
		};
		for (const l of out) {
			if (l[0] === ' ') run.push(l);
			else {
				flush();
				res.push(l);
			}
		}
		flush();
		return res.slice(0, 1500);
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

	function keyStat(k) {
		let s = keyStats.get(k);
		if (!s) {
			s = { w: 0, noop: 0, last: 0, bytes: 0, sites: new Map() };
			keyStats.set(k, s);
		}
		return s;
	}

	function bpCheck(kind, text) {
		for (const b of bps) {
			if (!b.on || b.kind !== kind) continue;
			let hit = false;
			try {
				hit = b.re.test(text);
			} catch (_) {}
			if (!hit) continue;
			b.hits++;
			defer(() =>
				addCommit({
					src: 'sys',
					lane: 'tea',
					kind: 'warn',
					msg: 'breakpoint ' + kind + ' /' + b.src + '/ hit: ' + String(text).slice(0, 80),
					force: true,
				})
			);
		}
	}

	function suspectsFor(t) {
		const out = [];
		for (let i = C.length - 1; i >= 0 && i > C.length - 60 && out.length < 4; i--) {
			const c = C[i];
			if (t - c.ts2 > 1500) break;
			if (c.src === 'fn' && c.key && !out.includes(c.key)) out.push(c.key);
		}
		return out;
	}

	function noteSite(c, frames) {
		const s = originOf(frames);
		if (!s) return;
		c.sites = c.sites || {};
		if (c.sites[s] || Object.keys(c.sites).length < 8) c.sites[s] = (c.sites[s] || 0) + 1;
	}

	function addCommit(o) {
		if (!recording && !o.force) return null;
		const t = o.ts || Date.now();
		if (o.sig && o.coalesce) {
			const g = open.get(o.sig);
			if (g && g.c.seq >= base && t - g.c.ts2 < o.coalesce) {
				const c = g.c;
				c.n++;
				c.ts2 = t;
				c._v++;
				if (o.stack && o.stack.length) noteSite(c, o.stack);
				if (o.onMerge) o.onMerge(c, g);
				if (o.blobMerge) attachBlob(c.seq, o.blobMerge);
				else if (o.blob) attachBlob(c.seq, o.blob);
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
			key: o.key || '',
			inc: [],
			parent: prev ? prev.sha : '',
			sha: '',
			ses: sessionNo,
			trig: o.trig || '',
			via: o.via || '',
			org: originOf(o.stack),
			_v: 0,
		};
		if (o.stack && o.stack.length) {
			c.stack = o.stack.slice(0, 14);
			noteSite(c, o.stack);
		} else if (o.src === 'ls' || o.src === 'var') {
			const sus = suspectsFor(t);
			if (sus.length) c.sus = sus;
		}
		try {
			if (performance.memory)
				c.heap = Math.round(performance.memory.usedJSHeapSize / 104857.6) / 10;
		} catch (_) {}
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
		if (o.blob) attachBlob(c.seq, o.blob);
		if (o.pendingMerge) pending = { c, until: t + 1500, left: 8 };
		if (o.sig && o.coalesce) open.set(o.sig, { c, k: o.keep });
		if (ui) ui.added(c);
		return c;
	}

	function ingestLS(key, raw, w) {
		w = w || {};
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
		const pre = w.why ? '[' + w.why + '] ' : '';
		const ks = keyStat(key);
		ks.last = Date.now();
		ks.bytes = raw == null ? 0 : raw.length;
		const org = originOf(w.stack);
		if (org) ks.sites.set(org, (ks.sites.get(org) || 0) + 1);
		addCommit({
			src: 'ls',
			lane: laneFor(key),
			kind: tag ? 'tag' : 'change',
			msg: pre + d.msg,
			lines: d.lines,
			tag,
			key,
			stack: w.stack,
			trig: w.trig || (w.why ? 'detected by ' + w.why + ' check (no stack available)' : ''),
			via: w.via,
			sig: 'ls:' + key,
			coalesce: 4000,
			keep: { firstOld: old },
			blob: { kind: 'ls', before: capStr(old), after: capStr(raw) },
			blobMerge: { after: capStr(raw) },
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

	function wqAdd(k, why, stack, trig, via) {
		if (k == null) return;
		if (!wq.has(k))
			wq.set(k, { why: why || '', stack: stack || null, trig: trig || '', via: via || '' });
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
				nativeErr('[tea]', e);
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

	/*
	 * Reads a top-level variable by name, even `let` and `const` ones that
	 * deliberately hide from `window`. We do it with new Function, which
	 * linters hate and which works anyway.
	 */
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
				p = { sig, ch: [], poll: t, noisy: false, lc: 0, n: 0, lex: !userGlobals.has(n) };
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
			p.n++;
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
				key: n,
				trig: 'detected by 1s variable poll (no stack available)',
				via: callTop(),
				sig: 'var:' + n,
				coalesce: p.noisy ? 15000 : 3000,
				keep: { firstOld: old },
				blob: { kind: 'var', before: old.slice(2), after: sig.slice(2) },
				blobMerge: { after: sig.slice(2) },
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

	function logCall(label, args, res, ok, ms, cnt, st, via, trig) {
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
			const blob =
				st && !sens
					? {
							kind: 'fn',
							args: previewVal(Array.prototype.slice.call(args, 0, 5)),
							result: ok ? previewVal(res) : previewVal(res),
							ms: Math.round(ms * 100) / 100,
						}
					: undefined;
			addCommit({
				src: 'fn',
				lane: laneFor(label, 'calls'),
				kind: ok ? 'call' : 'error',
				msg: mk(),
				key: label,
				stack: st || undefined,
				trig,
				via,
				sig: 'fn:' + label + ok,
				coalesce: cnt > 60 ? 120000 : 30000,
				pendingMerge: merge && ok,
				blob,
				onMerge: (c) => {
					c.msg = mk();
				},
			});
		});
	}

	function fnStat(label, ms, bad) {
		let s = fnStats.get(label);
		if (!s) {
			s = { n: 0, ms: 0, max: 0, err: 0 };
			fnStats.set(label, s);
		}
		s.n++;
		s.ms += ms;
		if (ms > s.max) s.max = ms;
		if (bad) s.err++;
	}

	/*
	 * Wraps a function in a Proxy so every call can be timed, attributed, and
	 * gossiped about. Using Proxy instead of a plain wrapper keeps `new`, `.name`,
	 * and static properties intact, whoever made javascript im coming for your ass
	 */
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
				if (bps.length) bpCheck('fn', label);
				const st = cnt <= 25 || cnt % 40 === 0 ? grabStack() : null;
				const via = callTop();
				const trig = st ? trigger() : '';
				let r;
				let ok = true;
				let err;
				callStack.push(label);
				try {
					r = Reflect.apply(t, th, args);
				} catch (e) {
					ok = false;
					err = e;
				} finally {
					callStack.pop();
				}
				const ms = performance.now() - t0;
				fnStat(label, ms, !ok);
				if (!ok) {
					logCall(label, args, err, false, ms, cnt, st, via, trig);
					throw err;
				}
				if (r && typeof r.then === 'function') {
					r.then(
						(v) => logCall(label, args, v, true, performance.now() - t0, cnt, st, via, trig),
						(e) => logCall(label, args, e, false, performance.now() - t0, cnt, st, via, trig)
					);
				} else logCall(label, args, r, true, ms, cnt, st, via, trig);
				return r;
			},
			// my head hurt
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

	/*
	 * Downloads every same-origin script we can see and regexes through it to find
	 * top-level variable names. It is a parser in the way a rock is a hammer. I don't
	 * recommend using a rock itself as a hammer or else you might smash your finger
	 * bone out of your flesh! How fun!
	 */
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
					if (r.ok) {
						const t = await r.text();
						texts.push(t);
						if (!srcText.has(u.href)) srcText.set(u.href, t);
					}
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

	function describeReq(input, init) {
		const r = { headers: {}, body: null };
		try {
			const h = (init && init.headers) || (input && input.headers);
			if (h) {
				if (Array.isArray(h)) h.forEach((p) => (r.headers[p[0]] = p[1]));
				else if (typeof h.forEach === 'function') h.forEach((v, k) => (r.headers[k] = v));
				else Object.assign(r.headers, h);
			}
			for (const k in r.headers)
				if (/authorization|cookie|token/i.test(k)) r.headers[k] = '[redacted]';
			const b = init && init.body;
			if (typeof b === 'string')
				r.body = {
					size: b.length,
					preview: b.length > 8192 ? '(' + b.length + ' chars, not stored)' : bodyPreview(b),
				};
			else if (b)
				r.body = {
					size: b.size || b.byteLength || 0,
					preview: '(' + Object.prototype.toString.call(b) + ')',
				};
		} catch (_) {}
		return r;
	}

	function captureRes(res, blob, c, url) {
		try {
			const info = {
				status: res.status,
				statusText: res.statusText,
				type: res.type,
				redirected: res.redirected,
				headers: {},
			};
			res.headers.forEach(
				(v, k) => (info.headers[k] = /set-cookie|authorization/i.test(k) ? '[redacted]' : v)
			);
			blob.res = info;
			const ct = res.headers.get('content-type') || '';
			const len = Number(res.headers.get('content-length') || 0);
			if (SENS_URL.test(url)) {
				info.body = '(hidden: sensitive endpoint)';
				return;
			}
			if (!/json|text/.test(ct) || len > 200000) {
				info.body = '(' + (ct || 'unknown type') + ', ' + (len || '?') + ' bytes, not stored)';
				return;
			}
			res
				.clone()
				.text()
				.then((t) => {
					info.size = t.length;
					info.body = t.length > 200000 ? '(too large to store)' : bodyPreview(t, 6000);
					dirtyBlobs.add(c.seq);
					if (ui) ui.touch(c);
				})
				.catch(() => {});
		} catch (_) {}
	}

	/*
	 * Records one network request. Paths get their ids replaced with ":id"
	 */
	function netRecord(method, rawUrl, status, ms, stack, req, res) {
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
			const ep = method + ' ' + host + path;
			pushSeries('sys.net', ++netCount);
			if (bad) pushSeries('sys.net.err', ++netErr);
			let ns = netStats.get(ep);
			if (!ns) {
				ns = { n: 0, err: 0, ms: 0, max: 0, last: '' };
				netStats.set(ep, ns);
			}
			ns.n++;
			ns.ms += ms;
			if (ms > ns.max) ns.max = ms;
			if (bad) ns.err++;
			ns.last = status;
			const mk = () => ep + ' → ' + status + ' ' + Math.round(ms) + 'ms';
			const blob = {
				kind: 'net',
				req: Object.assign(
					{
						method,
						url: u.origin + u.pathname,
						query: SENS_URL.test(rawUrl) ? '(hidden)' : u.search.replace(/=[^&]*/g, '=…'),
					},
					req || {}
				),
				ms: Math.round(ms * 100) / 100,
			};
			const c = addCommit({
				src: 'net',
				lane,
				kind: bad ? 'error' : push ? 'merge' : 'net',
				msg: mk(),
				key: ep,
				stack,
				trig: stack ? trigger() : '',
				via: callTop(),
				sig: 'net:' + ep + status,
				coalesce: push ? 5000 : 90000,
				mergeFrom: push ? 'sync' : '',
				blob,
				onMerge: (cc) => {
					cc.msg = mk();
				},
			});
			if (c && res) captureRes(res, attachBlob(c.seq, {}), c, rawUrl);
		});
	}

	function revisionCommit(v, stack) {
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
			key: 'revisory_v1/revisions',
			stack,
			trig: stack ? trigger() : '',
			via: callTop(),
			mergeFrom: 'rev',
			blob: {
				kind: 'idb',
				value: previewVal(
					Object.assign({}, v, {
						snapshot: '(' + Object.keys(v.snapshot || {}).length + ' keys, omitted)',
					})
				),
			},
		});
	}

	function idbValue(v) {
		if (v && typeof v === 'object') {
			const o = Object.assign({}, v);
			for (const k of ['snapshot', 'incomingSnapshot'])
				if (o[k]) o[k] = '(' + Object.keys(o[k]).length + ' keys, omitted)';
			return previewVal(o);
		}
		return previewVal(v);
	}

	function recIDB(store, m, args) {
		const dbn = store.transaction.db.name;
		if (dbn === DB_NAME) return;
		const sn = store.name;
		const stack = grabStack();
		if (bps.length) bpCheck('idb', dbn + '/' + sn + ' ' + m);
		if (dbn === 'revisory_v1' && sn === 'revisions' && m === 'put') {
			const v = args[0] || {};
			defer(() => revisionCommit(v, stack));
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
					key: 'revisory_v1/quarantine',
					stack,
					trig: trigger(),
					sig: 'q:' + v.id + v.resolved,
					coalesce: 1000,
					blob: { kind: 'idb', value: idbValue(v) },
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
		const trig = trigger();
		const via = callTop();
		const val = m === 'put' || m === 'add' ? idbValue(args[0]) : undefined;
		defer(() =>
			addCommit({
				src: 'idb',
				lane,
				kind: 'event',
				msg: dbn + '/' + sn + ' ' + m + (key ? ' ' + key.slice(0, 40) : ''),
				key: dbn + '/' + sn,
				stack,
				trig,
				via,
				sig: 'idb:' + dbn + sn + m,
				coalesce: 8000,
				blob: { kind: 'idb', key, value: val },
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

	/*
	 * Every global hook lives in this one function

	Do not judge
	 */
	function installHooks() {
		const pSet = SP.setItem;
		const pRem = SP.removeItem;
		const pClr = SP.clear;
		SP.setItem = function (k, v) {
			if (this === LSO) {
				const key = String(k);
				const val = String(v);
				const old = rawGet.call(LSO, key);
				const ks = keyStat(key);
				ks.w++;
				if (old === val) ks.noop++;
				else {
					if (bps.length) bpCheck('ls', key);
					wqAdd(key, '', grabStack(), trigger(), callTop());
				}
			}
			return pSet.apply(this, arguments);
		};
		SP.removeItem = function (k) {
			if (this === LSO) {
				const key = String(k);
				if (rawGet.call(LSO, key) !== null) {
					if (bps.length) bpCheck('ls', key);
					keyStat(key).w++;
					wqAdd(key, '', grabStack(), trigger(), callTop());
				}
			}
			return pRem.apply(this, arguments);
		};
		SP.clear = function () {
			if (this === LSO) {
				const st = grabStack();
				const tr = trigger();
				for (let i = 0; i < LSO.length; i++) wqAdd(LSO.key(i), '', st, tr, callTop());
			}
			return pClr.apply(this, arguments);
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
				const stack = grabStack();
				if (bps.length) bpCheck('net', method + ' ' + url);
				const req = describeReq(input, init);
				const t0 = performance.now();
				const p = pf.apply(this, arguments);
				try {
					p.then(
						(res) => netRecord(method, url, res.status, performance.now() - t0, stack, req, res),
						() => netRecord(method, url, 'ERR', performance.now() - t0, stack, req, null)
					);
				} catch (_) {}
				return p;
			};
		}

		if (window.XMLHttpRequest) {
			const xo = XMLHttpRequest.prototype.open;
			const xs = XMLHttpRequest.prototype.send;
			XMLHttpRequest.prototype.open = function (m, u) {
				this.__tea = [String(m).toUpperCase(), String(u), null];
				return xo.apply(this, arguments);
			};
			XMLHttpRequest.prototype.send = function () {
				const t0 = performance.now();
				const x = this;
				if (x.__tea) {
					x.__tea[2] = grabStack();
					if (bps.length) bpCheck('net', x.__tea[0] + ' ' + x.__tea[1]);
					x.addEventListener('loadend', () => {
						try {
							netRecord(
								x.__tea[0],
								x.__tea[1],
								x.status || 'ERR',
								performance.now() - t0,
								x.__tea[2],
								{ headers: {}, body: null, via: 'XMLHttpRequest' },
								null
							);
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

		/*
		 * Patching dispatchEvent on EventTarget.prototype means we get to see every
		 * synthetic event in the app.
		 *
		 * It also means we are inside the walls. Hello. Nice mattress where'd you get it from?
		 */
		const od = EventTarget.prototype.dispatchEvent;
		EventTarget.prototype.dispatchEvent = function (e) {
			try {
				if (typeof CustomEvent !== 'undefined' && e instanceof CustomEvent) {
					const b = evBrief(e);
					const t = e.type;
					const stack = grabStack();
					const tr = trigger();
					evStats.set(t, (evStats.get(t) || 0) + 1);
					if (bps.length) bpCheck('event', t);
					defer(() => {
						if (SENS.test(t)) return;
						const mk = () => 'event ' + t + (b ? ' ' + b : '');
						addCommit({
							src: 'event',
							lane: laneFor(t, 'events'),
							kind: 'event',
							msg: mk(),
							key: t,
							stack,
							trig: tr,
							via: callTop(),
							sig: 'ev:' + t + (t === 'syncstatus' ? b : ''),
							coalesce: 3000,
							blob: { kind: 'event', type: t, detail: previewVal(e.detail) },
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
					const args = Array.from(arguments);
					const txt = args
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
					const stack = grabStack();
					defer(() =>
						addCommit({
							src: 'error',
							lane: m === 'error' ? 'errors' : 'console',
							kind: m === 'error' ? 'error' : 'warn',
							msg: SENS.test(txt) ? 'console.' + m + ' (redacted)' : txt,
							key: 'console.' + m,
							stack,
							trig: trigger(),
							via: callTop(),
							sig: 'con:' + m + txt.slice(0, 60),
							coalesce: 5000,
							blob: {
								kind: 'error',
								message: SENS.test(txt)
									? '(redacted)'
									: previewVal(args.map((a) => previewVal(a)).join('\n')),
							},
						})
					);
				} catch (_) {}
				return o.apply(this, arguments);
			};
		});

		window.addEventListener('error', (e) => {
			const stack =
				e.error && e.error.stack
					? parseStack(e.error.stack)
					: [['(top level)', urlId(e.filename || location.href), e.lineno || 0, e.colno || 0, 0]];
			defer(() =>
				addCommit({
					src: 'error',
					lane: 'errors',
					kind: 'error',
					msg:
						(e.message || 'error') +
						(e.filename ? ' @ ' + fileName(e.filename) + ':' + e.lineno : ''),
					key: 'window.onerror',
					stack,
					trig: 'uncaught exception',
					sig: 'err:' + e.message,
					coalesce: 30000,
					blob: {
						kind: 'error',
						message: e.message,
						stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 4000) : '',
					},
				})
			);
		});
		window.addEventListener('unhandledrejection', (e) => {
			const r = e.reason;
			const msg = String((r && r.message) || r);
			const stack = r && r.stack ? parseStack(r.stack) : [];
			defer(() =>
				addCommit({
					src: 'error',
					lane: 'errors',
					kind: 'error',
					msg: 'unhandled rejection: ' + msg.slice(0, 120),
					key: 'unhandledrejection',
					stack,
					trig: 'unhandled promise rejection',
					sig: 'rej:' + msg.slice(0, 40),
					coalesce: 30000,
					blob: {
						kind: 'error',
						message: msg,
						stack: r && r.stack ? String(r.stack).slice(0, 4000) : '',
					},
				})
			);
		});

		/*
		 * Tracks every setInterval and remembers who created it. When something
		 * mysteriously writes to storage every ten seconds, this is the snitch.
		 *
		 * This is the teacher's pet of writing to localStorage fairly
		 */
		window.setInterval = function (fn, ms) {
			if (typeof fn !== 'function') return nSI.apply(window, arguments);
			const stack = grabStack();
			const site = originOf(stack) || 'unknown';
			const rec = {
				site,
				stack,
				ms: ms | 0,
				runs: 0,
				total: 0,
				max: 0,
				created: Date.now(),
				id: 0,
			};
			const rest = Array.prototype.slice.call(arguments, 2);
			const w = function () {
				const prev = curTask;
				curTask = { kind: 'interval', ms: rec.ms, site };
				const t0 = performance.now();
				try {
					return fn.apply(this, arguments);
				} finally {
					const d = performance.now() - t0;
					rec.runs++;
					rec.total += d;
					if (d > rec.max) rec.max = d;
					curTask = prev;
				}
			};
			const id = nSI.apply(window, [w, ms].concat(rest));
			rec.id = id;
			timers.set(id, rec);
			return id;
		};
		window.clearInterval = function (id) {
			timers.delete(id);
			return nCI.apply(window, arguments);
		};

		try {
			new PerformanceObserver((list) => {
				list.getEntries().forEach((en) =>
					defer(() =>
						addCommit({
							src: 'sys',
							lane: 'perf',
							kind: 'warn',
							msg: 'long task ' + Math.round(en.duration) + 'ms',
							key: 'longtask',
							sig: 'lt',
							coalesce: 5000,
							trig: curTask ? curTask.kind + ' created at ' + curTask.site : '',
						})
					)
				);
			}).observe({ entryTypes: ['longtask'] });
		} catch (_) {}

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
				d.createObjectStore('blobs', { keyPath: 'seq' });
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
		if (db) {
			idb(['commits', 'blobs'], 'readwrite', (tx) => {
				tx.objectStore('commits').delete(IDBKeyRange.upperBound(cut - 1));
				tx.objectStore('blobs').delete(IDBKeyRange.upperBound(cut - 1));
			});
		}
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
		const bs = Array.from(dirtyBlobs)
			.filter((s) => blobs.has(s))
			.map((s) => Object.assign({ seq: s }, blobs.get(s)));
		dirtyBlobs.clear();
		const ms = metaDirty
			? [
					{ key: 'lanes', v: lanes },
					{ key: 'known', v: Array.from(known) },
					{ key: 'hashes', v: hashes },
					{ key: 'sessions', v: sessionNo },
					{ key: 'urls', v: urls },
					{ key: 'bps', v: bps.map((b) => ({ kind: b.kind, src: b.src, on: b.on })) },
				]
			: [];
		metaDirty = false;
		if (!cs.length && !ss.length && !ms.length && !bs.length) return;
		await idb(['commits', 'series', 'meta', 'blobs'], 'readwrite', (tx) => {
			const a = tx.objectStore('commits');
			const b = tx.objectStore('series');
			const c = tx.objectStore('meta');
			const d = tx.objectStore('blobs');
			cs.forEach((x) => a.put(x));
			ss.forEach((x) => b.put(x));
			ms.forEach((x) => c.put(x));
			bs.forEach((x) => d.put(x));
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
							key: 'rarityTimestamps',
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
				key: 'revisory_v1/revisions',
			});
		}
		items.sort((a, b) => a.ts - b.ts);
		items.forEach((o) => addCommit(o));
	}

	async function boot() {
		db = await openDB();
		let firstRun = true;
		const m = {};
		if (db) {
			const [cs, ss, ms] = await Promise.all([
				loadAll('commits'),
				loadAll('series'),
				loadAll('meta'),
			]);
			cs.sort((a, b) => a.seq - b.seq);
			ms.forEach((x) => (m[x.key] = x.v));
			urls = m.urls || [];
			urls.forEach((u, i) => urlMap.set(u, i));
			try {
				bps = (m.bps || []).map((x) => ({
					kind: x.kind,
					src: x.src,
					re: new RegExp(x.src, 'i'),
					on: x.on,
					hits: 0,
				}));
			} catch (_) {
				bps = [];
			}
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
				c.key = c.key || '';
				c.org = c.org || '';
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
				addCommit({ src: 'ls', lane: laneFor(k), kind: 'change', msg: k + ' ' + w, key: k });
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
					? [
							'previous activity ' + Math.round(gap / 1000) + 's before this load',
							navigator.userAgent,
						]
					: ['first load', navigator.userAgent],
			key: 'session',
			force: true,
		});
		if (sc) {
			sc.inc = inc;
			for (const s of inc) E.push([s, sc.seq]);
		}
		metaDirty = true;
		ready = true;
		for (const fn of pendingOps.splice(0)) {
			try {
				fn();
			} catch (e) {
				nativeErr('[tea]', e);
			}
		}

		nSI.call(window, flush, 3000);
		nSI.call(window, pollLS, 2500);
		nSI.call(window, probeAll, 1000);
		nSI.call(
			window,
			() => {
				const t = Date.now();
				pushSeries('sys.ls.kb', Math.round(shadowBytes / 102.4) / 10);
				pushSeries('sys.ls.keys', shadow.size);
				pushSeries('sys.commits', seqNext);
				pushSeries('sys.timers', timers.size);
				try {
					pushSeries('sys.dom.nodes', document.getElementsByTagName('*').length);
				} catch (_) {}
				if (performance.memory)
					pushSeries('sys.heap.mb', Math.round(performance.memory.usedJSHeapSize / 104857.6) / 10);
				for (const [k, g] of open) if (t - g.c.ts2 > 120000) open.delete(k);
			},
			5000
		);
		const startScan = async () => {
			scanGlobals();
			await scanSources();
		};
		if (document.readyState === 'complete') setTimeout(startScan, 800);
		else window.addEventListener('load', () => setTimeout(startScan, 800));
		nSI.call(
			window,
			() => {
				scanGlobals();
				if (document.scripts.length !== scriptCount) scanSources();
			},
			4000
		);
	}

	function makeUI() {
		let root,
			scroll,
			stage,
			cv,
			ctx,
			rowsEl,
			spacer,
			side,
			legEl,
			subEl,
			qEl,
			atEl,
			cardsEl,
			chartsEl,
			barsEl,
			addEl,
			tabsEl,
			bodyEl,
			recBtn;
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
		let preds = [];
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
		let tab = 'stats';
		let inspTab = 'overview';
		let srcFrame = 0;
		let inspToken = 0;
		let inspDirty = false;
		let charts = [];
		const hiddenL = new Set();
		const hiddenS = new Set();
		const rowEls = new Map();
		const cards = new Map();
		const bars = new Map();
		const panels = {};
		const tables = {};
		const cmdHist = [];
		const watches = [];
		let consoleOut;
		let watchBox;
		let inspEl;
		let keyDetail;
		let bpList;

		const mk = (tag, cls, text) => {
			const e = document.createElement(tag);
			if (cls) e.className = cls;
			if (text !== undefined) e.textContent = text;
			return e;
		};

		function injectStyle() {
			if (document.getElementById('tea-style')) return;
			const s = mk('style');
			s.id = 'tea-style'; // Don't care, just inject the styles instead of putting it in the main CSS file
			// Who cares anyway?
			s.textContent = `
#tea{position:fixed;inset:0;z-index:2147483000;background:#000;color:#d6d6d6;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;display:none;opacity:0;transition:opacity .6s ease;flex-direction:column;overscroll-behavior:contain;user-select:none;-webkit-user-select:none}
#tea.show{display:flex}
#tea.on{opacity:1}
#tea *{box-sizing:border-box}
#tea button{background:transparent;border:1px solid #2a2a2a;color:#cfcfcf;padding:3px 9px;border-radius:2px;font:inherit;animation:none!important;text-transform:lowercase;cursor:pointer}
#tea button:hover:not(:disabled){background:#111;animation:none!important}
#tea button.on{border-color:#9ac6e6;color:#fff}
#tea input,#tea select{background:#0a0a0a;border:1px solid #222;color:#ddd;padding:3px 7px;border-radius:2px;font:inherit;user-select:text;-webkit-user-select:text}
#tea-top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #161616;flex-wrap:wrap}
#tea-top .ttl{letter-spacing:.2em}
#tea-top .sub{opacity:.4;font-size:11px}
#tea-top .sp{flex:1}
#tea-q{min-width:200px;max-width:420px;flex:1}
#tea-sidebtn{display:none}
#tea-leg{display:flex;gap:6px;padding:8px 14px;overflow-x:auto;border-bottom:1px solid #161616;white-space:nowrap;scrollbar-width:none}
#tea-leg::-webkit-scrollbar{display:none}
.tea-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #222;border-radius:20px;padding:1px 9px;cursor:pointer;flex-shrink:0;font-size:11px}
.tea-chip.off{opacity:.3;text-decoration:line-through}
.tea-chip i{width:8px;height:8px;border-radius:50%;display:inline-block}
.tea-chip em{font-style:normal;opacity:.4}
.tea-chip.src{border-style:dashed}
.tea-sep{width:1px;background:#222;flex-shrink:0;margin:0 4px}
#tea-main{flex:1;display:flex;min-height:0;position:relative}
#tea-scroll{flex:1;overflow-y:auto;position:relative;min-width:0;scrollbar-width:thin;scrollbar-color:#222 #000;outline:none;overscroll-behavior:contain}
#tea-stage{position:sticky;top:0;overflow:hidden}
#tea-cv{position:absolute;left:0;top:0;pointer-events:none}
#tea-rows{position:absolute;inset:0}
.tea-row{position:absolute;left:0;right:0;top:0;height:28px;display:flex;align-items:center;gap:10px;white-space:nowrap;padding:0 14px 0 calc(var(--gw,40px) + 8px);cursor:pointer;will-change:transform,opacity}
.tea-row .t{opacity:.35;width:100px;flex-shrink:0;font-size:11px}
.tea-row .s{opacity:.5;width:58px;flex-shrink:0;font-size:11px}
.tea-row .p{width:92px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;font-size:11px}
.tea-row .m{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.tea-row .o{opacity:.32;font-size:10px;max-width:150px;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.tea-row .g{border:1px solid #6a5a2a;color:#ffd37a;border-radius:3px;padding:0 6px;font-size:10px;flex-shrink:0}
.tea-row[data-k=error] .m{color:#ff8f8f}
.tea-row[data-k=warn] .m{color:#ffd37a}
.tea-row[data-k=merge] .m{color:#fff}
.tea-row[data-k=call] .m,.tea-row[data-k=event] .m,.tea-row[data-k=net] .m{opacity:.6}
.tea-row.f{background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,0) 70%)}
.tea-row.sel{box-shadow:inset 2px 0 #fff}
#tea-side{width:420px;border-left:1px solid #161616;display:flex;flex-direction:column;flex-shrink:0;position:relative;min-width:0}
#tea-side.wide{width:70vw}
#tea-grip{position:absolute;left:-3px;top:0;bottom:0;width:7px;cursor:col-resize;z-index:5}
#tea-tabs{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid #161616;overflow-x:auto;flex-shrink:0;scrollbar-width:none}
#tea-tabs button{padding:2px 8px;flex-shrink:0}
#tea-body{flex:1;overflow-y:auto;padding:12px 14px;scrollbar-width:thin;scrollbar-color:#222 #000;overscroll-behavior:contain;min-height:0}
.tea-panel{display:none}
.tea-panel.on{display:block}
.tea-sec{margin-bottom:16px}
.tea-h{font-size:10px;letter-spacing:.12em;opacity:.55;margin:10px 0 6px;display:flex;justify-content:space-between;align-items:center;gap:6px;text-transform:lowercase}
.tea-h button{padding:0 6px;font-size:10px}
.tea-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tea-card{border:1px solid #1c1c1c;border-radius:3px;padding:6px 8px;background:#050505;min-width:0}
.tea-card b{display:block;font-size:15px;font-weight:normal}
.tea-card span{font-size:10px;opacity:.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.tea-chart{margin-bottom:10px}
.tea-chart .hd{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-bottom:2px;gap:6px}
.tea-chart .hd span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-chart .hd u{text-decoration:none;cursor:pointer;opacity:.6}
.tea-chart canvas{width:100%;height:56px;display:block;border:1px solid #131313;border-radius:2px}
.tea-bar{display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:3px}
.tea-bar .nm{width:82px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-bar .tr{flex:1;height:5px;background:#0d0d0d;border-radius:3px;overflow:hidden}
.tea-bar .fl{height:100%;transition:width .35s ease;width:0}
.tea-bar .ct{width:38px;text-align:right;opacity:.5}
.tea-ibar{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.tea-sub{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.tea-sub button{padding:1px 7px;font-size:11px}
.tea-kv{display:grid;grid-template-columns:104px 1fr;gap:3px 10px;font-size:11px;margin-bottom:10px}
.tea-kv>:nth-child(odd){opacity:.45}
.tea-kv>:nth-child(even){word-break:break-word;user-select:text;-webkit-user-select:text}
.tea-code{background:#050505;border:1px solid #181818;border-radius:3px;padding:8px;margin:0 0 8px;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto;user-select:text;-webkit-user-select:text;tab-size:2}
.tea-dim{opacity:.5}
.tea-link{cursor:pointer;text-decoration:underline;text-decoration-color:#444}
.tea-link:hover{text-decoration-color:#fff}
.tea-fr{display:flex;gap:8px;padding:2px 4px;cursor:pointer;font-size:11px;border-radius:2px}
.tea-fr:hover{background:#0c0c0c}
.tea-fr.int{opacity:.3}
.tea-fr .i{width:20px;opacity:.4;flex-shrink:0}
.tea-fr .fn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-fr .fl{opacity:.55;flex-shrink:0}
.tea-sl{display:flex;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre;tab-size:1;user-select:text;-webkit-user-select:text}
.tea-sl .g{width:44px;text-align:right;padding-right:10px;opacity:.35;flex-shrink:0}
.tea-sl.hit{background:rgba(255,211,122,.12)}
.tea-sl.caret{color:#ffd37a}
.tea-src{background:#050505;border:1px solid #181818;border-radius:3px;padding:6px 0;overflow-x:auto;margin-bottom:8px}
.tea-df{font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;padding:0 6px;user-select:text;-webkit-user-select:text}
.tea-df.p{background:rgba(110,220,130,.12);color:#9ef0ae}
.tea-df.m{background:rgba(255,100,100,.12);color:#ff9d9d}
.tea-df.s{opacity:.4;text-align:center}
.tea-tbl{margin-bottom:12px}
.tea-tbl table{width:100%;border-collapse:collapse;font-size:11px}
.tea-tbl th{text-align:left;font-weight:normal;opacity:.5;cursor:pointer;padding:3px 6px;border-bottom:1px solid #1a1a1a;white-space:nowrap;position:sticky;top:-12px;background:#000}
.tea-tbl td{padding:3px 6px;border-bottom:1px solid #0e0e0e;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-tbl tr:hover td{background:#0b0b0b;cursor:pointer}
.tea-tbl input{width:100%;margin-bottom:6px}
.tea-cout{background:#050505;border:1px solid #181818;border-radius:3px;padding:8px;height:260px;overflow:auto;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;margin-bottom:6px;user-select:text;-webkit-user-select:text}
.tea-cout .in{opacity:.55}
.tea-cout .err{color:#ff8f8f}
.tea-in{width:100%}
.tea-w{display:flex;gap:6px;font-size:11px;margin-bottom:3px}
.tea-w .e{opacity:.6;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-w .v{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tea-w u{cursor:pointer;text-decoration:none;opacity:.5}
@media (max-width:760px){
#tea-sidebtn{display:inline-block}
#tea-side{position:absolute;left:0;right:0;bottom:0;width:auto!important;height:62%;background:#000;border-top:1px solid #222;border-left:0;display:none;z-index:3}
#tea.side #tea-side{display:flex}
#tea-grip{display:none}
.tea-row .s,.tea-row .t,.tea-row .o{display:none}
.tea-row .p{width:70px}
}`;
			document.head.appendChild(s);
		}

		function build() {
			injectStyle();
			root = mk('div');
			root.id = 'tea';
			root.innerHTML =
				'<div id="tea-top"><span class="ttl">tea</span><span class="sub" id="tea-sub"></span><input id="tea-q" placeholder="search: text lane:x src:x kind:x key:x origin:x -not /regex/" spellcheck="false" autocomplete="off"><span class="sp"></span><button id="tea-rec">pause</button><button id="tea-now">now</button><button id="tea-sidebtn">panel</button><button id="tea-wide">widen</button><button id="tea-exp">export</button><button id="tea-clr">clear</button><button id="tea-x">close</button></div>' +
				'<div id="tea-leg"></div>' +
				'<div id="tea-main"><div id="tea-scroll" tabindex="-1"><div id="tea-stage"><canvas id="tea-cv"></canvas><div id="tea-rows"></div></div><div id="tea-spacer"></div></div>' +
				'<div id="tea-side"><div id="tea-grip"></div><div id="tea-tabs"></div><div id="tea-body"></div></div></div>';
			document.body.appendChild(root);
			const q = (s) => root.querySelector(s);
			scroll = q('#tea-scroll');
			stage = q('#tea-stage');
			cv = q('#tea-cv');
			ctx = cv.getContext('2d');
			rowsEl = q('#tea-rows');
			spacer = q('#tea-spacer');
			side = q('#tea-side');
			legEl = q('#tea-leg');
			subEl = q('#tea-sub');
			qEl = q('#tea-q');
			tabsEl = q('#tea-tabs');
			bodyEl = q('#tea-body');
			recBtn = q('#tea-rec');

			for (const name of TABS) {
				const b = mk('button', '', name);
				b.dataset.tab = name;
				b.addEventListener('click', () => setTab(name));
				tabsEl.appendChild(b);
				const p = mk('div', 'tea-panel');
				bodyEl.appendChild(p);
				panels[name] = p;
			}
			buildStatsPanel();
			inspEl = panels.inspect;
			buildProfile();
			buildKeys();
			buildNet();
			buildVars();
			buildConsole();
			buildBreaks();

			q('#tea-x').addEventListener('click', closeUI);
			q('#tea-now').addEventListener('click', () =>
				scroll.scrollTo({ top: 0, behavior: 'smooth' })
			);
			q('#tea-sidebtn').addEventListener('click', () => root.classList.toggle('side'));
			q('#tea-wide').addEventListener('click', () => {
				side.classList.toggle('wide');
				side.style.width = '';
				resizeAll();
			});
			q('#tea-exp').addEventListener('click', exportJSON);
			q('#tea-clr').addEventListener('click', clearAll);
			recBtn.addEventListener('click', () => {
				recording = !recording;
				recBtn.textContent = recording ? 'pause' : 'resume';
				recBtn.classList.toggle('on', !recording);
			});
			qEl.addEventListener('input', () => {
				clearTimeout(qTimer);
				qTimer = setTimeout(() => {
					query = qEl.value.trim();
					preds = parseQuery(query);
					rebuildView();
				}, 180);
			});
			scroll.addEventListener('scroll', schedule, { passive: true });
			window.addEventListener('resize', () => {
				if (isOpen) resizeAll();
			});
			rowsEl.addEventListener('click', (e) => {
				const r = e.target.closest('.tea-row');
				if (!r) return;
				selectCommit(Number(r.dataset.seq), false);
				if (window.innerWidth < 760) root.classList.add('side');
			});
			const grip = q('#tea-grip');
			grip.addEventListener('pointerdown', (e) => {
				const x0 = e.clientX;
				const w0 = side.offsetWidth;
				grip.setPointerCapture(e.pointerId);
				side.classList.remove('wide');
				const mv = (ev) => {
					side.style.width =
						clamp(w0 + (x0 - ev.clientX), 260, Math.round(window.innerWidth * 0.8)) + 'px';
					resizeAll();
				};
				const up = () => {
					grip.removeEventListener('pointermove', mv);
					grip.removeEventListener('pointerup', up);
				};
				grip.addEventListener('pointermove', mv);
				grip.addEventListener('pointerup', up);
			});
			window.addEventListener(
				'keydown',
				(e) => {
					if (!isOpen) return;
					const tg = e.target;
					const typing =
						tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT');
					if (e.key === 'Escape') {
						e.preventDefault();
						if (typing) tg.blur();
						else closeUI();
						e.stopPropagation();
						return;
					}
					if (typing) return;
					e.stopPropagation();
					if (e.key === 'j') moveSel(-1);
					else if (e.key === 'k') moveSel(1);
					else if (e.key === 'g') scroll.scrollTo({ top: 0, behavior: 'smooth' });
					else if (e.key === 'G') scroll.scrollTo({ top: spacer.offsetHeight, behavior: 'smooth' });
					else if (e.key === '/') {
						e.preventDefault();
						qEl.focus();
					} else if (/^[1-8]$/.test(e.key)) setTab(TABS[Number(e.key) - 1]);
				},
				true
			);
			built = true;
			setTab('stats');
		}

		function resizeAll() {
			size();
			computeGeom();
			schedule();
			drawCharts(1, curT);
		}

		function setTab(name) {
			tab = name;
			tabsEl
				.querySelectorAll('button')
				.forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
			for (const k in panels) panels[k].classList.toggle('on', k === name);
			refreshTab();
		}

		function refreshTab() {
			if (!isOpen && built && tab !== 'stats') return;
			if (tab === 'stats') {
				refreshCards(false);
				sideUpdate();
			} else if (tab === 'inspect') {
				if (inspDirty || !inspEl.firstChild) renderInspector();
			} else if (tables[tab]) tables[tab].forEach((t) => t.refresh());
			else if (tab === 'console') refreshWatches();
			else if (tab === 'breaks') renderBreaks();
		}

		function parseQuery(q) {
			const out = [];
			for (const raw of q.split(/\s+/).filter(Boolean)) {
				let neg = false;
				let t = raw;
				if (t[0] === '-' && t.length > 1) {
					neg = true;
					t = t.slice(1);
				}
				let f;
				const m = t.match(/^(lane|src|kind|key|origin|tag|via):(.+)$/i);
				if (m) {
					const k = m[1].toLowerCase() === 'origin' ? 'org' : m[1].toLowerCase();
					const v = m[2].toLowerCase();
					f = (c) =>
						String(c[k] || '')
							.toLowerCase()
							.indexOf(v) >= 0;
				} else if (/^\/.+\/$/.test(t)) {
					let re = null;
					try {
						re = new RegExp(t.slice(1, -1), 'i');
					} catch (_) {}
					f = re ? (c) => re.test(c.msg + ' ' + c.lane + ' ' + c.key) : () => true;
				} else {
					const v = t.toLowerCase();
					f = (c) =>
						(c.msg + ' ' + c.lane + ' ' + c.sha + ' ' + c.tag + ' ' + c.key)
							.toLowerCase()
							.indexOf(v) >= 0;
				}
				out.push(neg ? (c) => !f(c) : f);
			}
			return out;
		}

		function passes(c) {
			if (hiddenL.has(c.lane) || hiddenS.has(c.src)) return false;
			for (const p of preds) if (!p(c)) return false;
			return true;
		}

		function rebuildView() {
			V = [];
			laneV = new Map();
			for (const c of C) {
				if (!passes(c)) continue;
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
		const selCommit = () => (sel != null ? C[sel - base] : null);

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
			const el = mk('div', 'tea-row');
			const t = mk('span', 't');
			const s = mk('span', 's');
			const p = mk('span', 'p');
			const m = mk('span', 'm');
			const o = mk('span', 'o');
			const g = mk('span', 'g');
			el.append(t, s, p, m, o, g);
			return { el, t, s, p, m, o, g, v: -1, c: null, head: null };
		}

		function fillRow(r, c) {
			r.c = c;
			r.v = c._v;
			r.t.textContent = fmtTime(c.ts);
			r.s.textContent = c.sha;
			r.p.style.color = laneColor(c.lane);
			r.m.textContent = c.msg + (c.n > 1 ? '  x' + c.n : '');
			r.o.textContent = c.org ? c.org.split(' @ ').pop() : '';
			r.g.textContent = c.tag;
			r.g.style.display = c.tag ? '' : 'none';
			r.el.dataset.seq = c.seq;
			r.el.dataset.k = c.kind;
			r.head = null;
		}

		function jumpTo(seq) {
			const k = lowerBound(V, seq);
			if (V[k] !== seq) return false;
			const d = V.length - 1 - k;
			scroll.scrollTo({
				top: Math.max(0, d * ROW + padTopPx + ROW / 2 - focusY),
				behavior: 'smooth',
			});
			return true;
		}

		function selectCommit(seq, jump) {
			sel = seq;
			inspDirty = true;
			setTab('inspect');
			if (jump) jumpTo(seq);
			schedule();
		}

		function moveSel(delta) {
			if (!V.length) return;
			let k;
			if (sel != null) {
				k = lowerBound(V, sel);
				if (V[k] !== sel)
					k = V.length - 1 - (focusSeq != null ? V.length - 1 - lowerBound(V, focusSeq) : 0);
			} else k = lowerBound(V, focusSeq == null ? V[V.length - 1] : focusSeq);
			k = clamp(k + delta, 0, V.length - 1);
			selectCommit(V[k], true);
		}

		function render() {
			raf = 0;
			if (!isOpen) return;
			if (inspDirty && tab === 'inspect') renderInspector();
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
				const big = seq === focusSeq || seq === sel ? 1.4 : 1;
				const rad =
					(c.kind === 'merge' ? 5.5 : c.kind === 'tag' ? 5 : c.kind === 'call' ? 3 : 4) *
					(0.5 + 0.5 * a) *
					big;
				ctx.globalAlpha = a;
				if (seq === focusSeq || seq === sel) {
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

		function buildStatsPanel() {
			const p = panels.stats;
			p.innerHTML =
				'<div class="tea-h"><span id="tea-at"></span></div><div class="tea-cards" id="tea-cards"></div>' +
				'<div class="tea-h"><span>charts</span><select id="tea-add"></select></div><div id="tea-charts"></div>' +
				'<div class="tea-h"><span>lanes up to this point</span></div><div id="tea-bars"></div>';
			atEl = p.querySelector('#tea-at');
			cardsEl = p.querySelector('#tea-cards');
			chartsEl = p.querySelector('#tea-charts');
			barsEl = p.querySelector('#tea-bars');
			addEl = p.querySelector('#tea-add');
			addEl.addEventListener('change', () => {
				if (addEl.value && !charts.some((c) => c.name === addEl.value)) {
					makeChart(addEl.value);
					drawCharts(1, curT);
				}
				addEl.value = '';
			});
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
					const el = mk('div', 'tea-card');
					const b = mk('b', '', '–');
					const l = mk('span', '', name.replace(/^(ls|var):/, ''));
					l.title = name;
					el.append(b, l);
					cardsEl.appendChild(el);
					cards.set(name, { el, val: b, cur: null, tgt: null, shown: '' });
				}
			}
			if (optCount !== series.size) {
				optCount = series.size;
				addEl.textContent = '';
				const o0 = mk('option', '', '+ add');
				o0.value = '';
				addEl.appendChild(o0);
				Array.from(series.keys())
					.sort()
					.forEach((x) => {
						const o = mk('option', '', x.replace(/^(ls|var):/, ''));
						o.value = x;
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
			const wrap = mk('div', 'tea-chart');
			const hd = mk('div', 'hd');
			const nm = mk('span', '', name.replace(/^(ls|var):/, ''));
			const val = mk('span');
			const x = mk('u', '', '×');
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
			if (tab !== 'stats') return;
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
				const ch = mk('span', 'tea-chip' + (hiddenL.has(l) ? ' off' : ''));
				const i = mk('i');
				i.style.background = laneColor(l);
				const t = mk('span', '', l);
				const n = mk('em', '', String(laneCount.get(l) || 0));
				ch.dataset.lane = l;
				ch.append(i, t, n);
				ch.addEventListener('click', (ev) => toggle(hiddenL, l, ev));
				legEl.appendChild(ch);
			}
			legEl.appendChild(mk('span', 'tea-sep'));
			for (const s of SRCS) {
				const ch = mk('span', 'tea-chip src' + (hiddenS.has(s) ? ' off' : ''), s);
				ch.addEventListener('click', (ev) => toggle(hiddenS, s, ev));
				legEl.appendChild(ch);
			}
		}

		function updateLegendCounts() {
			legEl.querySelectorAll('.tea-chip[data-lane]').forEach((ch) => {
				const em = ch.querySelector('em');
				const v = String(laneCount.get(ch.dataset.lane) || 0);
				if (em && em.textContent !== v) em.textContent = v;
			});
		}

		function buildBars() {
			barsEl.textContent = '';
			bars.clear();
			for (const l of LV) {
				const row = mk('div', 'tea-bar');
				const nm = mk('span', 'nm', l);
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

		function sideUpdate() {
			if (!built) return;
			const fc = focusSeq == null || focusSeq < 0 ? null : C[focusSeq - base];
			subEl.textContent =
				// im gonna get carpal
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
				' fns · ' +
				timers.size +
				' timers';
			if (!fc) {
				atEl.textContent = 'no commits yet';
				return;
			}
			curT = fc.ts;
			atEl.textContent = 'state at ' + fmtTime(curT);
			if (tab !== 'stats') return;
			for (const [name, k] of cards) k.tgt = valueAt(name, curT);
			if (!twRaf) twRaf = requestAnimationFrame(tween);
			drawCharts(1, curT);
			updateBars();
		}

		function copyText(t) {
			const done = () => {};
			if (navigator.clipboard && navigator.clipboard.writeText)
				navigator.clipboard.writeText(t).then(done, fallback);
			else fallback();
			function fallback() {
				const ta = document.createElement('textarea');
				ta.value = t;
				ta.style.cssText = 'position:fixed;opacity:0';
				document.body.appendChild(ta);
				ta.select();
				try {
					document.execCommand('copy');
				} catch (_) {}
				ta.remove();
			}
		}

		function pretty(t) {
			if (t == null) return '(none)';
			if (typeof t !== 'string') t = inspect(t);
			const s = t.trim();
			if (s[0] === '{' || s[0] === '[') {
				try {
					return JSON.stringify(JSON.parse(s), null, 1).slice(0, 60000);
				} catch (_) {}
			}
			return t.slice(0, 60000);
		}

		function inspect(v, d, seen) {
			d = d || 0;
			seen = seen || new WeakSet();
			const t = typeof v;
			if (v === null) return 'null';
			if (t === 'undefined') return 'undefined';
			if (t === 'string') return d ? JSON.stringify(v.length > 80 ? v.slice(0, 80) + '…' : v) : v;
			if (t === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
			if (t !== 'object') return String(v);
			if (seen.has(v)) return '[circular]';
			seen.add(v);
			if (d > 3) return Array.isArray(v) ? '[…]' : '{…}';
			if (v instanceof Map)
				return (
					'Map(' +
					v.size +
					') {' +
					Array.from(v)
						.slice(0, 10)
						.map(([k, x]) => inspect(k, d + 1, seen) + ' => ' + inspect(x, d + 1, seen))
						.join(', ') +
					'}'
				);
			if (v instanceof Set)
				return (
					'Set(' +
					v.size +
					') {' +
					Array.from(v)
						.slice(0, 10)
						.map((x) => inspect(x, d + 1, seen))
						.join(', ') +
					'}'
				);
			if (typeof Node !== 'undefined' && v instanceof Node)
				return '<' + String(v.nodeName || 'node').toLowerCase() + (v.id ? '#' + v.id : '') + '>';
			if (v instanceof Error) return String(v.stack || v);
			if (Array.isArray(v))
				return (
					'[' +
					v
						.slice(0, 30)
						.map((x) => inspect(x, d + 1, seen))
						.join(', ') +
					(v.length > 30 ? ', …' + (v.length - 30) + ' more' : '') +
					']'
				);
			const ks = Object.keys(v);
			return (
				'{' +
				ks
					.slice(0, 30)
					.map((k) => k + ': ' + inspect(v[k], d + 1, seen))
					.join(', ') +
				(ks.length > 30 ? ', …' : '') +
				'}'
			);
		}

		function tableWidget(cols, getRows, onRow, defSort) {
			const wrap = mk('div', 'tea-tbl');
			const inp = mk('input');
			inp.placeholder = 'filter...';
			const tbl = mk('table');
			wrap.append(inp, tbl);
			let sort = defSort || 0;
			let dir = -1;
			function refresh() {
				let rows = getRows();
				const f = inp.value.toLowerCase();
				if (f) rows = rows.filter((r) => String(r[0]).toLowerCase().indexOf(f) >= 0);
				rows.sort((a, b) => {
					const x = a[sort];
					const y = b[sort];
					return (
						(typeof x === 'number' && typeof y === 'number'
							? x - y
							: String(x).localeCompare(String(y))) * dir
					);
				});
				tbl.textContent = '';
				const hr = mk('tr');
				cols.forEach((c, i) => {
					const th = mk('th', '', c.l + (i === sort ? (dir < 0 ? ' ↓' : ' ↑') : ''));
					th.addEventListener('click', () => {
						if (sort === i) dir = -dir;
						else {
							sort = i;
							dir = -1;
						}
						refresh();
					});
					hr.appendChild(th);
				});
				tbl.appendChild(hr);
				rows.slice(0, 300).forEach((r) => {
					const tr = mk('tr');
					cols.forEach((c, i) => tr.appendChild(mk('td', '', c.f ? c.f(r[i], r) : String(r[i]))));
					if (onRow) tr.addEventListener('click', () => onRow(r));
					tbl.appendChild(tr);
				});
			}
			inp.addEventListener('input', refresh);
			return { el: wrap, refresh };
		}

		function lastCommitWhere(fn) {
			for (let i = C.length - 1; i >= 0; i--) if (fn(C[i])) return C[i];
			return null;
		}

		function selectLast(fn, label) {
			const c = lastCommitWhere(fn);
			if (c) selectCommit(c.seq, true);
			else if (keyDetail) keyDetail.textContent = 'no recorded commits for ' + label;
		}

		function buildProfile() {
			const p = panels.profile;
			p.appendChild(mk('div', 'tea-h', 'functions (every wrapped call, timed)'));
			const f = tableWidget(
				[
					{ l: 'function' },
					{ l: 'calls', f: fmt },
					{ l: 'total ms', f: (v) => fmt(Math.round(v)) },
					{ l: 'avg ms', f: (v) => v.toFixed(2) },
					{ l: 'max ms', f: (v) => v.toFixed(1) },
					{ l: 'errors', f: fmt },
				],
				() => Array.from(fnStats, ([k, s]) => [k, s.n, s.ms, s.n ? s.ms / s.n : 0, s.max, s.err]),
				(r) => selectLast((c) => c.src === 'fn' && c.key === r[0], r[0]),
				2
			);
			p.appendChild(f.el);
			p.appendChild(mk('div', 'tea-h', 'intervals (and who created them)'));
			const t = tableWidget(
				[
					{ l: 'created at' },
					{ l: 'every ms', f: fmt },
					{ l: 'runs', f: fmt },
					{ l: 'total ms', f: (v) => fmt(Math.round(v)) },
					{ l: 'max ms', f: (v) => v.toFixed(1) },
				],
				() => Array.from(timers.values()).map((r) => [r.site, r.ms, r.runs, r.total, r.max]),
				null,
				3
			);
			p.appendChild(t.el);
			p.appendChild(mk('div', 'tea-h', 'events'));
			const e = tableWidget(
				[{ l: 'event' }, { l: 'count', f: fmt }],
				() => Array.from(evStats, ([k, v]) => [k, v]),
				(r) => selectLast((c) => c.src === 'event' && c.key === r[0], r[0]),
				1
			);
			p.appendChild(e.el);
			tables.profile = [f, t, e];
		}

		function buildKeys() {
			const p = panels.keys;
			const t = tableWidget(
				[
					{ l: 'key' },
					{ l: 'size', f: (v) => fmt(v) + ' b' },
					{ l: 'writes', f: fmt },
					{ l: 'no-ops', f: fmt },
					{ l: 'last write', f: (v) => (v ? fmtTime(v) : '-') },
					{ l: 'top writer' },
				],
				() => {
					const keys = new Set(Array.from(shadow.keys()).concat(Array.from(keyStats.keys())));
					return Array.from(keys, (k) => {
						const s = keyStats.get(k);
						let top = '';
						let tn = 0;
						if (s) for (const [o, n] of s.sites) if (n > tn) ((top = o), (tn = n));
						return [
							k,
							shadow.has(k) ? shadow.get(k).length : 0,
							s ? s.w : 0,
							s ? s.noop : 0,
							s ? s.last : 0,
							top,
						];
					});
				},
				(r) => {
					const raw = shadow.get(r[0]);
					keyDetail.textContent =
						raw == null
							? '(key does not exist right now)'
							: r[0] + ' =\n' + pretty(SENS.test(r[0]) ? '(redacted)' : raw).slice(0, 6000);
					selectLast((c) => c.src === 'ls' && c.key === r[0], r[0]);
					setTab('keys');
				},
				2
			);
			p.appendChild(t.el);
			keyDetail = mk(
				'pre',
				'tea-code',
				'click a key to see its current value and jump to its latest commit.\n"no-ops" are writes that stored the exact same value. Somebody is being wasteful.'
			);
			p.appendChild(keyDetail);
			tables.keys = [t];
		}

		function buildNet() {
			const t = tableWidget(
				[
					{ l: 'endpoint' },
					{ l: 'calls', f: fmt },
					{ l: 'errors', f: fmt },
					{ l: 'avg ms', f: (v) => v.toFixed(0) },
					{ l: 'max ms', f: (v) => v.toFixed(0) },
					{ l: 'last' },
				],
				() =>
					Array.from(netStats, ([k, s]) => [k, s.n, s.err, s.n ? s.ms / s.n : 0, s.max, s.last]),
				(r) => selectLast((c) => c.src === 'net' && c.key === r[0], r[0]),
				1
			);
			panels.net.appendChild(t.el);
			tables.net = [t];
		}

		function buildVars() {
			const t = tableWidget(
				[
					{ l: 'variable' },
					{ l: 'value' },
					{ l: 'changes', f: fmt },
					{ l: 'state' },
					{ l: 'scope' },
				],
				() =>
					Array.from(probes, ([k, p]) => {
						const v = p.sig.slice(2);
						return [
							k,
							p.sig[0] === 'a' ? '[' + v + ']' : p.sig[0] === 'm' ? 'size ' + v : v.slice(0, 60),
							p.n,
							p.noisy ? 'noisy' : '',
							p.lex ? 'lexical' : 'window',
						];
					}),
				(r) => {
					addWatch(r[0]);
					setTab('console');
				},
				2
			);
			panels.vars.appendChild(t.el);
			tables.vars = [t];
		}

		function log(text, cls) {
			const d = mk('div', cls || '', text);
			consoleOut.appendChild(d);
			consoleOut.scrollTop = consoleOut.scrollHeight;
		}

		async function runCode(code) {
			log('> ' + code, 'in');
			try {
				window.$c = selCommit();
				window.$tea = api;
				let r = (0, eval)(code);
				if (r && typeof r.then === 'function') r = await r;
				log(inspect(r), 'out');
			} catch (e) {
				log(String(e && e.stack ? String(e.stack).split('\n').slice(0, 3).join('\n') : e), 'err');
			}
			defer(() =>
				addCommit({
					src: 'sys',
					lane: 'tea',
					kind: 'event',
					msg: 'console: ' + code.slice(0, 80),
					key: 'console',
					force: true,
				})
			);
		}

		function addWatch(expr) {
			if (!watches.some((w) => w.expr === expr)) watches.push({ expr, last: null });
			refreshWatches();
		}

		function evalWatch(expr) {
			try {
				return inspect(new Function('return (' + expr + ')')());
			} catch (e) {
				return 'error: ' + e.message;
			}
		}

		function refreshWatches() {
			if (!watchBox) return;
			watchBox.textContent = '';
			watches.forEach((w, i) => {
				const row = mk('div', 'tea-w');
				const e = mk('span', 'e', w.expr);
				const val = evalWatch(w.expr);
				const v = mk('span', 'v', val);
				if (w.last !== null && w.last !== val) v.style.color = '#ffd37a';
				w.last = val;
				const x = mk('u', '', '×');
				x.addEventListener('click', () => {
					watches.splice(i, 1);
					refreshWatches();
				});
				row.append(e, v, x);
				watchBox.appendChild(row);
			});
		}

		function buildConsole() {
			const p = panels.console;
			p.appendChild(mk('div', 'tea-h', 'watch'));
			watchBox = mk('div');
			p.appendChild(watchBox);
			p.appendChild(mk('div', 'tea-h', 'console ($c is the selected commit, $tea is this tool)'));
			consoleOut = mk('div', 'tea-cout');
			log(
				'global scope. try: points, $tea.stats(), $c, localStorage.length. add a watch with: watch("points")',
				'in'
			);
			const inp = mk('input', 'tea-in');
			inp.placeholder = 'javascript, enter to run';
			let hi = -1;
			inp.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					hi = Math.min(hi + 1, cmdHist.length - 1);
					inp.value = cmdHist[cmdHist.length - 1 - hi] || '';
				} else if (e.key === 'ArrowDown') {
					e.preventDefault();
					hi = Math.max(hi - 1, -1);
					inp.value = hi < 0 ? '' : cmdHist[cmdHist.length - 1 - hi] || '';
				} else if (e.key === 'Enter' && inp.value.trim()) {
					const code = inp.value;
					cmdHist.push(code);
					hi = -1;
					inp.value = '';
					const w = code.match(/^\s*watch\((['"`])(.+)\1\)\s*$/);
					if (w) addWatch(w[2]);
					else runCode(code);
				}
			});
			p.append(consoleOut, inp);
		}

		function renderBreaks() {
			bpList.textContent = '';
			bps.forEach((b, i) => {
				const row = mk('div', 'tea-w');
				const on = mk('button', b.on ? 'on' : '', b.on ? 'on' : 'off');
				on.addEventListener('click', () => {
					b.on = !b.on;
					metaDirty = true;
					renderBreaks();
				});
				const e = mk('span', 'e', b.kind + ' /' + b.src + '/');
				const h = mk('span', 'v', b.hits + ' hits');
				const x = mk('u', '', '×');
				x.addEventListener('click', () => {
					bps.splice(i, 1);
					metaDirty = true;
					renderBreaks();
				});
				row.append(on, e, h, x);
				bpList.appendChild(row);
			});
			if (!bps.length) bpList.appendChild(mk('div', 'tea-dim', 'no breakpoints yet'));
		}

		function buildBreaks() {
			const p = panels.breaks;
			p.appendChild(mk('div', 'tea-h', 'breakpoints'));
			p.appendChild(
				mk(
					'div',
					'tea-dim',
					'when a matching write, call, request, store operation, or event happens, tea runs a debugger statement. Open your browser devtools first, then step out once to land in the code that did it.'
				)
			);
			const row = mk('div', 'tea-w');
			row.style.marginTop = '8px';
			const sel2 = mk('select');
			['ls', 'fn', 'net', 'idb', 'event'].forEach((k) => {
				const o = mk('option', '', k);
				o.value = k;
				sel2.appendChild(o);
			});
			const inp = mk('input');
			inp.placeholder = 'regex, e.g. ^shopPoints$';
			inp.style.flex = '1';
			const add = mk('button', '', 'add');
			add.addEventListener('click', () => {
				if (!inp.value) return;
				try {
					bps.push({
						kind: sel2.value,
						src: inp.value,
						re: new RegExp(inp.value, 'i'),
						on: true,
						hits: 0,
					});
					metaDirty = true;
					inp.value = '';
					renderBreaks();
				} catch (e) {
					inp.value = 'bad regex';
				}
			});
			row.append(sel2, inp, add);
			p.appendChild(row);
			bpList = mk('div');
			bpList.style.marginTop = '10px';
			p.appendChild(bpList);
			renderBreaks();
		}

		function kv(parent, pairs) {
			const g = mk('div', 'tea-kv');
			for (const [k, v] of pairs) {
				g.appendChild(mk('div', '', k));
				if (v instanceof Node) g.appendChild(v);
				else g.appendChild(mk('div', '', v == null || v === '' ? '-' : String(v)));
			}
			parent.appendChild(g);
		}

		function linkTo(c, text) {
			const a = mk('span', 'tea-link', text || c.lane + ':' + c.sha);
			a.addEventListener('click', () => selectCommit(c.seq, true));
			return a;
		}

		function codeBlock(parent, title, text, copyable) {
			const h = mk('div', 'tea-h');
			h.appendChild(mk('span', '', title));
			if (copyable !== false) {
				const b = mk('button', '', 'copy');
				b.addEventListener('click', () => copyText(String(text)));
				h.appendChild(b);
			}
			parent.appendChild(h);
			parent.appendChild(mk('pre', 'tea-code', pretty(text)));
		}

		function renderSnippet(box, url, ln, col) {
			box.textContent = 'loading source...';
			getSource(url).then((t) => {
				box.textContent = '';
				if (!t) {
					box.textContent = 'source not available (cross-origin, inline, or unreachable)';
					return;
				}
				let L = srcLines.get(url);
				if (!L) {
					L = t.split('\n');
					srcLines.set(url, L);
				}
				const a = Math.max(1, ln - 7);
				const b = Math.min(L.length, ln + 7);
				for (let i = a; i <= b; i++) {
					const row = mk('div', 'tea-sl' + (i === ln ? ' hit' : ''));
					row.append(
						mk('span', 'g', String(i)),
						mk('span', 'c', L[i - 1].length > 300 ? L[i - 1].slice(0, 300) + '…' : L[i - 1])
					);
					box.appendChild(row);
					if (i === ln && col > 0) {
						const cr = mk('div', 'tea-sl caret');
						cr.append(
							mk('span', 'g', ''),
							mk('span', 'c', ' '.repeat(Math.min(col - 1, 300)) + '^')
						);
						box.appendChild(cr);
					}
				}
			});
		}

		function renderInspector() {
			inspDirty = false;
			const token = ++inspToken;
			const c = selCommit();
			inspEl.textContent = '';
			if (!c) {
				inspEl.appendChild(
					mk(
						'div',
						'tea-dim',
						'click a commit row (or press j / k) to inspect it. everything tea knows about it shows up here, including the javascript that triggered it.'
					)
				);
				return;
			}
			const bar = mk('div', 'tea-ibar');
			const btn = (label, fn) => {
				const b = mk('button', '', label);
				b.addEventListener('click', fn);
				bar.appendChild(b);
			};
			btn('← newer', () => moveSel(1));
			btn('older →', () => moveSel(-1));
			btn('find in graph', () => jumpTo(c.seq));
			btn('copy json', async () =>
				copyText(JSON.stringify(Object.assign(strip(c), { blob: await getBlob(c.seq) }), null, 1))
			);
			if (c.src === 'ls' && c.key) btn('restore before value', restoreBefore);
			inspEl.appendChild(bar);
			const head = mk('div');
			head.style.cssText = 'margin-bottom:8px;word-break:break-word';
			head.style.color = laneColor(c.lane);
			head.textContent = c.msg + (c.n > 1 ? '  (x' + c.n + ')' : '');
			inspEl.appendChild(head);
			const sub = mk('div', 'tea-sub');
			const names = ['overview', 'stack', 'source', 'diff', 'data', 'related', 'history', 'json'];
			const body = mk('div');
			names.forEach((n) => {
				const b = mk('button', n === inspTab ? 'on' : '', n);
				b.addEventListener('click', () => {
					inspTab = n;
					renderInspector();
				});
				sub.appendChild(b);
			});
			inspEl.append(sub, body);
			if (inspTab === 'overview') inspOverview(c, body);
			else if (inspTab === 'stack') inspStack(c, body);
			else if (inspTab === 'source') inspSource(c, body);
			else if (inspTab === 'diff')
				getBlob(c.seq).then((b) => token === inspToken && inspDiff(c, b, body));
			else if (inspTab === 'data')
				getBlob(c.seq).then((b) => token === inspToken && inspData(c, b, body));
			else if (inspTab === 'related') inspRelated(c, body);
			else if (inspTab === 'history') inspHistory(c, body);
			else if (inspTab === 'json')
				getBlob(c.seq).then(
					(b) =>
						token === inspToken &&
						codeBlock(
							body,
							'commit + blob',
							JSON.stringify(Object.assign(strip(c), { blob: b }), null, 1)
						)
				);
		}

		async function restoreBefore() {
			const c = selCommit();
			if (!c) return;
			const b = await getBlob(c.seq);
			if (!b || b.before === undefined) return;
			if (typeof b.before === 'string' && /…\[truncated/.test(b.before)) {
				if (window.showAlert)
					window.showAlert(
						'the stored value was truncated, so restoring it would corrupt the key. aborting.'
					);
				return;
			}
			const msg =
				'write the previous value of ' +
				c.key +
				' back into localStorage? the game may overwrite it again.';
			const ok = window.showConfirm ? await window.showConfirm(msg, 'restore value') : confirm(msg);
			if (!ok) return;
			if (b.before === null) LSO.removeItem(c.key);
			else LSO.setItem(c.key, b.before);
		}

		function inspOverview(c, body) {
			const heapTxt = c.heap != null ? c.heap + ' mb' : '';
			const rel = Math.round((Date.now() - c.ts) / 1000);
			const mergeFrom = (c.inc || []).map((s) => C[s - base]).filter(Boolean);
			const mf = mk('div');
			mergeFrom.forEach((m, i) => {
				if (i) mf.appendChild(document.createTextNode('  '));
				mf.appendChild(linkTo(m));
			});
			const par = lastCommitWhere((x) => x.sha === c.parent && x.lane === c.lane);
			const sus = mk('div');
			(c.sus || []).forEach((s, i) => {
				if (i) sus.appendChild(document.createTextNode(', '));
				sus.appendChild(mk('span', '', s));
			});
			kv(body, [
				['commit', c.sha],
				['parent', par ? linkTo(par) : c.parent || '(root of lane)'],
				['lane', c.lane],
				['source / kind', c.src + ' / ' + c.kind],
				['key', c.key],
				[
					'when',
					new Date(c.ts).toISOString() +
						'  (' +
						(rel < 120 ? rel + 's ago' : Math.round(rel / 60) + 'm ago') +
						')',
				],
				['repeats', c.n > 1 ? c.n + 'x over ' + ((c.ts2 - c.ts) / 1000).toFixed(1) + 's' : 'once'],
				['triggered by', c.trig || '(not recorded)'],
				['origin', c.org || '(no stack for this commit)'],
				['called inside', c.via || '(top level)'],
				['likely culprits', c.sus && c.sus.length ? sus : '-'],
				['session', c.ses],
				['tab', c.heap != null ? 'js heap ' + heapTxt : '-'],
				['tag', c.tag],
				['merges from', mergeFrom.length ? mf : '-'],
			]);
			if (c.sites && Object.keys(c.sites).length > 1) {
				body.appendChild(mk('div', 'tea-h', 'all call sites that hit this commit'));
				const g = mk('div', 'tea-kv');
				for (const [s, n] of Object.entries(c.sites).sort((a, b) => b[1] - a[1])) {
					g.appendChild(mk('div', '', n + 'x'));
					g.appendChild(mk('div', '', s));
				}
				body.appendChild(g);
			}
			if (c.lines && c.lines.length) codeBlock(body, 'details', c.lines.join('\n'));
		}

		function inspStack(c, body) {
			if (!c.stack || !c.stack.length) {
				body.appendChild(
					mk(
						'div',
						'tea-dim',
						'no stack was captured. this commit was detected by polling, so the code that made the change is unknown.'
					)
				);
				if (c.sus && c.sus.length)
					body.appendChild(
						mk(
							'div',
							'',
							'wrapped functions that ran in the previous 1.5 seconds: ' + c.sus.join(', ')
						)
					);
				return;
			}
			body.appendChild(
				mk('div', 'tea-h', 'call stack, innermost first (click a frame to view its source)')
			);
			c.stack.forEach((f, i) => {
				const row = mk('div', 'tea-fr' + (f[4] ? ' int' : ''));
				row.append(
					mk('span', 'i', String(i)),
					mk('span', 'fn', f[0]),
					mk('span', 'fl', fileName(urls[f[1]]) + ':' + f[2] + ':' + f[3])
				);
				row.title = urls[f[1]];
				row.addEventListener('click', () => {
					srcFrame = i;
					inspTab = 'source';
					renderInspector();
				});
				body.appendChild(row);
			});
		}

		function inspSource(c, body) {
			if (!c.stack || !c.stack.length) {
				body.appendChild(
					mk('div', 'tea-dim', 'no stack, no source. polling cannot tell us who did it.')
				);
				return;
			}
			let idx = srcFrame;
			if (idx >= c.stack.length || !c.stack[idx]) idx = 0;
			if (idx === 0) {
				const k = c.stack.findIndex((f) => !f[4] && !WRAP_FRAME.test(f[0]));
				if (k > 0 && srcFrame === 0) idx = k;
			}
			const f = c.stack[idx];
			const sub = mk('div', 'tea-sub');
			c.stack.slice(0, 8).forEach((x, i) => {
				const b = mk('button', i === idx ? 'on' : '', i + ' ' + x[0].slice(0, 22));
				b.addEventListener('click', () => {
					srcFrame = i;
					renderInspector();
				});
				sub.appendChild(b);
			});
			body.appendChild(sub);
			body.appendChild(mk('div', 'tea-dim', urls[f[1]] + ':' + f[2] + ':' + f[3]));
			const box = mk('div', 'tea-src');
			body.appendChild(box);
			renderSnippet(box, urls[f[1]], f[2], f[3]);
		}

		function inspDiff(c, b, body) {
			if (!b || b.before === undefined) {
				body.appendChild(
					mk('div', 'tea-dim', 'this commit has no before / after values. check the data tab.')
				);
				return;
			}
			const a = pretty(b.before);
			const z = pretty(b.after);
			const d = lineDiff(a, z);
			if (!d) {
				body.appendChild(
					mk(
						'div',
						'tea-dim',
						'values are too large for a line diff. showing the structural diff instead.'
					)
				);
				const out = [];
				out.cap = 400;
				try {
					diffVal(JSON.parse(b.before), JSON.parse(b.after), c.key || 'value', out, 0);
				} catch (_) {}
				body.appendChild(mk('pre', 'tea-code', out.join('\n') || '(not json)'));
				return;
			}
			const box = mk('div', 'tea-src');
			d.forEach(([k, t]) =>
				box.appendChild(
					mk(
						'div',
						'tea-df ' + (k === '+' ? 'p' : k === '-' ? 'm' : k === '~' ? 's' : ''),
						(k === ' ' ? '  ' : k === '~' ? '' : k + ' ') + t
					)
				)
			);
			body.appendChild(box);
			if (c.n > 1)
				body.appendChild(
					mk(
						'div',
						'tea-dim',
						'this commit merged ' +
							c.n +
							' writes. the diff spans from the first old value to the latest new value.'
					)
				);
		}

		function inspData(c, b, body) {
			if (!b) {
				body.appendChild(mk('div', 'tea-dim', 'no payload stored for this commit.'));
				return;
			}
			if (b.kind === 'ls' || b.kind === 'var') {
				codeBlock(body, 'before', b.before);
				codeBlock(body, 'after', b.after);
			} else if (b.kind === 'fn') {
				kv(body, [['duration', b.ms != null ? b.ms + ' ms' : '-']]);
				codeBlock(body, 'arguments', b.args);
				codeBlock(body, 'result', b.result);
			} else if (b.kind === 'net') {
				const q = b.req || {};
				kv(body, [
					['request', (q.method || '') + ' ' + (q.url || '')],
					['query', q.query],
					['duration', b.ms + ' ms'],
					['status', b.res ? b.res.status + ' ' + (b.res.statusText || '') : '(pending or failed)'],
					['response type', b.res ? b.res.type + (b.res.redirected ? ' (redirected)' : '') : '-'],
					['response size', b.res && b.res.size != null ? fmt(b.res.size) + ' chars' : '-'],
				]);
				codeBlock(body, 'request headers', JSON.stringify(q.headers || {}, null, 1));
				codeBlock(
					body,
					'request body' + (q.body ? ' (' + fmt(q.body.size || 0) + ')' : ''),
					q.body ? q.body.preview : '(none)'
				);
				if (b.res) {
					codeBlock(body, 'response headers', JSON.stringify(b.res.headers || {}, null, 1));
					codeBlock(
						body,
						'response body',
						b.res.body == null ? '(still loading or not captured)' : b.res.body
					);
				}
			} else if (b.kind === 'idb') {
				if (b.key) kv(body, [['key', b.key]]);
				codeBlock(body, 'value', b.value);
			} else if (b.kind === 'event') {
				kv(body, [['type', b.type]]);
				codeBlock(body, 'detail', b.detail);
			} else if (b.kind === 'error') {
				codeBlock(body, 'message', b.message);
				if (b.stack) codeBlock(body, 'raw stack', b.stack);
			} else codeBlock(body, 'payload', JSON.stringify(b, null, 1));
		}

		function inspRelated(c, body) {
			const i = c.seq - base;
			const causes = [];
			const effects = [];
			for (let k = i - 1; k >= 0 && causes.length < 14 && c.ts - C[k].ts2 < 2500; k--)
				causes.push(C[k]);
			for (let k = i + 1; k < C.length && effects.length < 14 && C[k].ts - c.ts2 < 2500; k++)
				effects.push(C[k]);
			const list = (title, arr, sign) => {
				body.appendChild(mk('div', 'tea-h', title));
				if (!arr.length) body.appendChild(mk('div', 'tea-dim', 'nothing within 2.5 seconds'));
				arr.forEach((x) => {
					const row = mk('div', 'tea-fr');
					const dt = Math.round(sign * (x.ts - c.ts));
					row.append(
						mk('span', 'i', (dt > 0 ? '+' : '') + dt + 'ms'),
						mk('span', 'fn', x.lane + '  ' + x.msg),
						mk('span', 'fl', x.src)
					);
					row.style.color = laneColor(x.lane);
					row.addEventListener('click', () => selectCommit(x.seq, true));
					body.appendChild(row);
				});
			};
			list('just before (possible causes)', causes, 1);
			list('just after (possible effects)', effects, 1);
		}

		function inspHistory(c, body) {
			if (!c.key) {
				body.appendChild(mk('div', 'tea-dim', 'this commit has no key to group by.'));
				return;
			}
			const arr = C.filter((x) => x.key === c.key && x.src === c.src);
			body.appendChild(
				mk('div', 'tea-h', arr.length + ' commits for ' + c.key + ' (newest first)')
			);
			arr
				.slice(-80)
				.reverse()
				.forEach((x) => {
					const row = mk('div', 'tea-fr');
					row.append(
						mk('span', 'i', fmtTime(x.ts).slice(6)),
						mk('span', 'fn', x.msg),
						mk('span', 'fl', x.org ? x.org.split(' @ ').pop() : '')
					);
					if (x.seq === c.seq) row.style.background = '#111';
					row.addEventListener('click', () => selectCommit(x.seq, true));
					body.appendChild(row);
				});
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
			sideTimer = nSI.call(
				window,
				() => {
					if (!isOpen) return;
					updateLegendCounts();
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
						' fns · ' +
						timers.size +
						' timers';
					refreshTab();
				},
				1500
			);
			try {
				scroll.focus({ preventScroll: true });
			} catch (_) {}
			if (nRAF && !fpsOn) startFps();
		}

		let fpsOn = false;
		function startFps() {
			fpsOn = true;
			let frames = 0;
			let f0 = performance.now();
			const loop = () => {
				if (!isOpen) {
					fpsOn = false;
					return;
				}
				frames++;
				const t = performance.now();
				if (t - f0 >= 1000) {
					pushSeries('sys.fps', Math.round((frames * 1000) / (t - f0)));
					frames = 0;
					f0 = t;
				}
				nRAF(loop);
			};
			nRAF(loop);
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
			if (!passes(c)) return;
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

		function touch(c) {
			if (!isOpen) return;
			if (sel === c.seq) inspDirty = true;
			schedule();
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
				renderInspector();
			}
		}

		function dirtyView() {
			viewDirty = true;
			if (isOpen) rebuildView();
		}

		return {
			open: openUI,
			close: closeUI,
			added,
			touch,
			reset,
			dirtyView,
			select: (s) => selectCommit(s, true),
			addWatch,
		};
	}

	function exportJSON() {
		const blob = new Blob(
			[
				JSON.stringify({
					lanes,
					urls,
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
		a.download = 'tea.json';
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	async function clearAll() {
		const msg = 'wipe all tea history? this cannot be undone.';
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
		dirtyBlobs.clear();
		blobs.clear();
		touched.rev.clear();
		touched.sync.clear();
		pending = null;
		base = seqNext;
		if (db) {
			await idb(['commits', 'series', 'blobs'], 'readwrite', (tx) => {
				tx.objectStore('commits').clear();
				tx.objectStore('series').clear();
				tx.objectStore('blobs').clear();
			});
		}
		if (ui) ui.reset();
	}

	function mountSettings() {
		if (document.getElementById('teaSettingRow')) return true;
		const groups = Array.from(document.querySelectorAll('.settings-group'));
		const g =
			groups.find((x) => {
				const l = x.querySelector('.settings-group-label');
				return l && l.textContent.trim() === 'developer';
			}) || groups[groups.length - 1];
		if (!g) return false;
		const row = document.createElement('div');
		row.className = 'setting-row';
		row.id = 'teaSettingRow';
		row.innerHTML =
			'<div class="setting-info"><span class="setting-name">tea (beta)</span><span class="setting-desc">git-style graph and devtool for everything this game does</span></div><button class="setting-btn" id="teaOpenBtn">open</button>';
		g.appendChild(row);
		row.querySelector('#teaOpenBtn').addEventListener('click', () => ui.open());
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

	const api = {
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
					force: true,
				})
			),
		stats: () => ({
			commits: C.length,
			lanes: lanes.slice(),
			series: series.size,
			keys: shadow.size,
			vars: probes.size,
			fns: fnCount,
			timers: timers.size,
		}),
		export: exportJSON,
		commits: C,
		series,
		fnStats,
		keyStats,
		netStats,
		timers,
		blob: getBlob,
		select: (s) => ui.select(s),
		watch: (e) => ui.addWatch(e),
		bp: (kind, src) => {
			bps.push({ kind, src: String(src), re: new RegExp(src, 'i'), on: true, hits: 0 });
			metaDirty = true;
		},
	};
	window.Tea = api;

	installHooks();
	boot().catch((e) => nativeErr('[tea] boot failed', e));

	let tries = 0;
	const mountTimer = nSI.call(
		window,
		() => {
			if (mountSettings() || ++tries > 100) nCI.call(window, mountTimer);
		},
		400
	);
})();
// fuck you prettier
// You can probably tell why this is in staging
