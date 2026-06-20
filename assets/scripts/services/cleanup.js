console.log(performance.now());

(function () {
	'use strict';

	const $ = (id) => document.getElementById(id);

	const INITIAL_CLEANUP_DELAY = 1000;
	const TICK_INTERVAL_VISIBLE = 5000;
	const TICK_INTERVAL_HIDDEN = 60000;
	const THOROUGH_TICK_THRESHOLD = 6;
	const LONG_TERM_TICK_THRESHOLD = 24;
	const HEALTH_FAILURE_THRESHOLD = 3;
	const STORAGE_WARNING_THRESHOLD_BYTES = 3.5 * 1024 * 1024;

	const taskFailures = new Map();
	let lastTickTime = performance.now();
	let tickCount = 0;
	let lastLsSize = 0;
	let schedulerHandle = null;

	function runTask(name, fn) {
		try {
			fn();
			taskFailures.set(name, 0);
		} catch (e) {
			const fails = (taskFailures.get(name) || 0) + 1;
			taskFailures.set(name, fails);
			if (fails >= HEALTH_FAILURE_THRESHOLD) {
				console.warn(`[cleanup] task "${name}" failing repeatedly:`, e);
			}
		}
	}

	function cleanSpinner() {
		const spinner = $('spinner');
		const rollBtn = $('rollBtn');
		if (spinner && rollBtn && !rollBtn.disabled && spinner.children.length > 2) {
			spinner.innerHTML = '';
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
		if (ctx) {
			if (ctx.state === 'suspended') {
				ctx.resume().catch(() => {});
			} else if (ctx.state === 'closed') {
				window.audioContext = null;
			}
		}
	}

	function patchPotionDisplay() {
		const orig = window.updateActivePotionsDisplay;
		if (typeof orig !== 'function' || orig._cleanupPatched) return;

		let lastSnapshot = null;

		window.updateActivePotionsDisplay = function () {
			const ap = (typeof activePotions !== 'undefined' ? activePotions : window.activePotions) || [];
			const dup = (typeof duplicateRollsLeft !== 'undefined' ? duplicateRollsLeft : window.duplicateRollsLeft) || 0;

			const snapshot =
				ap.map((p) => p.type + ':' + Math.ceil((p.endTime - Date.now()) / 1000)).join(',') +
				'|dup:' +
				dup;

			if (snapshot === lastSnapshot) return;
			lastSnapshot = snapshot;
			orig.apply(this, arguments);
		};
		window.updateActivePotionsDisplay._cleanupPatched = true;
	}

	function fixPageContainerHeight() {
		const container = document.querySelector('.page-container');
		if (!container) return;
		const idx = parseInt(localStorage.getItem('currentPage') || '0', 10);
		const activePage = $('page-' + (idx + 1));
		if (!activePage) return;
		const real = activePage.scrollHeight;
		const current = parseInt(container.style.height, 10) || 0;
		if (Math.abs(real - current) > 80) {
			container.style.height = real + 'px';
		}
	}

	function checkLuckBoostOverlay() {
		const overlay = $('luckBoostOverlay');
		const timerEl = $('luckTimer');
		if (overlay && overlay.style.display === 'flex' && timerEl) {
			if (timerEl.textContent === '0' || timerEl.textContent === '') {
				overlay.style.display = 'none';
			}
		}
	}

	function trimNotifications() {
		const KEY = 'notifications';
		const MAX = 150;
		const STALE_MS = 7 * 24 * 60 * 60 * 1000;
		const raw = localStorage.getItem(KEY);
		if (!raw) return;
		let arr = JSON.parse(raw);
		if (!Array.isArray(arr)) return;

		const now = Date.now();
		const initialLen = arr.length;
		arr = arr.filter((n) => !(n.read && now - n.ts > STALE_MS));
		if (arr.length > MAX) arr = arr.slice(-MAX);

		if (arr.length !== initialLen) {
			localStorage.setItem(KEY, JSON.stringify(arr));
		}
	}

	function pruneDevLog() {
		const log = $('dc-log');
		if (log && log.children.length > 100) {
			while (log.children.length > 50) {
				log.removeChild(log.firstChild);
			}
		}
	}

	function cleanRarityTrail() {
		const trail = $('rarityTrail');
		if (trail && trail.children.length > 20) {
			const trailRect = trail.getBoundingClientRect();
			Array.from(trail.children).forEach((pill) => {
				if (pill.getBoundingClientRect().left >= trailRect.right) {
					pill.remove();
				}
			});
		}
	}

	function cleanWellRipples() {
		document.querySelectorAll('.well-ripple').forEach((r) => {
			const opacity = window.getComputedStyle(r).opacity;
			if (opacity === '0') r.remove();
		});
	}

	function checkLocalStorageSize() {
		let total = 0;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			total += (key.length + (localStorage.getItem(key) || '').length) * 2;
		}
		const kb = (total / 1024).toFixed(1);
		window._cleanupLsKB = parseFloat(kb);

		if (total > STORAGE_WARNING_THRESHOLD_BYTES) {
			console.warn(`[cleanup] localStorage at ${kb}KB — approaching 5MB quota!`);
		}
		if (lastLsSize > 0 && total > lastLsSize + 1024 * 100 && tickCount % LONG_TERM_TICK_THRESHOLD === 0) {
			console.warn(`[cleanup] significant localStorage growth detected: ${kb}KB`);
		}
		lastLsSize = total;
	}

	function performCleanup(mode) {
		const isManual = mode === 'manual';
		const isThorough = isManual || mode === 'thorough' || tickCount % THOROUGH_TICK_THRESHOLD === 0;
		const isLongTerm = isManual || tickCount % LONG_TERM_TICK_THRESHOLD === 0;

		runTask('spinner', cleanSpinner);
		runTask('canvases', cleanOrphanedCanvases);
		runTask('audio', resumeAudioContext);
		runTask('luckBoost', checkLuckBoostOverlay);
		runTask('rarityTrail', cleanRarityTrail);
		runTask('wellRipples', cleanWellRipples);

		if (isThorough) {
			runTask('highlights', cleanNewRollHighlights);
			runTask('containerHeight', fixPageContainerHeight);
			runTask('potionDisplay', patchPotionDisplay);
			runTask('devLog', pruneDevLog);
		}

		if (isLongTerm) {
			runTask('notifications', trimNotifications);
			runTask('storageSize', checkLocalStorageSize);
		}

		tickCount++;
	}

	function scheduleNext() {
		const interval = document.hidden ? TICK_INTERVAL_HIDDEN : TICK_INTERVAL_VISIBLE;
		const now = performance.now();
		const timeSinceLast = now - lastTickTime;

		if (timeSinceLast >= interval) {
			const run = () => {
				performCleanup(document.hidden ? 'standard' : 'thorough');
				lastTickTime = performance.now();
				scheduleNext();
			};

			if (window.requestIdleCallback) {
				schedulerHandle = window.requestIdleCallback(run, { timeout: 2000 });
			} else {
				schedulerHandle = setTimeout(run, 0);
			}
		} else {
			schedulerHandle = setTimeout(scheduleNext, interval - timeSinceLast);
		}
	}

	document.addEventListener('visibilitychange', () => {
		if (schedulerHandle) {
			if (window.cancelIdleCallback) window.cancelIdleCallback(schedulerHandle);
			else clearTimeout(schedulerHandle);
		}

		if (!document.hidden) {
			performCleanup('thorough');
			lastTickTime = performance.now();
		}
		scheduleNext();
	});

	window.addEventListener('load', () => {
		setTimeout(() => {
			performCleanup('thorough');
			scheduleNext();
		}, INITIAL_CLEANUP_DELAY);
	});

	// if you're reading this, you're cool. you now have the privilege of knowing the knowledge:
	// call window.forceCleanup() from the eruda console or devOverlay to manually clean up
	window.forceCleanup = function () {
		performCleanup('manual');
		console.log(
			`[cleanup] manual run complete. LS: ${window._cleanupLsKB || '?'}KB | ` +
				`spinner: ${$('spinner')?.children.length ?? '?'} | ` +
				`highlights cleared.`
		);
	};
})();
