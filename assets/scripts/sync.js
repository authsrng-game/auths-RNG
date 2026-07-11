'use strict';

(function () {
	var TOKEN_KEY = 'authToken';
	var SNAPSHOT_KEY = '_syncSnapshot';
	var API = 'https://backup.authsrng.xyz/api/sync';

	var SYNC_KEYS = [
		'rarityInventory',
		'totalRolls',
		'achievementsUnlocked',
		'anomalies',
		'anomaliesUsed',
		'shopPoints',
		'shopUpgrades',
		'soldOutRarities',
		'playerPotions',
		'activePotions',
		'wishingWell',
		'luckBoostState',
		'totalPlaytime',
		'daily_lastClaim',
		'daily_streak',
		'weekly_lastClaim',
		'weekly_streak',
		'gauntletData',
		'mutationsUnlocked',
		'starmapData',
		'starmapUnlocked',
		'runesData',
		'runeBlocks',
		'runeGift',
		'runeUpgrades',
		'mutationTrust',
		'mutationTrustOwned',
		'mutationTrustActive',
		'mutationHistory',
		'mutationBestResult',
		'rarityTimestamps',
		'notifications'
	];

	function getToken() {
		return localStorage.getItem(TOKEN_KEY);
	}

	function loadSnapshot() {
		try {
			return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
		} catch (_) {
			return {};
		}
	}

	function saveSnapshot(snap) {
		try {
			origSetItem.call(localStorage, SNAPSHOT_KEY, JSON.stringify(snap));
		} catch (_) {}
	}

	var origSetItem = Storage.prototype.setItem;
	var origRemoveItem = Storage.prototype.removeItem;
	var origGetItem = Storage.prototype.getItem;

	var dirty = Object.create(null);
	var flushTimer = null;
	var patched = false;

	function isSyncKey(key) {
		return SYNC_KEYS.indexOf(key) !== -1;
	}

	function scheduleFlush() {
		if (flushTimer) return;
		flushTimer = setTimeout(function () {
			flushTimer = null;
			flushDirty();
		}, 2000);
	}

	function markDirty(key, value) {
		dirty[key] = value;
		scheduleFlush();
	}

	function flushDirty() {
		var keys = Object.keys(dirty);
		if (!keys.length) return;
		var token = getToken();
		if (!token) {
			dirty = Object.create(null);
			return;
		}

		var snapshotUpdate = {};
		var entries = keys.map(function (key) {
			snapshotUpdate[key] = dirty[key];
			return { key: key, value: dirty[key] };
		});
		dirty = Object.create(null);

		fetch(API + '/push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + token
			},
			body: JSON.stringify({ entries: entries }),
			keepalive: true
		})
			.then(function (r) {
				if (!r.ok) throw new Error('push failed');
				var snap = loadSnapshot();
				Object.keys(snapshotUpdate).forEach(function (key) {
					snap[key] = snapshotUpdate[key];
				});
				saveSnapshot(snap);
			})
			.catch(function () {
				Object.keys(snapshotUpdate).forEach(function (key) {
					if (!(key in dirty)) dirty[key] = snapshotUpdate[key];
				});
				scheduleFlush();
			});
	}

	function patchStorage() {
		if (patched) return;
		patched = true;

		Storage.prototype.setItem = function (key, value) {
			var result = origSetItem.call(this, key, value);
			if (this === window.localStorage && isSyncKey(key)) {
				markDirty(key, String(value));
			}
			return result;
		};

		Storage.prototype.removeItem = function (key) {
			var result = origRemoveItem.call(this, key);
			if (this === window.localStorage && isSyncKey(key)) {
				markDirty(key, null);
			}
			return result;
		};
	}

	function pullSync() {
		var token = getToken();
		if (!token) return;

		var xhr = new XMLHttpRequest();
		try {
			xhr.open('GET', API + '/pull', false);
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			xhr.send(null);
		} catch (_) {
			return;
		}

		if (xhr.status !== 200) return;

		var data;
		try {
			data = JSON.parse(xhr.responseText);
		} catch (_) {
			return;
		}
		if (!data || !data.fields) return;

		var fields = data.fields;
		var snapshot = loadSnapshot();
		var newSnapshot = {};

		SYNC_KEYS.forEach(function (key) {
			var localVal = origGetItem.call(localStorage, key);
			var snapVal = Object.prototype.hasOwnProperty.call(snapshot, key) ? snapshot[key] : undefined;
			var hasServerVal = Object.prototype.hasOwnProperty.call(fields, key);
			var serverVal = hasServerVal ? fields[key] : undefined;

			var localMatchesSnapshot =
				(localVal === null && snapVal === undefined) || localVal === snapVal;

			if (localMatchesSnapshot && hasServerVal) {
				if (serverVal === null) {
					origRemoveItem.call(localStorage, key);
				} else {
					origSetItem.call(localStorage, key, serverVal);
				}
				newSnapshot[key] = serverVal;
			} else if (localMatchesSnapshot && !hasServerVal) {
				if (localVal !== null) newSnapshot[key] = localVal;
			} else {
				newSnapshot[key] = localVal;
				markDirty(key, localVal);
			}
		});

		saveSnapshot(newSnapshot);
	}

	function init() {
		if (!getToken()) return;
		try {
			pullSync();
		} catch (e) {
			console.error('[sync] pull failed:', e);
		}
		patchStorage();

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) flushDirty();
		});
		window.addEventListener('pagehide', function () {
			flushDirty();
		});
	}

	document.addEventListener('authchange', function () {
		if (getToken() && !patched) {
			pullSync();
			patchStorage();
		}
	});

	init();
})();
