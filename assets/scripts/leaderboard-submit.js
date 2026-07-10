'use strict';

console.log(performance.now());

(function () {
	const API = 'https://leaderboard.authsrng.xyz/api/leaderboard';
	const SUBMIT_INTERVAL = 15 * 60 * 1000;

	function getRarest() {
		try {
			const inv = JSON.parse(localStorage.getItem('rarityInventory') || '{}');
			const rarities = window.RARITIES || window.rarities || [];
			let best = { name: null, denom: 0 };
			for (const r of rarities) {
				if (!inv[r.name]) continue;
				const denom = r.denom || r.denominator || (r.chance ? Math.round(1 / r.chance) : 0);
				if (denom > best.denom) best = { name: r.name, denom };
			}
			if (best.name) return best;
		} catch (_) {}
		return {
			name: localStorage.getItem('lbRarestName') || 'none',
			denom: parseInt(localStorage.getItem('lbRarestDenom') || '0')
		};
	}

	function buildPayload() {
		const inv = JSON.parse(localStorage.getItem('rarityInventory') || '{}');
		const totalRarities = Object.values(inv).reduce((s, v) => s + (parseInt(v) || 0), 0);
		const rarest = getRarest();
		return {
			rolls: parseInt(localStorage.getItem('totalRolls') || '0'),
			rarities: totalRarities,
			rarestName: rarest.name || 'none',
			rarestDenom: rarest.denom,
			playtime: parseInt(localStorage.getItem('totalPlaytime') || '0'),
			points: parseInt(localStorage.getItem('shopPoints') || '0')
		};
	}

	function isEnabled() {
		return localStorage.getItem('lbEnabled') === 'true';
	}

	function setStatus(msg, color) {
		const el = document.getElementById('lbStatus');
		if (!el) return;
		el.textContent = msg;
		el.style.color = color || '';
	}

	function authHeaders() {
		const token = window.AuthAccount ? window.AuthAccount.getToken() : null;
		return token ? { Authorization: 'Bearer ' + token } : {};
	}

	async function submit(silent) {
		if (!isEnabled() || !window.AuthAccount || !window.AuthAccount.isLoggedIn()) return false;
		if (!silent) setStatus('submitting...', '');
		try {
			const r = await fetch(API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...authHeaders() },
				body: JSON.stringify(buildPayload())
			});
			const data = await r.json();
			if (!r.ok) {
				if (!silent) setStatus('error: ' + (data.error || r.status), '#ff8888');
				return false;
			}
			if (!silent) setStatus('updated!', '#88dd88');
			return true;
		} catch (e) {
			if (!silent) setStatus('failed: ' + e.message, '#ff8888');
			return false;
		}
	}

	async function deleteEntry() {
		try {
			await fetch(API, { method: 'DELETE', headers: authHeaders() });
		} catch (_) {}
	}

	let autoTimer = null;

	function startAuto() {
		clearInterval(autoTimer);
		if (!isEnabled() || !window.AuthAccount || !window.AuthAccount.isLoggedIn()) return;
		autoTimer = setInterval(() => {
			if (!document.hidden) submit(true);
		}, SUBMIT_INTERVAL);
	}

	function buildUI() {
		const section = document.getElementById('leaderboardSection');
		if (!section) return;

		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) {
			section.innerHTML = `
      <small class="helper" style="margin-top:6px;display:block;">
        log in to join the leaderboard.
      </small>`;
			return;
		}

		const rolls = parseInt(localStorage.getItem('totalRolls') || '0');

		if (!isEnabled()) {
			if (rolls < 1100) {
				section.innerHTML = `
        <small class="helper" style="margin-top:6px;display:block;">
          reach 1,100 rolls to unlock the leaderboard.
          <span style="opacity:0.5;">(you have ${rolls})</span>
        </small>`;
				return;
			}

			section.innerHTML = `
      <button id="enableLbBtn" class="small" style="width:100%;margin-top:4px;">join leaderboard</button>
      <small class="helper" style="margin-top:6px;display:block;">
        your stats shown publicly under your account username.
        <a href="leaderboard.html" style="opacity:0.6;">view leaderboard</a>
      </small>`;

			document.getElementById('enableLbBtn').addEventListener('click', async () => {
				localStorage.setItem('lbEnabled', 'true');
				buildUI();
				startAuto();
				await submit(false);
			});

			return;
		}

		const username = window.AuthAccount.getUsername();

		section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:0.85em;opacity:0.8;">
        leaderboard: <span style="color:#88dd88;">on</span>
        <span style="opacity:0.4;"> — ${username}</span>
      </span>
      <button id="disableLbBtn" class="small" style="opacity:0.5;">opt out</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="lbSubmitNowBtn" class="small">update now</button>
      <a href="leaderboard.html" class="small"
         style="display:inline-block;padding:4px 10px;border:1px solid var(--border-color,#333);text-decoration:none;color:inherit;">
        view leaderboard →
      </a>
    </div>
    <div id="lbStatus" style="font-size:0.8em;min-height:1.2em;"></div>`;

		document.getElementById('disableLbBtn').addEventListener('click', async () => {
			if (!confirm('opt out and delete your leaderboard entry permanently?')) return;
			await deleteEntry();
			localStorage.removeItem('lbEnabled');
			clearInterval(autoTimer);
			buildUI();
		});

		document.getElementById('lbSubmitNowBtn').addEventListener('click', () => submit(false));
	}

	function init() {
		buildUI();
		if (isEnabled()) {
			startAuto();
			submit(true);
		}
		document.addEventListener('authchange', () => {
			buildUI();
			startAuto();
		});
	}

	document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
