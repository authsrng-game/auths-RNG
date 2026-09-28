'use strict';

window.Revisory = (function () {
	const DB_NAME = 'revisory_v1';
	const DB_VERSION = 1;
	const STORE_REVISIONS = 'revisions';
	const STORE_HEADS = 'heads';
	const STORE_QUARANTINE = 'quarantine';
	const STORE_KEYSTATS = 'keystats';

	const DEVICE_ID_KEY = '__revisory_device_id';

	function getDeviceId() {
		let id = localStorage.getItem(DEVICE_ID_KEY);
		if (!id) {
			id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
			try {
				localStorage.setItem(DEVICE_ID_KEY, id);
			} catch (_) {}
		}
		return id;
	}

	let dbPromise = null;
	function openDB() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains(STORE_REVISIONS)) {
					const rs = db.createObjectStore(STORE_REVISIONS, { keyPath: 'id' });
					rs.createIndex('ts', 'ts');
					rs.createIndex('parentId', 'parentId');
					rs.createIndex('device', 'device');
				}
				if (!db.objectStoreNames.contains(STORE_HEADS)) {
					db.createObjectStore(STORE_HEADS, { keyPath: 'device' });
				}
				if (!db.objectStoreNames.contains(STORE_QUARANTINE)) {
					const qs = db.createObjectStore(STORE_QUARANTINE, { keyPath: 'id' });
					qs.createIndex('ts', 'ts');
					qs.createIndex('resolved', 'resolved');
				}
				if (!db.objectStoreNames.contains(STORE_KEYSTATS)) {
					db.createObjectStore(STORE_KEYSTATS, { keyPath: 'key' });
				}
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
		return dbPromise;
	}

	function tx(storeNames, mode) {
		return openDB().then((db) => db.transaction(storeNames, mode));
	}

	function reqToPromise(req) {
		return new Promise((resolve, reject) => {
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function idbGet(store, key) {
		const t = await tx(store, 'readonly');
		return reqToPromise(t.objectStore(store).get(key));
	}

	async function idbGetAll(store, indexName, query) {
		const t = await tx(store, 'readonly');
		const os = indexName ? t.objectStore(store).index(indexName) : t.objectStore(store);
		return reqToPromise(query !== undefined ? os.getAll(query) : os.getAll());
	}

	async function idbPut(store, value) {
		const t = await tx(store, 'readwrite');
		return reqToPromise(t.objectStore(store).put(value));
	}

	async function idbDelete(store, key) {
		const t = await tx(store, 'readwrite');
		return reqToPromise(t.objectStore(store).delete(key));
	}

	async function idbCount(store) {
		const t = await tx(store, 'readonly');
		return reqToPromise(t.objectStore(store).count());
	}

	function fnv1a(str) {
		let h = 0x811c9dc5;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16).padStart(8, '0');
	}

	function hashSnapshot(snapshot) {
		const keys = Object.keys(snapshot).sort();
		let acc = '';
		for (const k of keys) acc += k + '\u0001' + snapshot[k] + '\u0002';
		return fnv1a(acc);
	}

	function snapshotAllKeys() {
		const out = {};
		const n = localStorage.length;
		for (let i = 0; i < n; i++) {
			const k = localStorage.key(i);
			if (k === null) continue;
			if (k === DEVICE_ID_KEY) continue;
			if (k.startsWith('__revisory')) continue;
			const v = localStorage.getItem(k);
			if (v !== null) out[k] = v;
		}
		return out;
	}

	function classifyValue(raw) {
		if (raw === undefined || raw === null) return { kind: 'missing' };
		const trimmed = raw.trim();
		if (trimmed !== '' && !isNaN(Number(trimmed)) && /^-?[0-9.]+$/.test(trimmed)) {
			return { kind: 'numeric', value: Number(trimmed) };
		}
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return { kind: 'array', value: parsed, length: parsed.length };
			if (parsed !== null && typeof parsed === 'object')
				return { kind: 'object', value: parsed, keyCount: Object.keys(parsed).length };
			if (typeof parsed === 'number') return { kind: 'numeric', value: parsed };
			if (typeof parsed === 'boolean') return { kind: 'bool', value: parsed };
			return { kind: 'string', value: raw, length: raw.length };
		} catch (_) {
			return { kind: 'string', value: raw, length: raw.length };
		}
	}

	function sizeOf(kindValue) {
		switch (kindValue.kind) {
			case 'numeric':
				return kindValue.value;
			case 'array':
				return kindValue.length;
			case 'object':
				return kindValue.keyCount;
			case 'string':
				return kindValue.length;
			default:
				return 0;
		}
	}

	async function loadKeyStats(key) {
		const rec = await idbGet(STORE_KEYSTATS, key);
		return (
			rec || {
				key,
				samples: 0,
				everIncreased: false,
				everDecreased: false,
				maxSeen: null,
				minSeen: null,
				lastKind: null,
				volatile: false,
			}
		);
	}

	async function updateKeyStats(key, oldClassified, newClassified) {
		const stats = await loadKeyStats(key);
		stats.samples++;
		stats.lastKind = newClassified.kind;
		if (
			oldClassified &&
			oldClassified.kind !== 'missing' &&
			newClassified.kind !== 'missing' &&
			oldClassified.kind === newClassified.kind &&
			(newClassified.kind === 'numeric' ||
				newClassified.kind === 'array' ||
				newClassified.kind === 'object' ||
				newClassified.kind === 'string')
		) {
			const oldSize = sizeOf(oldClassified);
			const newSize = sizeOf(newClassified);
			if (newSize > oldSize) stats.everIncreased = true;
			if (newSize < oldSize) stats.everDecreased = true;
			if (stats.everIncreased && stats.everDecreased) stats.volatile = true;
			if (stats.maxSeen === null || newSize > stats.maxSeen) stats.maxSeen = newSize;
			if (stats.minSeen === null || newSize < stats.minSeen) stats.minSeen = newSize;
		}
		await idbPut(STORE_KEYSTATS, stats);
		return stats;
	}

	function diffSnapshots(oldSnap, newSnap) {
		const oldKeys = new Set(Object.keys(oldSnap || {}));
		const newKeys = new Set(Object.keys(newSnap));
		const allKeys = new Set([...oldKeys, ...newKeys]);
		const diff = {};
		for (const k of allKeys) {
			const hadOld = oldKeys.has(k);
			const hasNew = newKeys.has(k);
			if (hadOld && !hasNew) {
				diff[k] = { type: 'removed', old: oldSnap[k] };
			} else if (!hadOld && hasNew) {
				diff[k] = { type: 'added', value: newSnap[k] };
			} else if (oldSnap[k] !== newSnap[k]) {
				diff[k] = { type: 'changed', old: oldSnap[k], value: newSnap[k] };
			}
		}
		return diff;
	}

	async function classifyDiffKey(key, entry) {
		const oldClassified = entry.type === 'added' ? { kind: 'missing' } : classifyValue(entry.old);
		const newClassified =
			entry.type === 'removed' ? { kind: 'missing' } : classifyValue(entry.value);
		const stats = await loadKeyStats(key);

		const flags = [];

		if (entry.type === 'removed') {
			flags.push('key_removed');
			if (stats.samples > 3) flags.push('key_removed_had_history');
		}

		if (
			entry.type === 'changed' &&
			!stats.volatile &&
			oldClassified.kind === newClassified.kind &&
			(newClassified.kind === 'numeric' ||
				newClassified.kind === 'array' ||
				newClassified.kind === 'object' ||
				newClassified.kind === 'string')
		) {
			const oldSize = sizeOf(oldClassified);
			const newSize = sizeOf(newClassified);
			if (stats.everIncreased && !stats.everDecreased && stats.samples > 5) {
				if (newSize < oldSize * 0.5) flags.push('monotonic_key_regressed');
				if (oldSize > 0 && newSize === 0) flags.push('monotonic_key_zeroed');
			}
			if (newSize < oldSize * 0.1 && oldSize > 50) flags.push('drastic_shrink');
		}

		return { key, oldClassified, newClassified, flags, stats };
	}

	async function analyzeDiff(oldSnap, newSnap) {
		const diff = diffSnapshots(oldSnap, newSnap);
		const perKey = {};
		let removedWithHistory = 0;
		let monotonicViolations = 0;
		let drasticShrinks = 0;
		const oldKeyCount = Object.keys(oldSnap || {}).length;
		const newKeyCount = Object.keys(newSnap).length;

		for (const key of Object.keys(diff)) {
			const result = await classifyDiffKey(key, diff[key]);
			perKey[key] = result;
			if (result.flags.includes('key_removed_had_history')) removedWithHistory++;
			if (
				result.flags.includes('monotonic_key_regressed') ||
				result.flags.includes('monotonic_key_zeroed')
			)
				monotonicViolations++;
			if (result.flags.includes('drastic_shrink')) drasticShrinks++;
		}

		let oldBytes = 0;
		for (const k in oldSnap || {}) oldBytes += (oldSnap[k] || '').length;
		let newBytes = 0;
		for (const k in newSnap) newBytes += (newSnap[k] || '').length;

		const keyLossFraction = oldKeyCount > 0 ? 1 - newKeyCount / oldKeyCount : 0;
		const byteLossFraction = oldBytes > 0 ? 1 - newBytes / oldBytes : 0;

		return {
			diff,
			perKey,
			oldKeyCount,
			newKeyCount,
			oldBytes,
			newBytes,
			keyLossFraction,
			byteLossFraction,
			removedWithHistory,
			monotonicViolations,
			drasticShrinks,
			changedKeyCount: Object.keys(diff).length,
		};
	}

	const CLASS_FAST_FORWARD = 'fast_forward';
	const CLASS_LEGIT_UPDATE = 'legit_update';
	const CLASS_STALE_DEVICE = 'stale_device';
	const CLASS_PARTIAL_CORRUPT = 'partial_corrupt';
	const CLASS_CONFLICT = 'conflict';
	const CLASS_CATASTROPHIC = 'catastrophic_overwrite';

	function classifyTransition(analysis, context) {
		const reasons = [];

		if (context.oldKeyCount === 0) {
			return { classification: CLASS_LEGIT_UPDATE, reasons: ['no_prior_local_data'] };
		}

		if (analysis.keyLossFraction >= 0.5 && context.oldKeyCount >= 4) {
			reasons.push(`lost ${(analysis.keyLossFraction * 100).toFixed(0)}% of known keys`);
			return { classification: CLASS_CATASTROPHIC, reasons };
		}

		if (analysis.monotonicViolations > 0) {
			reasons.push(`${analysis.monotonicViolations} monotonic key(s) regressed or zeroed`);
			return { classification: CLASS_CATASTROPHIC, reasons };
		}

		if (analysis.byteLossFraction >= 0.7 && analysis.oldBytes > 200) {
			reasons.push(`total save size dropped by ${(analysis.byteLossFraction * 100).toFixed(0)}%`);
			return { classification: CLASS_CATASTROPHIC, reasons };
		}

		if (context.parentKnown && !context.isDirectChild && !context.isAncestor) {
			if (context.incomingIsOlderOrEqual) {
				reasons.push('incoming revision has no new progress over current head');
				return { classification: CLASS_STALE_DEVICE, reasons };
			}
			reasons.push('incoming and local heads diverged from a common ancestor');
			return { classification: CLASS_CONFLICT, reasons };
		}

		if (analysis.removedWithHistory > 0 || analysis.drasticShrinks > 0) {
			reasons.push(
				`${analysis.removedWithHistory} key(s) with history vanished, ${analysis.drasticShrinks} shrank drastically`
			);
			return { classification: CLASS_PARTIAL_CORRUPT, reasons };
		}

		if (context.isDirectChild) {
			return { classification: CLASS_FAST_FORWARD, reasons: ['linear child of current head'] };
		}

		return { classification: CLASS_LEGIT_UPDATE, reasons: ['no destructive signals detected'] };
	}

	async function getHead(device) {
		const rec = await idbGet(STORE_HEADS, device);
		return rec ? rec.revisionId : null;
	}

	async function setHead(device, revisionId) {
		await idbPut(STORE_HEADS, { device, revisionId });
	}

	async function getRevision(id) {
		return idbGet(STORE_REVISIONS, id);
	}

	async function isAncestor(candidateId, descendantId, maxDepth) {
		let cursor = descendantId;
		let depth = 0;
		const limit = maxDepth || 500;
		while (cursor && depth < limit) {
			if (cursor === candidateId) return true;
			const rev = await getRevision(cursor);
			if (!rev) return false;
			cursor = rev.parentId;
			depth++;
		}
		return false;
	}

	async function createRevisionFromCurrentState(trigger, extra) {
		const device = getDeviceId();
		const headId = await getHead('local');
		const parentRev = headId ? await getRevision(headId) : null;
		const snapshot = snapshotAllKeys();
		const analysis = await analyzeDiff(parentRev ? parentRev.snapshot : null, snapshot);

		for (const key of Object.keys(analysis.diff)) {
			const entry = analysis.diff[key];
			const oldClassified = entry.type === 'added' ? { kind: 'missing' } : classifyValue(entry.old);
			const newClassified =
				entry.type === 'removed' ? { kind: 'missing' } : classifyValue(entry.value);
			await updateKeyStats(key, oldClassified, newClassified);
		}

		const id = 'rev_' + Date.now().toString(36) + '_' + hashSnapshot(snapshot).slice(0, 8);
		const revision = {
			id,
			parentId: headId,
			ts: Date.now(),
			device,
			trigger: trigger || 'manual',
			snapshot,
			snapshotHash: hashSnapshot(snapshot),
			diffSummary: {
				changedKeyCount: analysis.changedKeyCount,
				keyLossFraction: analysis.keyLossFraction,
				byteLossFraction: analysis.byteLossFraction,
				oldBytes: analysis.oldBytes,
				newBytes: analysis.newBytes,
			},
			meta: Object.assign(
				{ byteSize: analysis.newBytes, keyCount: analysis.newKeyCount },
				extra || {}
			),
		};

		await idbPut(STORE_REVISIONS, revision);
		await setHead('local', id);
		return revision;
	}

	async function evaluateIncoming(incomingSnapshot, incomingMeta) {
		const localHeadId = await getHead('local');
		const localHeadRev = localHeadId ? await getRevision(localHeadId) : null;
		const localSnapshot = localHeadRev ? localHeadRev.snapshot : null;

		const analysis = await analyzeDiff(localSnapshot, incomingSnapshot);

		const incomingParentId = incomingMeta && incomingMeta.parentId ? incomingMeta.parentId : null;
		const parentKnown = !!incomingParentId;
		const isDirectChild = parentKnown && incomingParentId === localHeadId;
		const isAncestorOfLocal =
			parentKnown && localHeadId ? await isAncestor(incomingParentId, localHeadId) : false;

		let incomingIsOlderOrEqual = false;
		if (incomingMeta && incomingMeta.ts && localHeadRev) {
			incomingIsOlderOrEqual = incomingMeta.ts <= localHeadRev.ts;
		}

		const context = {
			oldKeyCount: analysis.oldKeyCount,
			parentKnown,
			isDirectChild,
			isAncestor: isAncestorOfLocal,
			incomingIsOlderOrEqual,
		};

		const result = classifyTransition(analysis, context);

		return {
			classification: result.classification,
			reasons: result.reasons,
			analysis,
			localHeadId,
			localHeadRev,
		};
	}

	async function quarantineIncoming(incomingSnapshot, incomingMeta, evaluation) {
		const id = 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
		const record = {
			id,
			ts: Date.now(),
			classification: evaluation.classification,
			reasons: evaluation.reasons,
			incomingSnapshot,
			incomingMeta: incomingMeta || null,
			localHeadIdAtTime: evaluation.localHeadId,
			resolved: 0,
			resolution: null,
		};
		await idbPut(STORE_QUARANTINE, record);
		return record;
	}

	async function applySnapshotToLocalStorage(snapshot, options) {
		const opts = options || {};
		const currentKeys = new Set();
		const n = localStorage.length;
		for (let i = 0; i < n; i++) {
			const k = localStorage.key(i);
			if (k !== null) currentKeys.add(k);
		}
		if (!opts.additiveOnly) {
			for (const k of currentKeys) {
				if (k === DEVICE_ID_KEY || k.startsWith('__revisory')) continue;
				if (!(k in snapshot)) localStorage.removeItem(k);
			}
		}
		for (const k of Object.keys(snapshot)) {
			localStorage.setItem(k, snapshot[k]);
		}
	}

	async function ingestSync(incomingSnapshot, incomingMeta) {
		const evaluation = await evaluateIncoming(incomingSnapshot, incomingMeta);

		if (
			evaluation.classification === CLASS_FAST_FORWARD ||
			evaluation.classification === CLASS_LEGIT_UPDATE
		) {
			await applySnapshotToLocalStorage(incomingSnapshot, {});
			const rev = await createRevisionFromCurrentState('sync_apply', {
				sourceDevice: incomingMeta && incomingMeta.device,
				classification: evaluation.classification,
			});
			return {
				applied: true,
				classification: evaluation.classification,
				reasons: evaluation.reasons,
				revision: rev,
			};
		}

		const quarantined = await quarantineIncoming(incomingSnapshot, incomingMeta, evaluation);
		return {
			applied: false,
			classification: evaluation.classification,
			reasons: evaluation.reasons,
			quarantineId: quarantined.id,
		};
	}

	async function listQuarantine(includeResolved) {
		const all = await idbGetAll(STORE_QUARANTINE);
		return includeResolved ? all : all.filter((q) => !q.resolved);
	}

	async function resolveQuarantine(id, action) {
		const rec = await idbGet(STORE_QUARANTINE, id);
		if (!rec) throw new Error('quarantine record not found: ' + id);
		if (action === 'accept') {
			await applySnapshotToLocalStorage(rec.incomingSnapshot, {});
			const rev = await createRevisionFromCurrentState('quarantine_accept', {
				quarantineId: id,
				originalClassification: rec.classification,
			});
			rec.resolved = 1;
			rec.resolution = 'accepted';
			await idbPut(STORE_QUARANTINE, rec);
			return { action: 'accepted', revision: rev };
		}
		if (action === 'reject') {
			rec.resolved = 1;
			rec.resolution = 'rejected';
			await idbPut(STORE_QUARANTINE, rec);
			return { action: 'rejected' };
		}
		if (action === 'merge_additive') {
			await applySnapshotToLocalStorage(rec.incomingSnapshot, { additiveOnly: true });
			const rev = await createRevisionFromCurrentState('quarantine_merge_additive', {
				quarantineId: id,
				originalClassification: rec.classification,
			});
			rec.resolved = 1;
			rec.resolution = 'merged_additive';
			await idbPut(STORE_QUARANTINE, rec);
			return { action: 'merged_additive', revision: rev };
		}
		throw new Error('unknown resolution action: ' + action);
	}

	async function listRevisions(limit) {
		const all = await idbGetAll(STORE_REVISIONS, 'ts');
		all.sort((a, b) => b.ts - a.ts);
		return limit ? all.slice(0, limit) : all;
	}

	async function rollbackTo(revisionId) {
		const rev = await getRevision(revisionId);
		if (!rev) throw new Error('revision not found: ' + revisionId);
		const currentSnapshot = snapshotAllKeys();
		const currentHash = hashSnapshot(currentSnapshot);
		if (currentHash !== rev.snapshotHash) {
			await createRevisionFromCurrentState('pre_rollback_safety_snapshot', {
				rolledBackFrom: currentHash,
				targetRevision: revisionId,
			});
		}
		await applySnapshotToLocalStorage(rev.snapshot, {});
		await setHead('local', revisionId);
		return rev;
	}

	async function verifyIntegrity() {
		const revisions = await idbGetAll(STORE_REVISIONS);
		const problems = [];
		for (const rev of revisions) {
			const actualHash = hashSnapshot(rev.snapshot);
			if (actualHash !== rev.snapshotHash) {
				problems.push({
					revisionId: rev.id,
					issue: 'hash_mismatch',
					expected: rev.snapshotHash,
					actual: actualHash,
				});
			}
			if (rev.parentId) {
				const parent = await getRevision(rev.parentId);
				if (!parent)
					problems.push({ revisionId: rev.id, issue: 'missing_parent', parentId: rev.parentId });
			}
		}
		const headId = await getHead('local');
		if (headId) {
			const headRev = await getRevision(headId);
			if (!headRev) problems.push({ issue: 'head_points_to_missing_revision', headId });
		}
		return { ok: problems.length === 0, problems, revisionCount: revisions.length };
	}

	async function pruneOldRevisions(options) {
		const opts = options || {};
		const keepLast = opts.keepLast ?? 200;
		const keepDays = opts.keepDays ?? 30;
		const all = await listRevisions();
		if (all.length <= keepLast) return { pruned: 0 };

		const headId = await getHead('local');
		const protectedIds = new Set();
		let cursor = headId;
		let depth = 0;
		while (cursor && depth < keepLast) {
			protectedIds.add(cursor);
			const rev = await getRevision(cursor);
			if (!rev) break;
			cursor = rev.parentId;
			depth++;
		}

		const cutoff = Date.now() - keepDays * 86400000;
		let pruned = 0;
		for (const rev of all) {
			if (protectedIds.has(rev.id)) continue;
			if (rev.ts >= cutoff) continue;
			await idbDelete(STORE_REVISIONS, rev.id);
			pruned++;
		}
		return { pruned };
	}

	async function estimateStorageUsage() {
		let localStorageBytes = 0;
		const n = localStorage.length;
		for (let i = 0; i < n; i++) {
			const k = localStorage.key(i);
			if (k === null) continue;
			localStorageBytes += k.length + (localStorage.getItem(k) || '').length;
		}
		let quota = null;
		let usage = null;
		if (navigator.storage && navigator.storage.estimate) {
			try {
				const est = await navigator.storage.estimate();
				quota = est.quota;
				usage = est.usage;
			} catch (_) {}
		}
		const revisionCount = await idbCount(STORE_REVISIONS);
		const quarantineCount = await idbCount(STORE_QUARANTINE);
		return {
			localStorageBytes,
			localStorageLimitEstimate: 5 * 1024 * 1024,
			indexedDBUsage: usage,
			indexedDBQuota: quota,
			revisionCount,
			quarantineCount,
		};
	}

	let autoSnapshotTimer = null;
	function startAutoSnapshot(intervalMs) {
		stopAutoSnapshot();
		autoSnapshotTimer = setInterval(() => {
			createRevisionFromCurrentState('periodic').catch((e) =>
				console.warn('[revisory] periodic snapshot failed:', e)
			);
		}, intervalMs || 60000);
	}
	function stopAutoSnapshot() {
		if (autoSnapshotTimer) {
			clearInterval(autoSnapshotTimer);
			autoSnapshotTimer = null;
		}
	}

	async function init() {
		await openDB();
		const headId = await getHead('local');
		if (!headId) {
			await createRevisionFromCurrentState('initial_snapshot');
		}
	}

	return {
		init,
		snapshotAllKeys,
		createRevisionFromCurrentState,
		evaluateIncoming,
		ingestSync,
		listQuarantine,
		resolveQuarantine,
		listRevisions,
		getRevision,
		rollbackTo,
		verifyIntegrity,
		pruneOldRevisions,
		estimateStorageUsage,
		startAutoSnapshot,
		stopAutoSnapshot,
		getHead,
		getDeviceId,
		diffSnapshots,
		classifyValue,
		__internalLoadKeyStats: loadKeyStats,
		CLASS_FAST_FORWARD,
		CLASS_LEGIT_UPDATE,
		CLASS_STALE_DEVICE,
		CLASS_PARTIAL_CORRUPT,
		CLASS_CONFLICT,
		CLASS_CATASTROPHIC,
	};
})();

document.addEventListener('DOMContentLoaded', () => {
	Revisory.init().catch((e) => console.error('[revisory] init failed:', e));
});
