console.log(performance.now());

(function () {
	const LABS_KEY = 'labsMode';
	const NIGHTLY = 'https://authsrng.xyz';

	function isOnNightly() {
		return location.hostname === 'nightly.authsrng.xyz';
	}

	function showFetchingOverlay(msg) {
		let overlay = document.getElementById('labsFetchOverlay');
		if (overlay) {
			overlay.querySelector('#labsFetchStatus').textContent = msg;
			return;
		}
		overlay = document.createElement('div');
		overlay.id = 'labsFetchOverlay';
		overlay.style.cssText =
			'position:fixed;inset:0;background:var(--bg-color,#0e0e0e);z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;gap:10px;';
		overlay.innerHTML = `
      <div id="labsFetchStatus" style="font-size:1.1em;color:var(--text-color,#dcdcdc);opacity:0.8;">${msg}</div>
      <div style="font-size:0.75em;color:var(--text-color,#dcdcdc);opacity:0.3;">authsrng.xyz</div>
    `;
		document.body.appendChild(overlay);
	}

	function setFetchingStatus(msg) {
		const el = document.getElementById('labsFetchStatus');
		if (el) el.textContent = msg;
	}

	function hideFetchingOverlay() {
		const el = document.getElementById('labsFetchOverlay');
		if (el) el.remove();
	}

	async function activateLabs() {
    console.log('showConfirm:', typeof window.showConfirm);
		const confirmed = await window.showConfirm(
			"labs mode lets you test the new features of auth's RNG natively while keeping your save data intact on the main site! things may break and you may ruin your save data, but you will help make auth's RNG better. you will also send some diagnostic data, but they will not be tied to you in ANY way! they will be sent to sentry to be analyzed.",
			'enter labs mode'
		);
		if (!confirmed) return;

		showFetchingOverlay('fetching nightly...');

		try {
			const res = await fetch(NIGHTLY + '/');
			if (!res.ok) throw new Error('http ' + res.status);

			Sentry.captureMessage('labs mode activated', {
				level: 'info',
				extra: {
					totalRolls: localStorage.getItem('totalRolls'),
					shopUpgrades: localStorage.getItem('shopUpgrades'),
				},
			});

			setFetchingStatus('reloading...');
			localStorage.setItem(LABS_KEY, '1');

			await new Promise((r) => setTimeout(r, 700));
			location.reload();
		} catch (e) {
			Sentry.captureException(e, { extra: { context: 'labs activate' } });
			hideFetchingOverlay();
			window.showAlert('could not reach nightly: ' + e.message);
		}
	}

	function exitLabs() {
		localStorage.removeItem(LABS_KEY);
		location.reload();
	}

	async function injectNightly(html) {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const base = NIGHTLY;

		doc.querySelectorAll('[src],[href]').forEach((el) => {
			['src', 'href'].forEach((attr) => {
				const val = el.getAttribute(attr);
				if (
					val &&
					!val.startsWith('http') &&
					!val.startsWith('//') &&
					!val.startsWith('data:') &&
					!val.startsWith('#') &&
					!val.startsWith('blob:')
				) {
					el.setAttribute(attr, base + '/' + val.replace(/^\//, ''));
				}
			});
		});

		document.body.innerHTML = doc.body.innerHTML;

		doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
			const el = document.createElement('link');
			el.rel = 'stylesheet';
			el.href = link.href;
			document.head.appendChild(el);
		});

		for (const s of Array.from(doc.querySelectorAll('script'))) {
			await new Promise((resolve) => {
				const el = document.createElement('script');
				if (s.src) {
					el.src = s.src;
					el.defer = false;
					el.onload = resolve;
					el.onerror = resolve;
				} else {
					el.textContent = s.textContent;
					resolve();
				}
				document.body.appendChild(el);
			});
		}
	}

	async function autoLoadNightly() {
		showFetchingOverlay('fetching nightly...');
		try {
			const res = await fetch(NIGHTLY + '/');
			if (!res.ok) throw new Error('http ' + res.status);
			const html = await res.text();
			setFetchingStatus('loading...');
			await new Promise((r) => setTimeout(r, 400));
			await injectNightly(html);
			Sentry.captureMessage('nightly injected successfully', { level: 'info' });
		} catch (e) {
			Sentry.captureException(e, { extra: { context: 'labs autoload' } });
			hideFetchingOverlay();
			localStorage.removeItem(LABS_KEY);
			window.showAlert('failed to load nightly: ' + e.message);
		}
	}

	function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(() => {
      // if (isOnNightly()) return;

      const btn = document.getElementById('labsBtn');
      if (btn) btn.addEventListener('click', activateLabs);

      const exitBtn = document.getElementById('exitLabsBtn');
      if (exitBtn) {
          if (localStorage.getItem(LABS_KEY) === '1') exitBtn.style.display = '';
          exitBtn.addEventListener('click', exitLabs);
      }

    if (localStorage.getItem(LABS_KEY) === '1') {
        autoLoadNightly();
    }
  });
})();
