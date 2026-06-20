console.log(performance.now());

// cleanup.js
// cleanup shit because im too damn lazy to patch stupid memory leaks

(function () {
	'use strict';

	const $ = (id) => document.getElementById(id);

	const LIGHT_PASS_INTERVAL_VISIBLE_MS = 5000;
	const LIGHT_PASS_INTERVAL_HIDDEN_MS = 20000;
	const MEDIUM_PASS_INTERVAL_MS = 30000;
	const HEAVY_PASS_INTERVAL_MS = 120000;
	const STALE_SPINNER_CHILD_THRESHOLD = 2;
	const TRAIL_PILL_MAX = 40;
	const PAGE_HEIGHT_DRIFT_THRESHOLD_PX = 80;
	const NOTIF_TRIM_MAX = 150;
	const NOTIF_STALE_READ_MS = 7 * 24 * 60 * 60 * 1000;
	const LOCALSTORAGE_WARN_BYTES = 3.5 * 1024 * 1024;
	const LOCALSTORAGE_GROWTH_NOISE_FLOOR_KB = 5;
	const LOCALSTORAGE_GROWTH_WARN_STREAK = 3;
	const TASK_FAILURE_WARN_THRESHOLD = 3;
	const PATCH_POTION_DISPLAY_RETRY_MS = 500;

	const taskFailureCounts = new Map();

	function safeRun(name, fn) {
		try {
			fn();
			taskFailureCounts.set(name, 0);
			return true;
		} catch (err) {
			const count = (taskFailureCounts.get(name) || 0) + 1;
			taskFailureCounts.set(name, count);
			if (count === TASK_FAILURE_WARN_THRESHOLD) {
				console.warn('[cleanup] task "' + name + '" has failed ' + count + ' times in a row:', err);
			}
			return false;
		}
	}

	function cleanSpinner() {
		const spinner = $('spinner');
		const rollBtn = $('rollBtn');
		if (!spinner || !rollBtn) return;
		if (rollBtn.disabled) return;
		if (spinner.children.length > STALE_SPINNER_CHILD_THRESHOLD) {
			// keep whatever is currently displayed (always the last child)
			// so the cleanup only trims the dead decoy items, not your result
			const current = spinner.lastElementChild;
			spinner.innerHTML = '';
			if (current) spinner.appendChild(current);
			spinner.style.transition = 'none';
			spinner.style.transform = 'translateY(0)';
		}
	}

	function cleanOrphanedCanvases() {
		document.querySelectorAll('canvas').forEach((c) => {
			if (!c.id && c.style.position === 'fixed') {
				c.remove();
			}
		});
	}

	function cleanNewRollHighlights() {
		document.querySelectorAll('#inventoryList .new-roll').forEach((el) => {
			el.classList.remove('new-roll');
		});
	}

	function resumeAudioContext() {
		const ctx = window.audioContext;
		if (!ctx) return;
		if (ctx.state === 'suspended') {
			ctx.resume().catch(() => {});
		}
		if (ctx.state === 'closed') {
			window.audioContext = null;
		}
	}

	function patchPotionDisplay() {
		const orig = window.updateActivePotionsDisplay;
		if (typeof orig !== 'function') return false;

		let lastSnapshot = null;

		window.updateActivePotionsDisplay = function () {
			const ap = typeof activePotions !== 'undefined' ? activePotions : null;
			const dup = typeof duplicateRollsLeft !== 'undefined' ? duplicateRollsLeft : null;

			if (ap === null || dup === null) {
				orig.apply(this, arguments);
				return;
			}

			const snapshot =
				ap.map((p) => p.type + ':' + Math.ceil((p.endTime - Date.now()) / 1000)).join(',') +
				'|dup:' +
				dup;

			if (snapshot === lastSnapshot) return;
			lastSnapshot = snapshot;
			orig.apply(this, arguments);
		};

		return true;
	}

	function fixPageContainerHeight() {
		const container = document.querySelector('.page-container');
		if (!container) return;
		const idx = typeof window._currentPage === 'number' ? window._currentPage : 0;
		const activePage = document.getElementById('page-' + (idx + 1));
		if (!activePage) return;
		const real = activePage.scrollHeight;
		const current = parseInt(container.style.height, 10) || 0;
		if (Math.abs(real - current) > PAGE_HEIGHT_DRIFT_THRESHOLD_PX) {
			container.style.height = real + 'px';
		}
	}

	function checkLuckBoostOverlay() {
		const overlay = $('luckBoostOverlay');
		if (!overlay || overlay.style.display !== 'flex') return;

		const active = typeof luckBoostActive !== 'undefined' ? luckBoostActive : null;
		const endTime = typeof luckBoostEndTime !== 'undefined' ? luckBoostEndTime : null;

		if (active !== null && endTime !== null) {
			if (!active || Date.now() >= endTime) {
				if (typeof endLuckBoost === 'function') {
					endLuckBoost();
				} else {
					overlay.style.display = 'none';
				}
			}
			return;
		}

		const timerEl = $('luckTimer');
		if (timerEl && (timerEl.textContent === '0' || timerEl.textContent === '')) {
			overlay.style.display = 'none';
		}
	}

	function pruneRarityTrail() {
		const trail = $('rarityTrail');
		if (!trail) return;
		const pills = trail.querySelectorAll('.trail-pill');
		const excess = pills.length - TRAIL_PILL_MAX;
		if (excess <= 0) return;
		for (let i = 0; i < excess; i++) {
			pills[i].remove();
		}
	}

	function trimNotifications() {
		if (typeof notifications === 'undefined' || !Array.isArray(notifications)) return;
		const now = Date.now();
		const before = notifications.length;
		let trimmed = notifications.filter((n) => !(n.read && now - n.ts > NOTIF_STALE_READ_MS));
		if (trimmed.length > NOTIF_TRIM_MAX) {
			trimmed = trimmed.slice(trimmed.length - NOTIF_TRIM_MAX);
		}
		if (trimmed.length === before) return;

		notifications = trimmed;
		try {
			localStorage.setItem('notifications', JSON.stringify(notifications));
		} catch (e) {}

		if (typeof updateNotifBadge === 'function') updateNotifBadge();
		if (
			typeof notifPanelOpen !== 'undefined' &&
			notifPanelOpen &&
			typeof renderNotifList === 'function'
		) {
			renderNotifList();
		}
	}

	let lastLsKB = null;
	let lsGrowthStreak = 0;

	function checkLocalStorageSize() {
		let total = 0;
		for (const key of Object.keys(localStorage)) {
			total += ((localStorage.getItem(key) || '').length + key.length) * 2;
		}
		const kb = total / 1024;
		window._cleanupLsKB = parseFloat(kb.toFixed(1));

		if (lastLsKB !== null && kb > lastLsKB + LOCALSTORAGE_GROWTH_NOISE_FLOOR_KB) {
			lsGrowthStreak++;
		} else {
			lsGrowthStreak = 0;
		}
		lastLsKB = kb;

		if (lsGrowthStreak >= LOCALSTORAGE_GROWTH_WARN_STREAK) {
			console.warn(
				'[cleanup] localStorage keeps growing despite cleanup passes (' +
					kb.toFixed(1) +
					'KB, ' +
					lsGrowthStreak +
					' consecutive growth passes)'
			);
		}
		if (total > LOCALSTORAGE_WARN_BYTES) {
			console.warn(
				'[cleanup] localStorage at ' + kb.toFixed(1) + 'KB — getting close to 5MB quota!'
			);
		}
	}

	function runLightPass() {
		safeRun('cleanSpinner', cleanSpinner);
		safeRun('cleanOrphanedCanvases', cleanOrphanedCanvases);
		safeRun('resumeAudioContext', resumeAudioContext);
		safeRun('checkLuckBoostOverlay', checkLuckBoostOverlay);
		safeRun('pruneRarityTrail', pruneRarityTrail);
	}

	function runMediumPass() {
		safeRun('cleanNewRollHighlights', cleanNewRollHighlights);
		safeRun('fixPageContainerHeight', fixPageContainerHeight);
	}

	function runHeavyPass() {
		safeRun('trimNotifications', trimNotifications);
		safeRun('checkLocalStorageSize', checkLocalStorageSize);
	}

	function runFullPass() {
		runLightPass();
		runMediumPass();
		runHeavyPass();
	}

	let lastMediumPassAt = 0;
	let lastHeavyPassAt = 0;

	function maybeRunMediumAndHeavy() {
		const now = Date.now();
		if (now - lastMediumPassAt >= MEDIUM_PASS_INTERVAL_MS) {
			safeRun('cleanNewRollHighlights', cleanNewRollHighlights);
			safeRun('fixPageContainerHeight', fixPageContainerHeight);
			lastMediumPassAt = now;
		}
		if (now - lastHeavyPassAt >= HEAVY_PASS_INTERVAL_MS) {
			safeRun('trimNotifications', trimNotifications);
			safeRun('checkLocalStorageSize', checkLocalStorageSize);
			lastHeavyPassAt = now;
		}
	}

	function tick() {
		runLightPass();
		maybeRunMediumAndHeavy();
		scheduleNext();
	}

	function scheduleNext() {
		const interval = document.hidden
			? LIGHT_PASS_INTERVAL_HIDDEN_MS
			: LIGHT_PASS_INTERVAL_VISIBLE_MS;
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(tick, { timeout: interval });
		} else {
			setTimeout(tick, interval);
		}
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) return;
		runFullPass();
		lastMediumPassAt = Date.now();
		lastHeavyPassAt = Date.now();
	});

	window.addEventListener('load', () => {
		if (
			!safeRun('patchPotionDisplay', () => {
				if (!patchPotionDisplay()) throw new Error('updateActivePotionsDisplay not ready');
			})
		) {
			setTimeout(() => {
				safeRun('patchPotionDisplay', () => {
					patchPotionDisplay();
				});
			}, PATCH_POTION_DISPLAY_RETRY_MS);
		}
		runFullPass();
		lastMediumPassAt = Date.now();
		lastHeavyPassAt = Date.now();
		scheduleNext();
	});

	// if you're reading this, you're cool. you now have the privilege of knowing the knowledge:
	// call window.forceCleanup() from the eruda console or devOverlay to manually clean up
	window.forceCleanup = function () {
		runFullPass();
		lastMediumPassAt = Date.now();
		lastHeavyPassAt = Date.now();
		console.log(
			'[cleanup] manual run done!!!' +
				' LS: ' +
				(window._cleanupLsKB || '?') +
				'KB' +
				' | spinner children: ' +
				($('spinner')?.children.length ?? '?') +
				' | trail pills: ' +
				($('rarityTrail')?.querySelectorAll('.trail-pill').length ?? '?') +
				' | new-roll els: 0 (just cleared)'
		);
	};
})();
