'use strict';

(function () {
	const API = 'https://leaderboard.authsrng.xyz/api/leaderboard';

	function getInventoryArray() {
		try {
			return JSON.parse(localStorage.getItem('rarityInventory') || '[]');
		} catch (_) {
			return [];
		}
	}

	function denomOf(item) {
		return item.denom || (item.chance ? Math.round(1 / item.chance) : 0);
	}

	function getRarest(inv) {
		let best = { name: null, denom: 0 };
		for (const item of inv) {
			const denom = denomOf(item);
			if (denom > best.denom) best = { name: item.name, denom };
		}
		return best;
	}

	function buildPayload() {
		const inv = getInventoryArray();
		const rarest = getRarest(inv);
		let achievements = [];
		try {
			achievements = JSON.parse(localStorage.getItem('achievementsUnlocked') || '[]');
		} catch (_) {}
		return {
			rolls: parseInt(localStorage.getItem('totalRolls') || '0'),
			rarities: inv.reduce((s, i) => s + (parseInt(i.count) || 0), 0),
			rarestName: rarest.name || 'none',
			rarestDenom: rarest.denom,
			playtime: parseInt(localStorage.getItem('totalPlaytime') || '0'),
			points: parseInt(localStorage.getItem('shopPoints') || '0'),
			achievements,
		};
	}

	function headers() {
		const t = window.AuthAccount ? window.AuthAccount.getToken() : null;
		return { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) };
	}

	async function call(method, path) {
		const r = await fetch(API + path, { method, headers: headers() });
		let d = {};
		try {
			d = await r.json();
		} catch (_) {}
		if (!r.ok) throw new Error(d.error || 'request failed');
		return d;
	}

	function setStatus(msg, color) {
		const s = document.getElementById('lbStatus');
		if (!s) return;
		s.textContent = msg;
		s.style.color = color || '';
	}

	async function buildUI() {
		const section = document.getElementById('leaderboardSection');
		if (!section) return;
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) {
			section.innerHTML =
				'<small class="helper" style="margin-top:6px;display:block;">log in to join the leaderboard.</small>';
			return;
		}
		let me;
		try {
			me = await call('GET', '/me');
		} catch (e) {
			section.innerHTML =
				'<small class="helper" style="margin-top:6px;display:block;">leaderboard unavailable right now.</small>';
			return;
		}
		if (!me.optedIn && !me.eligible) {
			section.innerHTML =
				'<small class="helper" style="margin-top:6px;display:block;">reach ' +
				me.minRolls.toLocaleString() +
				' synced rolls to unlock the leaderboard. <span style="opacity:0.5;">(you have ' +
				me.rolls.toLocaleString() +
				')</span></small>';
			return;
		}
		if (!me.optedIn) {
			section.innerHTML =
				'<button id="enableLbBtn" class="small" style="width:100%;margin-top:4px;">join leaderboard</button><small class="helper" style="margin-top:6px;display:block;">your stats are shown publicly under your account username and update automatically from your cloud save. <a href="/assets/frontend/leaderboard.html" style="opacity:0.6;" target="_blank" rel="noopener noreferrer">view leaderboard</a></small><div id="lbStatus" style="font-size:0.8em;min-height:1.2em;"></div>';
			document.getElementById('enableLbBtn').addEventListener('click', async () => {
				try {
					if (window.Sync) await window.Sync.syncNow();
					await call('POST', '/join');
					buildUI();
				} catch (e) {
					console.warn('[leaderboard] failed to join leaderboard:', e);
					setStatus(e.message, '#ff8888');
				}
			});
			return;
		}
		section.innerHTML =
			'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:0.85em;opacity:0.8;">leaderboard: <span style="color:#88dd88;">on</span></span><button id="disableLbBtn" class="small" style="opacity:0.5;">opt out</button></div><a href="/assets/frontend/leaderboard.html" target="_blank" rel="noopener noreferrer">view leaderboard</a><div id="lbStatus" style="font-size:0.8em;min-height:1.2em;"></div>';
		document.getElementById('disableLbBtn').addEventListener('click', async () => {
			if (!confirm('opt out and remove your leaderboard entry?')) return;
			try {
				await call('DELETE', '');
				buildUI();
			} catch (e) {
				console.warn('[leaderboard] failed to opt out of leaderboard:', e);
				setStatus(e.message, '#ff8888');
			}
		});
	}

	window.LeaderboardSubmit = { buildPayload, getRarest };
	document.addEventListener('authchange', buildUI);
	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', buildUI)
		: buildUI();
})();
