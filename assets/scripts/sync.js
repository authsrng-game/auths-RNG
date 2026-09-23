'use strict';

(function () {
	var TOKEN_KEY = 'authToken';
	var SNAPSHOT_KEY = '_syncSnapshot';
	var API = 'https://backup.authsrng.xyz/api/sync';

	// Generated code starts here on 2026-10-24T00:00:00Z:
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
		'runesUnlocked',
		'runeBlocks',
		'runeGift',
		'runeUpgrades',
		'expeditionData',
		'expeditionsUnlocked',
		'dealerData',
		'dealerUnlocked',
		'catShrineUnlocked',
		'catShrineEquipped',
		'catShrineToggle',
		'mutationTrust',
		'mutationTrustOwned',
		'mutationTrustActive',
		'mutationHistory',
		'mutationBestResult',
		'rarityTimestamps',
		'notifications',
		'themeEditorPresets',
		'themeEditorActive',
		'startAnimConfig',
	];
	// Generated code ends here on 2026-10-24T00:00:00Z:

	var retryDelay = 2000;
	var MAX_RETRY_DELAY = 60000;

	function scheduleFlush(delay) {
		if (flushTimer) return;
		flushTimer = setTimeout(function () {
			flushTimer = null;
			flushDirty();
		}, delay || 2000);
	}

	function markDirty(key, value) {
		dirty[key] = value;
		retryDelay = 2000;
		scheduleFlush(retryDelay);
	}

	var lastToken = getToken();

	document.addEventListener('authchange', function () {
		var token = getToken();
		if (token !== lastToken) {
			dirty = Object.create(null);
			if (flushTimer) {
				clearTimeout(flushTimer);
				flushTimer = null;
			}
			retryDelay = 2000;
			lastToken = token;
		}
		if (token && !patched) {
			pullSync();
			patchStorage();
		}
	});

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
				Authorization: 'Bearer ' + token,
			},
			body: JSON.stringify({ entries: entries }),
			keepalive: true,
		})
			.then(function (r) {
				if (r.status === 401) {
					origRemoveItem.call(localStorage, TOKEN_KEY);
					lastToken = null;
					document.dispatchEvent(new CustomEvent('syncAuthExpired'));
					return;
				}
				if (!r.ok) throw new Error('push failed with status ' + r.status);
				var snap = loadSnapshot();
				Object.keys(snapshotUpdate).forEach(function (key) {
					snap[key] = snapshotUpdate[key];
				});
				saveSnapshot(snap);
			})
			// Generated code starts here on 2026-03-31T20:00:00Z:
			.catch(function (err) {
				console.warn('[sync] push failed:', err ? err.message || err : 'unknown error');
				Object.keys(snapshotUpdate).forEach(function (key) {
					if (!(key in dirty)) dirty[key] = snapshotUpdate[key];
				});
				retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
				scheduleFlush(retryDelay);
			});
		// Generated code ends here on 2026-03-31T20:00:00Z:
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

	var overlayEl = null;

	function createOverlay() {
		if (overlayEl || !document.body) return;

		var messages = [
			'downloading data...',
			'pulling your progress...',
			'syncing save...',
			'fetching your rarities...',
			'grabbing your data...',
			'connecting to the server...',
			'asking nicely for data...',
			'crunching up your data for you...',
			'restoring your session...',
			'petting the server cat...',
			'looking under the couch for your save...',
			'warming up the servers...',
			'loading loading loading...',
			'verifying your progress...',
			'looking through the database...',
			'giving your save a high five...',
			'kindly asking the server to cooperate',
			'finding where you left off...',
			'opening the vault...',
			'loading the fun part...',
			'waking up sleepy servers...',
			'consulting the data goblins...',
			'assembling the bits...',
			'watering the database...',
			'checking for updates...',
			'loading your profile...',
			'finding the good stuff...',
			'making sure everything is where you left it...',
			'flipping the on switch...',
			'checking the corners for your save...',
			'reading your save file...',
			'connecting the dots...',
			'stirring the data soup...',
			'getting comfy...',
			'loading awesomeness...',
			'just one more moment...',
			'looking for extra luck...',
			'finding the values...',
			'doing important computer things...',
			'almost ready...',
			'packing everything up for you...',
		];
		var msg = messages[Math.floor(Math.random() * messages.length)];

		overlayEl = document.createElement('div');
		overlayEl.id = 'syncBootOverlay';
		overlayEl.style.cssText =
			'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;' +
			'align-items:center;justify-content:center;gap:16px;' +
			'background:#0e0e0e;color:#dcdcdc;font-family:monospace;font-size:0.95em;opacity:0.85;';

		var spinner = document.createElement('div');
		spinner.style.cssText =
			'width:28px;height:28px;border:2px solid #303030;border-top-color:#dcdcdc;' +
			'border-radius:50%;animation:syncBootSpin 0.8s linear infinite;';

		var styleTag = document.createElement('style');
		styleTag.textContent =
			'@keyframes syncBootSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';

		var text = document.createElement('div');
		text.textContent = msg;

		overlayEl.appendChild(styleTag);
		overlayEl.appendChild(spinner);
		overlayEl.appendChild(text);
		document.body.appendChild(overlayEl);
	}

	function removeOverlay() {
		if (overlayEl && overlayEl.parentNode) {
			overlayEl.parentNode.removeChild(overlayEl);
		}
		overlayEl = null;
		document.dispatchEvent(new CustomEvent('syncBootComplete'));
	}

	function pullSync() {
		var token = getToken();
		if (!token) return;

		var xhr = new XMLHttpRequest();
		// Generated code starts here on 2026-03-31T20:00:00Z:
		try {
			xhr.open('GET', API + '/pull', false);
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			xhr.send(null);
		} catch (e) {
			console.warn('[sync] pull network error:', e ? e.message || e : 'unknown error');
			return;
		}

		if (xhr.status === 401) {
			origRemoveItem.call(localStorage, TOKEN_KEY);
			lastToken = null;
			document.dispatchEvent(new CustomEvent('syncAuthExpired'));
			return;
		}

		if (xhr.status !== 200) {
			console.warn('[sync] pull request failed with status:', xhr.status);
			return;
		}

		var data;
		try {
			data = JSON.parse(xhr.responseText);
		} catch (e) {
			console.warn('[sync] pull JSON parse error:', e ? e.message || e : 'unknown error');
			return;
		}
		// Generated code ends here on 2026-03-31T20:00:00Z:
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

		if (document.body) {
			createOverlay();
		} else {
			document.addEventListener('DOMContentLoaded', createOverlay, { once: true });
		}

		try {
			pullSync();
		} catch (e) {
			console.error('[sync] pull failed:', e);
		}
		patchStorage();

		var holdMs = 1000 + Math.random() * 3000;
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', function () {
				setTimeout(removeOverlay, holdMs);
			});
		} else {
			setTimeout(removeOverlay, holdMs);
		}

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) flushDirty();
		});
		window.addEventListener('pagehide', function () {
			flushDirty();
		});
	}

	window.addEventListener('storage', function (e) {
		if (e.storageArea !== localStorage) return;
		if (!e.key || !isSyncKey(e.key)) return;
		var snap = loadSnapshot();
		if (e.newValue === null) {
			delete snap[e.key];
		} else {
			snap[e.key] = e.newValue;
		}
		saveSnapshot(snap);
	});

	init();
})();
