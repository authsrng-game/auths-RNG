'use strict';

(function () {
	var TOKEN_KEY = 'authToken';
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
		'_plush_v3',
		'infoTipsRead',
	];

	var retryDelay = 2000;
	var flushInFlight = false;
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

	// Generated code starts here on 2026-03-31T23:00:00Z:
	function loadSnapshot() {
		try {
			return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
		} catch (err) {
			console.warn('[sync] loadSnapshot failed:', err ? err.message || err : 'unknown error');
			return {};
		}
	}

	function saveSnapshot(snap) {
		try {
			origSetItem.call(localStorage, SNAPSHOT_KEY, JSON.stringify(snap));
		} catch (err) {
			console.warn('[sync] saveSnapshot failed:', err ? err.message || err : 'unknown error');
		}
	}
	// Generated code ends here on 2026-03-31T23:00:00Z:

	var origSetItem = Storage.prototype.setItem;
	var origRemoveItem = Storage.prototype.removeItem;
	var origGetItem = Storage.prototype.getItem;

	var dirty = Object.create(null);
	var flushTimer = null;
	var patched = false;

	function isSyncKey(key) {
		return SYNC_KEYS.indexOf(key) !== -1;
	}

	var PUSH_CHUNK_SIZE = 30;

	function chunkArray(arr, size) {
		var out = [];
		for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
		return out;
	}

	function flushDirty() {
		if (flushInFlight) return;
		var keys = Object.keys(dirty);
		if (!keys.length) return;
		var token = getToken();
		if (!token) {
			dirty = Object.create(null);
			return;
		}

		flushInFlight = true;
		var pending = dirty;
		dirty = Object.create(null);

		var keyChunks = chunkArray(Object.keys(pending), PUSH_CHUNK_SIZE);

		keyChunks
			.reduce(function (p, chunkKeys) {
				return p.then(function () {
					return pushChunk(token, chunkKeys, pending);
				});
			}, Promise.resolve())
			.then(function () {
				flushInFlight = false;
				if (Object.keys(dirty).length) scheduleFlush(retryDelay);
			});
	}

	function currentRevisoryMeta() {
		if (!window.Revisory) return null;
		return {
			device: window.Revisory.getDeviceId(),
		};
	}

	function pushChunk(token, chunkKeys, pending) {
		var entries = chunkKeys.map(function (key) {
			return { key: key, value: pending[key] };
		});

		var meta = currentRevisoryMeta();

		return fetch(API + '/push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + token,
			},
			body: JSON.stringify({ entries: entries, meta: meta }),
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
				retryDelay = 2000;
				cancelSyncBanner();
				if (window.Revisory) {
					window.Revisory.createRevisionFromCurrentState('sync_push', {
						pushedKeys: chunkKeys,
					}).catch(function (e) {
						console.warn('[sync] revisory snapshot after push failed:', e);
					});
				}
			})
			.catch(function (err) {
				console.warn('[sync] push failed:', err ? err.message || err : 'unknown error');
				queueSyncBanner(
					"couldn't reach the server! your progress will sync once you're back online"
				);
				Object.keys(pending).forEach(function (key) {
					if (chunkKeys.indexOf(key) !== -1 && !(key in dirty)) dirty[key] = pending[key];
				});
				retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
				scheduleFlush(retryDelay);
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

	var overlayEl = null;

	var syncBannerEl = null;
	var syncBannerHideTimer = null;
	var syncBannerShowTimer = null;
	var SYNC_BANNER_DEBOUNCE = 1500;

	function queueSyncBanner(msg) {
		if (syncBannerShowTimer) return;
		syncBannerShowTimer = setTimeout(function () {
			syncBannerShowTimer = null;
			showSyncBannerNow(msg);
		}, SYNC_BANNER_DEBOUNCE);
	}

	function showSyncBannerNow(msg) {
		if (syncBannerHideTimer) {
			clearTimeout(syncBannerHideTimer);
			syncBannerHideTimer = null;
		}
		if (!syncBannerEl) {
			syncBannerEl = document.createElement('div');
			syncBannerEl.id = 'syncOfflineBanner';
			syncBannerEl.style.cssText =
				'position:fixed;bottom:66px;left:16px;max-width:260px;' +
				'background:#1a0a0a;color:#f88;border:1px solid #5a1a1a;' +
				'font-family:monospace;font-size:11px;padding:8px 12px;z-index:2147483647;' +
				'text-align:left;pointer-events:none;opacity:0;border-radius:6px;' +
				'box-shadow:0 4px 16px rgba(0,0,0,0.4);' +
				'transition:opacity 0.25s ease, transform 0.25s ease;transform:translateY(6px);';
			var attach = function () {
				document.body.appendChild(syncBannerEl);
				syncBannerEl.textContent = msg;
				requestAnimationFrame(function () {
					requestAnimationFrame(function () {
						if (syncBannerEl && !notifPanelOpen) {
							syncBannerEl.style.opacity = '1';
							syncBannerEl.style.transform = 'translateY(0)';
						}
					});
				});
			};
			if (document.body) attach();
			else document.addEventListener('DOMContentLoaded', attach, { once: true });
			return;
		}
		syncBannerEl.textContent = msg;
		if (!notifPanelOpen) {
			syncBannerEl.style.opacity = '1';
			syncBannerEl.style.transform = 'translateY(0)';
		}
	}

	function cancelSyncBanner() {
		if (syncBannerShowTimer) {
			clearTimeout(syncBannerShowTimer);
			syncBannerShowTimer = null;
		}
		hideSyncBanner();
	}

	function hideSyncBanner() {
		if (!syncBannerEl) return;
		syncBannerEl.style.opacity = '0';
		syncBannerEl.style.transform = 'translateY(6px)';
		syncBannerHideTimer = setTimeout(function () {
			if (syncBannerEl && syncBannerEl.parentNode) {
				syncBannerEl.parentNode.removeChild(syncBannerEl);
			}
			syncBannerEl = null;
		}, 300);
	}

	var notifPanelOpen = false;

	function syncBannerVisibilityForNotif() {
		if (!syncBannerEl) return;
		if (notifPanelOpen) {
			syncBannerEl.style.opacity = '0';
			syncBannerEl.style.transform = 'translateY(6px)';
		} else if (syncBannerEl.textContent) {
			syncBannerEl.style.opacity = '1';
			syncBannerEl.style.transform = 'translateY(0)';
		}
	}

	function watchNotifPanel() {
		var panel = document.getElementById('notifPanel');
		if (!panel) {
			document.addEventListener('DOMContentLoaded', watchNotifPanel, { once: true });
			return;
		}
		var observer = new MutationObserver(function () {
			notifPanelOpen = panel.classList.contains('open');
			syncBannerVisibilityForNotif();
		});
		observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
	}

	watchNotifPanel();

	function createOverlay() {
		if (overlayEl || !document.body) return;

		var messages = [
			'downloading data...',
			'pulling your progress...',
			'syncing save...',
			'checking your save is safe...',
			'connecting to the server...',
			'crunching up your data for you...',
			'restoring your session...',
			'warming up the servers...',
			'loading loading loading...',
			'verifying your progress...',
			'reading your save file...',
			'connecting the dots...',
			'almost ready...',
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

	function waitForRevisory() {
		if (window.Revisory) return Promise.resolve(window.Revisory);
		return new Promise(function (resolve) {
			var tries = 0;
			var iv = setInterval(function () {
				tries++;
				if (window.Revisory || tries > 100) {
					clearInterval(iv);
					resolve(window.Revisory || null);
				}
			}, 50);
		});
	}

	function applyFieldsDirectly(fields) {
		SYNC_KEYS.forEach(function (key) {
			if (!Object.prototype.hasOwnProperty.call(fields, key)) return;
			var serverVal = fields[key];
			if (serverVal === null) {
				origRemoveItem.call(localStorage, key);
			} else {
				origSetItem.call(localStorage, key, serverVal);
			}
		});
	}

	function pullSync() {
		var token = getToken();
		if (!token) return;

		var xhr = new XMLHttpRequest();
		try {
			xhr.open('GET', API + '/pull', false);
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			xhr.send(null);
		} catch (e) {
			console.warn('[sync] pull network error:', e ? e.message || e : 'unknown error');
			queueSyncBanner("couldn't connect to the server! playing offline");
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
			queueSyncBanner('sync unavailable right now! using local data...');
			return;
		}

		var data;
		try {
			data = JSON.parse(xhr.responseText);
		} catch (e) {
			console.warn('[sync] pull JSON parse error:', e ? e.message || e : 'unknown error');
			return;
		}
		if (!data || !data.fields) return;

		waitForRevisory().then(function (Revisory) {
			if (!Revisory) {
				console.warn('[sync] Revisory unavailable, applying pull directly as a fallback');
				applyFieldsDirectly(data.fields);
				cancelSyncBanner();
				return;
			}

			var incomingSnapshot = {};
			SYNC_KEYS.forEach(function (key) {
				if (Object.prototype.hasOwnProperty.call(data.fields, key)) {
					var v = data.fields[key];
					if (v !== null) incomingSnapshot[key] = v;
				} else {
					var local = origGetItem.call(localStorage, key);
					if (local !== null) incomingSnapshot[key] = local;
				}
			});

			var incomingMeta = Object.assign({ ts: Date.now() }, data.meta || {});

			Revisory.ingestSync(incomingSnapshot, incomingMeta)
				.then(function (result) {
					if (result.applied) {
						cancelSyncBanner();
					} else {
						console.warn(
							'[sync] incoming pull was quarantined instead of applied:',
							result.classification,
							result.reasons
						);
						queueSyncBanner(
							'a sync looked unsafe (' +
								result.classification +
								') and was held for review in revisory'
						);
						document.dispatchEvent(
							new CustomEvent('revisorySyncQuarantined', {
								detail: {
									quarantineId: result.quarantineId,
									classification: result.classification,
								},
							})
						);
					}
				})
				.catch(function (e) {
					console.error('[sync] revisory ingestSync failed, falling back to direct apply:', e);
					applyFieldsDirectly(data.fields);
					cancelSyncBanner();
				});
		});
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

	window.addEventListener('offline', function () {
		if (getToken()) queueSyncBanner('no internet connection! playing offline');
	});
	window.addEventListener('online', function () {
		cancelSyncBanner();
		flushDirty();
	});

	init();
})();
