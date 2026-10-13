'use strict';
(function () {
	'use strict';
	const win = window;
	if (win.__rescueLoaded) return;
	win.__rescueLoaded = true;
	console.log(performance.now());
	const STALL_MS = 3000;
	const STEP1_WAIT_MS = 1000;
	const STEP2_WAIT_MS = 2000;
	const RESCUE_FLAG_KEY = 'rescueModeReloaded';
	let lastTick = performance.now();
	let level = 0;
	let escalateTimer = null;
	function resetClock() {
		lastTick = performance.now();
	}
	document.addEventListener('visibilitychange', resetClock);
	window.addEventListener('focus', resetClock);
	window.addEventListener('pageshow', resetClock);
	function blockFutureLocalStorageWrites() {
		if (win.__rescueSavesBlocked) return;
		win.__rescueSavesBlocked = true;
		try {
			const proto = Storage.prototype;
			const originalSetItem = proto.setItem;
			const originalRemoveItem = proto.removeItem;
			proto.setItem = function (key, value) {
				if (this === window.localStorage) return;
				return originalSetItem.apply(this, arguments);
			};
			proto.removeItem = function (key) {
				if (this === window.localStorage) return;
				return originalRemoveItem.apply(this, arguments);
			};
		} catch (e) {
			console.warn('[rescue] failed to lock localStorage', e);
		}
	}
	function performResetToDefault() {
		try {
			if (typeof win.flushPlaytime === 'function') win.flushPlaytime();
		} catch (e) {}
		try {
			if (typeof win.saveAllData === 'function') win.saveAllData();
		} catch (e) {
			console.warn('[rescue] final save failed', e);
		}
		try {
			localStorage.removeItem('userSettings');
			localStorage.removeItem('themeEditorActive');
			localStorage.removeItem('themeEditorPresets');
			localStorage.removeItem('startAnimConfig');
		} catch (e) {}
		try {
			document.documentElement.removeAttribute('style');
			document.body.removeAttribute('style');
			document.body.className = '';
			document.body.removeAttribute('data-theme');
			document.body.removeAttribute('data-inv-style');
		} catch (e) {}
		try {
			const glow = document.getElementById('glowBlobsContainer');
			if (glow) glow.remove();
		} catch (e) {}
		try {
			document.body.style.backgroundImage = '';
			document.body.style.backgroundSize = '';
			document.body.style.backgroundPosition = '';
			document.body.style.backgroundAttachment = '';
		} catch (e) {}
		blockFutureLocalStorageWrites();
	}
	function forceReload() {
		try {
			sessionStorage.setItem(RESCUE_FLAG_KEY, '1');
		} catch (e) {}
		setTimeout(() => {
			try {
				location.reload();
			} catch (e) {
				window.location.assign(window.location.href);
			}
		}, 50);
	}
	function armEscalation(forLevel) {
		if (escalateTimer !== null) clearTimeout(escalateTimer);
		const wait = forLevel === 1 ? STEP1_WAIT_MS : STEP2_WAIT_MS;
		escalateTimer = setTimeout(() => {
			if (level === forLevel) {
				console.log('[rescue] stabilized, exiting rescue mode');
				level = 0;
			}
		}, wait);
	}
	function onStall(delta) {
		if (level === 0) {
			console.log('entering rescue mode...');
			console.log('[rescue] stall detected, ' + Math.round(delta) + 'ms');
			level = 1;
			try {
				if (typeof win.forceCleanup === 'function') win.forceCleanup();
				else console.warn('[rescue] forceCleanup unavailable');
			} catch (e) {
				console.warn('[rescue] forceCleanup threw', e);
			}
			armEscalation(1);
		} else if (level === 1) {
			console.log('[rescue] still unstable after cleanup, resetting to defaults');
			level = 2;
			performResetToDefault();
			armEscalation(2);
		} else if (level === 2) {
			console.log('[rescue] still unstable after reset, forcing reload');
			level = 3;
			forceReload();
		}
	}
	function loop() {
		const t = performance.now();
		const delta = t - lastTick;
		lastTick = t;
		if (!document.hidden && level < 3 && delta > STALL_MS) {
			onStall(delta);
		}
		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
	function showRescueWarning() {
		const div = document.createElement('div');
		div.id = 'rescueWarningOverlay';
		Object.assign(div.style, {
			position: 'fixed',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%, -50%)',
			color: '#ff4444',
			background: 'rgba(0,0,0,0.9)',
			border: '1px solid #ff4444',
			boxShadow: '0 0 18px rgba(255,60,60,0.25)',
			padding: '22px 28px',
			borderRadius: '4px',
			fontFamily: 'monospace',
			fontSize: '14px',
			textAlign: 'center',
			zIndex: '2147483647',
			maxWidth: '420px',
			lineHeight: '1.6',
			cursor: 'pointer',
		});
		div.textContent =
			'THE SITE FROZE AND HAD TO FORCE-RELOAD ITSELF. you may want to reset your data, or avoid whatever just caused it to freeze. click to dismiss.';
		div.addEventListener('click', () => div.remove());
		document.body.appendChild(div);
	}
	function checkRescueFlag() {
		try {
			if (sessionStorage.getItem(RESCUE_FLAG_KEY) === '1') {
				sessionStorage.removeItem(RESCUE_FLAG_KEY);
				showRescueWarning();
			}
		} catch (e) {}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', checkRescueFlag);
	} else {
		checkRescueFlag();
	}
	win.__rescueDebug = {
		getLevel: () => level,
		simulateStall: (ms) => onStall(ms || 3500),
	};
})();
//# sourceMappingURL=rescue.js.map
