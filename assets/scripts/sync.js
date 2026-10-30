'use strict';

(function () {
	const API = 'https://backup.authsrng.xyz/api/save';
	const LS = window.localStorage;
	const origSet = Storage.prototype.setItem;
	const origRemove = Storage.prototype.removeItem;
	const origGet = Storage.prototype.getItem;
	const Keys = window.SaveKeys;

	const META_KEY = '__sync_meta';
	const DEVICE_KEY = '__sync_device';
	const LOCK_NAME = 'authsrng-game-writer';
	const LEASE_KEY = '__game_lease';
	const PUSH_MIN_MS = 8000;
	const PUSH_DEBOUNCE_MS = 4000;
	const PUSH_MAX_WAIT_MS = 30000;
	const VOLATILE_PUSH_MS = 300000;
	const POLL_MS = 120000;
	const REQ_TIMEOUT_MS = 15000;
	const BOOT_TIMEOUT_MS = 9000;
	const MAX_FIELD_CHARS = 900000;

	const st = {
		lock: 'pending',
		reconciling: false,
		status: 'idle',
		error: '',
		lastSyncAt: 0,
		conflict: null,
	};
	let meta = null;
	let pushing = false;
	let pushTimer = null;
	let firstDirtyAt = 0;
	let loopTimer = null;
	let pollTimer = null;
	let retryTimer = null;
	let retryDelay = 30000;
	let bootOverlay = null;
	let pill = null;
	let modal = null;
	let frozen = false;
	const tabId = Math.random().toString(36).slice(2);

	const rawGet = (k) => origGet.call(LS, k);
	const getToken = () => rawGet('authToken');
	const getUid = () => rawGet('authUid');

	function h(tag, props, kids) {
		const e = document.createElement(tag);
		if (props)
			Object.keys(props).forEach((k) =>
				k === 'style' ? (e.style.cssText = props[k]) : (e[k] = props[k])
			);
		(kids || []).forEach((c) =>
			e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
		);
		return e;
	}

	function cyrb53(str) {
		let h1 = 0xdeadbeef;
		let h2 = 0x41c6ce57;
		for (let i = 0; i < str.length; i++) {
			const ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
		return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
	}

	// Generated code starts here on 2026-04-03T00:00:00Z:
	/**
	 * Computes a deterministic cyrb53 hash over sorted save state fields.
	 *
	 * @param {Record<string, string>} fields - Key-value map of save state keys to raw string values.
	 * @param {boolean} meaningfulOnly - When true, volatile keys (`totalPlaytime`, `activePotions`, etc.)
	 *   are excluded to prevent high-frequency background ticks from triggering cloud push traffic.
	 * @returns {string} Base-36 hash string representing the serialized save state snapshot.
	 */
	function hashFields(fields, meaningfulOnly) {
		let acc = '';
		Object.keys(fields)
			.sort()
			.forEach((k) => {
				if (meaningfulOnly && Keys.isVolatile(k)) return;
				acc += k + '\u0001' + fields[k] + '\u0002';
			});
		return cyrb53(acc);
	}
	// Generated code ends here on 2026-04-03T00:00:00Z:

	function snapshot() {
		const all = Keys.collect();
		const fields = {};
		const skipped = [];
		Object.keys(all).forEach((k) => {
			if (all[k].length > MAX_FIELD_CHARS) skipped.push(k);
			else fields[k] = all[k];
		});
		return { fields, skipped };
	}

	function localStats(fields) {
		const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
		let inv = 0;
		try {
			const a = JSON.parse(fields.rarityInventory || '[]');
			if (Array.isArray(a)) a.forEach((i) => (inv += parseInt(i && i.count, 10) || 0));
		} catch (_) {}
		return {
			rolls: Math.floor(n(fields.totalRolls)),
			points: n(fields.shopPoints),
			playtime: Math.floor(n(fields.totalPlaytime)),
			inventory: inv,
		};
	}

	const isEmptyLocal = (s) => s.rolls === 0 && s.points === 0 && s.inventory === 0;

	function sameSave(a, b) {
		const pick = (f) => {
			const o = {};
			Object.keys(f || {}).forEach((k) => {
				if (Keys.isSaveKey(k) && !Keys.isVolatile(k) && typeof f[k] === 'string') o[k] = f[k];
			});
			return hashFields(o, false);
		};
		return pick(a) === pick(b);
	}

	function fmtNum(n) {
		return typeof window.formatNum === 'function'
			? window.formatNum(n)
			: Math.round(n).toLocaleString();
	}

	function fmtTime(s) {
		s = Math.floor(s || 0);
		if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
		if (s >= 60) return Math.floor(s / 60) + 'm';
		return s + 's';
	}

	function fmtAgo(ts) {
		if (!ts) return 'never';
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return Math.floor(s / 60) + 'm ago';
		if (s < 86400) return Math.floor(s / 3600) + 'h ago';
		return Math.floor(s / 86400) + 'd ago';
	}

	function device() {
		let d = null;
		try {
			d = JSON.parse(rawGet(DEVICE_KEY) || 'null');
		} catch (_) {}
		if (!d || !d.id) {
			const ua = navigator.userAgent || '';
			const label = /Mobi|Android/i.test(ua)
				? 'mobile'
				: /Firefox/i.test(ua)
					? 'firefox'
					: /Edg/i.test(ua)
						? 'edge'
						: /Chrome/i.test(ua)
							? 'chrome'
							: /Safari/i.test(ua)
								? 'safari'
								: 'browser';
			d = { id: Math.random().toString(36).slice(2, 8), label };
			origSet.call(LS, DEVICE_KEY, JSON.stringify(d));
		}
		return d.label + ' ' + d.id;
	}

	function loadMeta() {
		try {
			const m = JSON.parse(rawGet(META_KEY) || 'null');
			return m && m.uid ? m : null;
		} catch (_) {
			return null;
		}
	}

	function saveMeta() {
		if (meta) origSet.call(LS, META_KEY, JSON.stringify(meta));
	}

	function status() {
		return {
			status: st.status,
			error: st.error,
			lastSyncAt: st.lastSyncAt,
			lock: st.lock,
			rev: meta ? meta.baseRev : null,
			conflict: !!st.conflict,
			loggedIn: !!getToken(),
		};
	}

	function setStatus(s, err) {
		st.status = s;
		st.error = err || '';
		updatePill();
		document.dispatchEvent(new CustomEvent('syncstatus', { detail: status() }));
	}

	function updatePill() {
		if (!document.body) return;
		const msg =
			st.status === 'offline'
				? 'offline. progress is saved on this device and will sync later'
				: st.status === 'conflict'
					? 'cloud sync paused: save conflict. tap to resolve'
					: st.status === 'error'
						? 'sync problem: ' + (st.error || 'unknown')
						: '';
		if (!msg) {
			if (pill) pill.style.display = 'none';
			return;
		}
		if (!pill) {
			pill = h('div', {
				style:
					'position:fixed;bottom:66px;left:16px;max-width:260px;background:#1a0a0a;color:#f88;border:1px solid #5a1a1a;font-family:monospace;font-size:11px;padding:8px 12px;z-index:2147483000;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);',
			});
			pill.addEventListener('click', () => {
				if (st.conflict) openConflict();
			});
			document.body.appendChild(pill);
		}
		pill.style.display = 'block';
		pill.style.cursor = st.conflict ? 'pointer' : 'default';
		pill.textContent = msg;
	}

	function showBootOverlay() {
		if (bootOverlay || !document.body || !getToken()) return;
		bootOverlay = h(
			'div',
			{
				style:
					'position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0e0e0e;color:#dcdcdc;font-family:monospace;font-size:0.95em;opacity:0.95;',
			},
			[
				h('style', {
					textContent:
						'@keyframes syncBootSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
				}),
				h('div', {
					style:
						'width:28px;height:28px;border:2px solid #303030;border-top-color:#dcdcdc;border-radius:50%;animation:syncBootSpin 0.8s linear infinite;',
				}),
				h('div', { textContent: 'syncing your save...' }),
			]
		);
		document.body.appendChild(bootOverlay);
	}

	function hideBootOverlay() {
		if (bootOverlay && bootOverlay.parentNode) bootOverlay.parentNode.removeChild(bootOverlay);
		bootOverlay = null;
	}

	function canWrite() {
		return st.lock !== 'lost' && !frozen;
	}

	function canPush() {
		return (
			!!meta &&
			meta.uid === getUid() &&
			!!getToken() &&
			st.lock === 'held' &&
			!st.reconciling &&
			!st.conflict &&
			st.status !== 'offline' &&
			st.status !== 'loggedout' &&
			navigator.onLine !== false
		);
	}

	async function api(method, path, body, opts) {
		opts = opts || {};
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), opts.timeout || REQ_TIMEOUT_MS);
		try {
			const res = await fetch(API + path, {
				method,
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
				body:
					body === undefined || body === null
						? undefined
						: typeof body === 'string'
							? body
							: JSON.stringify(body),
				signal: ctrl.signal,
				keepalive: !!opts.keepalive,
			});
			let data = {};
			try {
				data = await res.json();
			} catch (_) {}
			return { status: res.status, data };
		} catch (e) {
			return { status: 0, data: {}, error: e };
		} finally {
			clearTimeout(timer);
		}
	}

	function authLost() {
		stopTimers();
		setStatus('loggedout');
		if (window.AuthAccount && window.AuthAccount.clearSession) {
			window.AuthAccount.clearSession();
		} else {
			['authToken', 'authUid', 'authUsername', 'authAvatarUrl'].forEach((k) =>
				origRemove.call(LS, k)
			);
			document.dispatchEvent(new CustomEvent('authchange'));
		}
	}

	function stopTimers() {
		clearTimeout(pushTimer);
		clearInterval(loopTimer);
		clearInterval(pollTimer);
		clearTimeout(retryTimer);
		loopTimer = pollTimer = pushTimer = retryTimer = null;
	}

	function startTimers() {
		if (!loopTimer) loopTimer = setInterval(() => maybePush('loop'), 30000);
		if (!pollTimer)
			pollTimer = setInterval(() => {
				if (!document.hidden) checkRemote();
			}, POLL_MS);
	}

	function scheduleRetry() {
		clearTimeout(retryTimer);
		retryTimer = setTimeout(() => reconcile(false), retryDelay);
		retryDelay = Math.min(retryDelay * 2, 300000);
	}

	function goOffline() {
		st.reconciling = false;
		setStatus('offline');
		hideBootOverlay();
		scheduleRetry();
	}

	function markReady() {
		st.reconciling = false;
		retryDelay = 30000;
		st.lastSyncAt = st.lastSyncAt || Date.now();
		setStatus('ok');
		hideBootOverlay();
		startTimers();
	}

	function applyRemote(fields, rev) {
		const skipped = new Set(snapshot().skipped);
		Object.keys(Keys.collect()).forEach((k) => {
			if (!(k in fields) && !skipped.has(k)) origRemove.call(LS, k);
		});
		Object.keys(fields).forEach((k) => {
			if (!Keys.isSaveKey(k) || typeof fields[k] !== 'string') return;
			let v = fields[k];
			if (k === 'totalPlaytime') v = String(Math.max(Number(rawGet(k)) || 0, Number(v) || 0));
			origSet.call(LS, k, v);
		});
		const snap = snapshot().fields;
		meta = {
			uid: getUid(),
			baseRev: rev,
			baseHash: hashFields(snap, true),
			pushedAll: hashFields(snap, false),
			lastPushAt: Date.now(),
			pendingReason: '',
		};
		saveMeta();
	}

	function reloadAfterApply(rev) {
		frozen = true;
		let g = {};
		try {
			g = JSON.parse(sessionStorage.getItem('__sync_ff') || '{}');
		} catch (_) {}
		const n = g.rev === rev && Date.now() - g.ts < 60000 ? g.n + 1 : 1;
		try {
			sessionStorage.setItem('__sync_ff', JSON.stringify({ rev, n, ts: Date.now() }));
		} catch (_) {}
		location.reload();
	}

	function ffAllowed(rev) {
		try {
			const g = JSON.parse(sessionStorage.getItem('__sync_ff') || '{}');
			return !(g.rev === rev && g.n >= 2 && Date.now() - g.ts < 60000);
		} catch (_) {
			return true;
		}
	}

	async function fastForward(rev) {
		if (!ffAllowed(rev)) return false;
		const r = await api('GET', '');
		if (r.status === 401) return (authLost(), true);
		if (r.status !== 200 || !r.data.fields) {
			goOffline();
			return true;
		}
		applyRemote(r.data.fields, r.data.rev);
		reloadAfterApply(r.data.rev);
		return true;
	}

	function cloudInfo(d) {
		return {
			rev: d.rev,
			ts: d.ts,
			device: d.device,
			summary: d.summary || { rolls: 0, points: 0, playtime: 0 },
		};
	}

	async function adoptIfSame() {
		const r = await api('GET', '');
		if (r.status === 401) {
			authLost();
			return 'auth';
		}
		if (r.status !== 200 || !r.data.ok || !r.data.fields) return 'fail';
		const { fields } = snapshot();
		if (!sameSave(fields, r.data.fields)) return 'diff';
		meta = {
			uid: getUid(),
			baseRev: r.data.rev,
			baseHash: hashFields(fields, true),
			pushedAll: hashFields(fields, false),
			lastPushAt: Date.now(),
			pendingReason: '',
		};
		saveMeta();
		st.lastSyncAt = Date.now();
		return 'same';
	}

	async function diagnose() {
		const r = await api('GET', '');
		if (r.status !== 200 || !r.data.fields) return null;
		const local = snapshot().fields;
		const remote = r.data.fields;
		const out = [];
		new Set(Object.keys(local).concat(Object.keys(remote))).forEach((k) => {
			if (!Keys.isSaveKey(k) || Keys.isVolatile(k)) return;
			if (local[k] !== remote[k]) {
				out.push({
					key: k,
					local: local[k] === undefined ? null : local[k].length,
					remote: remote[k] === undefined ? null : remote[k].length,
				});
			}
		});
		return out;
	}

	async function reconcile(isBoot) {
		if (st.reconciling) return;
		const uid = getUid();
		if (!getToken() || !uid) {
			setStatus('loggedout');
			hideBootOverlay();
			return;
		}
		st.reconciling = true;
		setStatus('syncing');
		try {
			meta = loadMeta();
			const r = await api('GET', '?summary=1', null, {
				timeout: isBoot ? BOOT_TIMEOUT_MS : REQ_TIMEOUT_MS,
			});
			if (r.status === 401) {
				st.reconciling = false;
				hideBootOverlay();
				return authLost();
			}
			if (r.status !== 200 || !r.data.ok) return goOffline();
			const cloud = cloudInfo(r.data);
			const bound = !!meta && meta.uid === uid;
			const { fields } = snapshot();
			const local = localStats(fields);

			if (cloud.rev === 0) {
				meta = { uid, baseRev: 0, baseHash: '', pushedAll: '', lastPushAt: 0, pendingReason: '' };
				if (!isEmptyLocal(local)) {
					st.reconciling = false;
					const out = await doPush('initial', { ignoreGate: true });
					if (!out.ok && !out.conflict) return goOffline();
					if (out.conflict) return;
				} else {
					meta.baseHash = hashFields(fields, true);
					meta.pushedAll = hashFields(fields, false);
					saveMeta();
				}
				return markReady();
			}

			if (!bound) {
				const full = await api('GET', '');
				if (full.status === 401) {
					st.reconciling = false;
					hideBootOverlay();
					return authLost();
				}
				if (full.status !== 200 || !full.data.ok || !full.data.fields) return goOffline();
				const remote = full.data.fields;
				if (sameSave(fields, remote)) {
					meta = {
						uid,
						baseRev: full.data.rev,
						baseHash: hashFields(fields, true),
						pushedAll: hashFields(fields, false),
						lastPushAt: Date.now(),
						pendingReason: '',
					};
					saveMeta();
					return markReady();
				}
				if (isEmptyLocal(local) && ffAllowed(full.data.rev)) {
					applyRemote(remote, full.data.rev);
					return reloadAfterApply(full.data.rev);
				}
				st.reconciling = false;
				return openConflict(cloudInfo(full.data));
			}

			if (cloud.rev === meta.baseRev) {
				st.reconciling = false;
				markReady();
				return maybePush('boot');
			}

			const same = await adoptIfSame();
			if (same === 'auth') {
				st.reconciling = false;
				hideBootOverlay();
				return;
			}
			if (same === 'fail') return goOffline();
			if (same === 'same') return markReady();
			const dirty = hashFields(snapshot().fields, true) !== meta.baseHash;
			if (!dirty && cloud.rev > meta.baseRev && (await fastForward(cloud.rev))) return;
			st.reconciling = false;
			openConflict(cloud);
		} catch (e) {
			console.warn('[sync] reconcile failed:', e);
			st.reconciling = false;
			setStatus('error', 'unexpected error');
			hideBootOverlay();
		}
	}

	async function doPush(reasonOverride, opts) {
		opts = opts || {};
		if (pushing) return { ok: false, busy: true };
		if (!opts.ignoreGate && !canPush()) return { ok: false, blocked: true };
		if (!meta) return { ok: false, blocked: true };
		pushing = true;
		try {
			const { fields } = snapshot();
			const reason = reasonOverride || meta.pendingReason || 'auto';
			if (!Object.keys(fields).length && reason !== 'reset' && reason !== 'import')
				return { ok: false, empty: true };
			const body = { baseRev: meta.baseRev, device: device(), reason, fields };
			if (opts.force) body.force = true;
			const json = JSON.stringify(body);
			const r = await api('PUT', '', json, { keepalive: !!opts.keepalive && json.length < 60000 });
			if (r.status === 200 && r.data.ok) {
				meta.baseRev = r.data.rev;
				meta.baseHash = hashFields(fields, true);
				meta.pushedAll = hashFields(fields, false);
				meta.lastPushAt = Date.now();
				meta.pendingReason = '';
				saveMeta();
				st.lastSyncAt = Date.now();
				retryDelay = 30000;
				if (st.status !== 'ok') setStatus('ok');
				else document.dispatchEvent(new CustomEvent('syncstatus', { detail: status() }));
				return { ok: true };
			}
			if (r.status === 401) {
				authLost();
				return { ok: false };
			}
			if (r.status === 409) {
				await onStale(r.data);
				return { ok: false, conflict: true };
			}
			if (r.status === 429) {
				schedulePush(3000);
				return { ok: false, throttled: true };
			}
			if (r.status === 0 || r.status >= 500) {
				setStatus('offline');
				scheduleRetry();
				return { ok: false };
			}
			setStatus('error', r.data.error || 'request failed (' + r.status + ')');
			return { ok: false };
		} finally {
			pushing = false;
		}
	}

	async function onStale(info) {
		const cloud = cloudInfo(info);
		if (info.code === 'regression') return openConflict(cloud);
		const same = await adoptIfSame();
		if (same === 'auth') return;
		if (same === 'fail') {
			setStatus('offline');
			scheduleRetry();
			return;
		}
		if (same === 'same') {
			if (st.status !== 'ok') setStatus('ok');
			startTimers();
			return;
		}
		const dirty = hashFields(snapshot().fields, true) !== (meta ? meta.baseHash : '');
		const baseRev = meta ? meta.baseRev : 0;
		if (!dirty && cloud.rev > baseRev && (await fastForward(cloud.rev))) return;
		openConflict(cloud);
	}

	async function maybePush(why, opts) {
		if (!canPush()) return;
		opts = opts || {};
		const { fields } = snapshot();
		if (hashFields(fields, false) === meta.pushedAll && !meta.pendingReason) return;
		const meaningful = hashFields(fields, true) !== meta.baseHash || !!meta.pendingReason;
		if (!meaningful && !opts.immediate && Date.now() - meta.lastPushAt < VOLATILE_PUSH_MS) return;
		await doPush(null, opts);
	}

	function schedulePush(forceWait) {
		if (!canPush()) return;
		const now = Date.now();
		if (!firstDirtyAt) firstDirtyAt = now;
		clearTimeout(pushTimer);
		const debounce = Math.min(PUSH_DEBOUNCE_MS, Math.max(0, firstDirtyAt + PUSH_MAX_WAIT_MS - now));
		const gap = PUSH_MIN_MS - (now - (meta.lastPushAt || 0));
		pushTimer = setTimeout(
			() => {
				firstDirtyAt = 0;
				maybePush('write');
			},
			forceWait || Math.max(debounce, gap, 0)
		);
	}

	async function checkRemote() {
		if (!canPush()) return;
		const r = await api('GET', '?summary=1');
		if (r.status === 401) return authLost();
		if (r.status !== 200 || !r.data.ok) return;
		if (r.data.rev !== meta.baseRev) await onStale({ ...r.data, code: 'conflict' });
	}

	function closeModal() {
		if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
		modal = null;
	}

	function card(title, s, extra, badge) {
		return h(
			'div',
			{
				style:
					'flex:1;min-width:130px;border:1px solid var(--border-color,#303030);border-radius:3px;padding:10px;background:var(--overlay-bg,#0c0c0c);',
			},
			[
				h('div', {
					style: 'font-size:0.8em;opacity:0.6;margin-bottom:6px;',
					textContent: title + (badge ? ' (more progress)' : ''),
				}),
				h('div', { textContent: 'rolls: ' + fmtNum(s.rolls) }),
				h('div', { textContent: 'points: ' + fmtNum(s.points) }),
				h('div', { textContent: 'playtime: ' + fmtTime(s.playtime) }),
				h('div', { style: 'font-size:0.75em;opacity:0.5;margin-top:6px;', textContent: extra }),
			]
		);
	}

	function openConflict(cloud) {
		if (cloud) st.conflict = cloud;
		cloud = st.conflict;
		if (!cloud) return;
		hideBootOverlay();
		setStatus('conflict');
		if (modal || !document.body) return;
		const local = localStats(snapshot().fields);
		const cl = cloud.summary;
		const btn = (text, fn, style) => {
			const b = h('button', {
				textContent: text,
				className: 'small',
				style: 'width:100%;margin-top:8px;' + (style || ''),
			});
			b.addEventListener('click', fn);
			return b;
		};
		const box = h('div', { className: 'auth-modal', style: 'max-width:440px;' }, [
			h('h3', { style: 'margin-top:0', textContent: 'cloud save conflict' }),
			h('p', {
				style: 'font-size:0.85em;opacity:0.75;text-align:left;max-width:none;',
				textContent:
					'this device and your cloud save have different progress. pick the one to keep. the other one is kept as a restore point so nothing is lost.',
			}),
			h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' }, [
				card(
					'this device',
					local,
					'last synced ' + fmtAgo(meta && meta.lastPushAt),
					local.rolls > cl.rolls
				),
				card(
					'cloud',
					cl,
					'saved ' + fmtAgo(cloud.ts) + (cloud.device ? ' on ' + cloud.device : ''),
					cl.rolls > local.rolls
				),
			]),
			btn('keep cloud save', () => resolve('cloud')),
			btn('keep this device', () => resolve('local')),
			btn(
				'decide later',
				() => {
					closeModal();
				},
				'opacity:0.6;'
			),
		]);
		modal = h('div', { className: 'auth-overlay show', style: 'z-index:2147483645;' }, [box]);
		document.body.appendChild(modal);
	}

	async function resolve(choice) {
		const cloud = st.conflict;
		if (!cloud) return closeModal();
		if (choice === 'cloud') {
			const stashed = await api('POST', '/stash', { fields: snapshot().fields, device: device() });
			if (stashed.status !== 200 && window.showConfirm) {
				const go = await window.showConfirm(
					"could not back up this device's save first. continue and discard it?",
					'continue?'
				);
				if (!go) return;
			}
			const r = await api('GET', '');
			if (r.status !== 200 || !r.data.fields)
				return window.showAlert && window.showAlert('could not reach the server, try again');
			st.conflict = null;
			applyRemote(r.data.fields, r.data.rev);
			return reloadAfterApply(r.data.rev);
		}
		meta =
			meta && meta.uid === getUid()
				? meta
				: {
						uid: getUid(),
						baseRev: 0,
						baseHash: '',
						pushedAll: '',
						lastPushAt: 0,
						pendingReason: '',
					};
		meta.baseRev = cloud.rev;
		saveMeta();
		st.conflict = null;
		st.reconciling = false;
		let out = await doPush('force', { force: true, ignoreGate: true });
		if (!out.ok && out.throttled) {
			await new Promise((r) => setTimeout(r, 1700));
			out = await doPush('force', { force: true, ignoreGate: true });
		}
		if (out.ok) {
			closeModal();
			markReady();
		} else {
			st.conflict = cloud;
			if (window.showAlert) window.showAlert('upload failed, try again');
		}
	}

	function installPatch() {
		Storage.prototype.setItem = function (k, v) {
			if (this === LS && Keys.isSaveKey(k)) {
				if (!canWrite()) return;
				const s = String(v);
				if (origGet.call(this, k) === s) return;
				const out = origSet.call(this, k, s);
				schedulePush();
				return out;
			}
			return origSet.call(this, k, v);
		};
		Storage.prototype.removeItem = function (k) {
			if (this === LS && Keys.isSaveKey(k)) {
				if (!canWrite()) return;
				const had = origGet.call(this, k) !== null;
				const out = origRemove.call(this, k);
				if (had) schedulePush();
				return out;
			}
			return origRemove.call(this, k);
		};
	}

	function lockOverlay(taken) {
		if (!document.body) return;
		const box = h('div', { style: 'max-width:340px;text-align:center;line-height:1.6;' }, [
			h('div', {
				style: 'font-size:1.1em;margin-bottom:8px;',
				textContent: taken ? 'this tab was taken over' : "auth's rng is open in another tab",
			}),
			h('div', {
				style: 'font-size:0.85em;opacity:0.7;margin-bottom:16px;',
				textContent:
					'only one tab can save at a time so your progress never gets overwritten by an older copy.',
			}),
		]);
		const b = h('button', { textContent: taken ? 'reload this tab' : 'use this tab instead' });
		b.addEventListener('click', async () => {
			if (!taken && navigator.locks) {
				navigator.locks.request(LOCK_NAME, { steal: true }, () => new Promise(() => {}));
				await new Promise((r) => setTimeout(r, 400));
			} else if (!taken) {
				try {
					origSet.call(LS, LEASE_KEY, JSON.stringify({ id: tabId, ts: Date.now() }));
				} catch (_) {}
			}
			location.reload();
		});
		box.appendChild(b);
		const ov = h(
			'div',
			{
				id: 'syncLockOverlay',
				style:
					'position:fixed;inset:0;z-index:2147483647;background:#0e0e0e;color:#dcdcdc;font-family:monospace;display:flex;align-items:center;justify-content:center;',
			},
			[box]
		);
		document.body.appendChild(ov);
	}

	function onLockHeld() {
		st.lock = 'held';
		if (getToken()) reconcile(true);
		else {
			setStatus('loggedout');
			hideBootOverlay();
		}
	}

	function onLockLost(taken) {
		st.lock = 'lost';
		stopTimers();
		hideBootOverlay();
		closeModal();
		lockOverlay(taken);
	}

	function acquireWithLocks(attempt) {
		let decided = false;
		navigator.locks
			.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
				if (!lock) {
					if (attempt < 2) {
						decided = true;
						setTimeout(() => acquireWithLocks(attempt + 1), 500);
					} else {
						onLockLost(false);
					}
					return;
				}
				onLockHeld();
				return new Promise(() => {});
			})
			.catch((e) => {
				if (!decided && e && e.name === 'AbortError') onLockLost(true);
			});
	}

	function acquireWithLease() {
		const read = () => {
			try {
				return JSON.parse(rawGet(LEASE_KEY) || 'null');
			} catch (_) {
				return null;
			}
		};
		window.addEventListener('pagehide', () => {
			const c = read();
			if (c && c.id === tabId) origRemove.call(LS, LEASE_KEY);
		});
		const cur = read();
		if (cur && cur.id !== tabId && Date.now() - cur.ts < 7000) return onLockLost(false);
		origSet.call(LS, LEASE_KEY, JSON.stringify({ id: tabId, ts: Date.now() }));
		setTimeout(() => {
			const now = read();
			if (!now || now.id !== tabId) return onLockLost(false);
			onLockHeld();
			setInterval(() => {
				const c = read();
				if (c && c.id !== tabId) return onLockLost(true);
				origSet.call(LS, LEASE_KEY, JSON.stringify({ id: tabId, ts: Date.now() }));
			}, 2500);
		}, 200);
	}

	async function flush() {
		for (let i = 0; i < 20 && pushing; i++) await new Promise((r) => setTimeout(r, 100));
		await maybePush('flush', { immediate: true });
	}

	// Generated code starts here on 2026-10-13T18:00:00Z:
	/**
	 * Replaces current local save state with an imported save bundle, sets the
	 * `import` pending reason tag, and flushes changes to cloud sync if authenticated.
	 *
	 * @param {Record<string, string>} bundle - Key-value map of save keys to raw string values.
	 */
	// Generated code ends here on 2026-10-13T18:00:00Z:
	async function importBundle(bundle) {
		Object.keys(Keys.collect()).forEach((k) => origRemove.call(LS, k));
		Object.keys(bundle).forEach((k) => {
			if (Keys.isSaveKey(k) && typeof bundle[k] === 'string') origSet.call(LS, k, bundle[k]);
		});
		if (meta && meta.uid === getUid()) {
			meta.pendingReason = 'import';
			saveMeta();
			try {
				await flush();
			} catch (e) {
				// Generated code starts here on 2026-03-31T12:00:00Z:
				console.warn('[sync] import save flush failed:', e);
				// Generated code ends here on 2026-03-31T12:00:00Z:
			}
		}
	}

	function markReset() {
		if (!meta || meta.uid !== getUid()) return;
		meta.pendingReason = 'reset';
		saveMeta();
	}

	async function restoreFromHistory(id) {
		if (!meta) return { ok: false, error: 'not synced yet' };
		const r = await api('POST', '/restore', { id, baseRev: meta.baseRev });
		if (r.status === 200) {
			applyRemote(r.data.fields, r.data.rev);
			reloadAfterApply(r.data.rev);
			return { ok: true };
		}
		if (r.status === 409) await onStale({ ...r.data, code: 'conflict' });
		console.warn('[sync] restore from history failed:', r.data.error || 'restore failed', {
			id,
			status: r.status,
		});
		return { ok: false, error: r.data.error || 'restore failed' };
	}

	async function listHistory() {
		const r = await api('GET', '/history');
		if (r.status !== 200) {
			console.warn('[sync] failed to list restore history:', r.data?.error || 'request failed', {
				status: r.status,
			});
		}
		return r.status === 200 ? r.data.entries : null;
	}

	async function syncNow() {
		if (st.conflict) return openConflict();
		if (st.status === 'offline' || st.status === 'error') return reconcile(false);
		await maybePush('manual', { immediate: true });
		await checkRemote();
	}

	async function forcePush() {
		if (!meta) return false;
		const out = await doPush('force', { force: true, ignoreGate: true });
		return out.ok;
	}

	installPatch();
	showBootOverlay();

	if (navigator.locks && navigator.locks.request) acquireWithLocks(0);
	else acquireWithLease();

	document.addEventListener('authchange', () => {
		if (st.lock !== 'held') return;
		if (!getToken()) {
			stopTimers();
			setStatus('loggedout');
			return;
		}
		setTimeout(() => reconcile(false), 400);
	});

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) maybePush('hide', { keepalive: true, immediate: true });
		else setTimeout(checkRemote, 500);
	});
	window.addEventListener('pagehide', () =>
		maybePush('pagehide', { keepalive: true, immediate: true })
	);
	window.addEventListener('online', () => {
		if (st.status === 'offline') reconcile(false);
	});

	window.Sync = {
		status,
		syncNow,
		forcePush,
		flush,
		markReset,
		importBundle,
		restoreFromHistory,
		listHistory,
		openConflict: () => openConflict(),
		diagnose,
		_state: st,
	};
})();
