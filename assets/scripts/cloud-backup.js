'use strict';

console.log(performance.now());

(function () {
	const API = 'https://backup.authsrng.xyz/api/backup';

	const SAVE_KEYS = [
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
		'mutationsUnlocked'
	];

	function uid_hash(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) {
			h = (h << 5) - h + str.charCodeAt(i);
			h |= 0;
		}
		return (h >>> 0).toString(16).padStart(8, '0');
	}

	function bundle() {
		const obj = {};
		SAVE_KEYS.forEach((k) => {
			const v = localStorage.getItem(k);
			if (v !== null) obj[k] = v;
		});
		return obj;
	}

	function encode(b) {
		const payload = JSON.stringify(b);
		const env = JSON.stringify({ p: payload, h: uid_hash(payload), t: 'save' });
		return btoa(unescape(encodeURIComponent(env)));
	}

	function decode(input) {
		let env;
		try {
			env = JSON.parse(decodeURIComponent(escape(atob(input.trim()))));
		} catch {
			return { error: 'corrupted data' };
		}
		if (!env?.p || !env?.h || !env?.t) return { error: 'invalid format' };
		if (env.t !== 'save') return { error: 'wrong type' };
		if (uid_hash(env.p) !== env.h) return { error: 'tampered or corrupted' };
		try {
			return { bundle: JSON.parse(env.p) };
		} catch {
			return { error: 'bad json' };
		}
	}

	function isEnabled() {
		return localStorage.getItem('cloudBackupEnabled') === 'true';
	}

	function setEnabled(v) {
		localStorage.setItem('cloudBackupEnabled', String(v));
	}

	function getAutoInterval() {
		return localStorage.getItem('cloudBackupInterval') || '30m';
	}

	function setStatus(msg, color) {
		const el = document.getElementById('cloudBackupStatus');
		if (!el) return;
		el.textContent = msg;
		el.style.color = color || '';
	}

	function setLastBackupDisplay(ts) {
		const el = document.getElementById('cloudLastBackup');
		if (!el) return;
		el.textContent = ts ? 'last backup: ' + new Date(ts).toLocaleString() : 'no backup yet';
	}

	function authHeaders() {
		const token = window.AuthAccount ? window.AuthAccount.getToken() : null;
		return token ? { Authorization: 'Bearer ' + token } : {};
	}

	async function doBackup(silent) {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) return false;
		const payload = encode(bundle());
		if (!silent) setStatus('backing up...', '');

		try {
			const r = await fetch(API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...authHeaders() },
				body: JSON.stringify({ payload })
			});
			const data = await r.json();
			if (!r.ok) {
				if (!silent) setStatus('error: ' + (data.error || r.status), '#ff8888');
				return false;
			}
			localStorage.setItem('lastCloudBackup', data.ts);
			setLastBackupDisplay(data.ts);
			if (!silent) setStatus('backed up at ' + new Date(data.ts).toLocaleString(), '#88dd88');
			return true;
		} catch (e) {
			if (!silent) setStatus('backup failed: ' + e.message, '#ff8888');
			return false;
		}
	}

	async function doRestore() {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) return;
		if (!confirm('restore from cloud? this will overwrite your current save. are you sure?')) return;

		setStatus('restoring...', '');
		try {
			const r = await fetch(API, { headers: authHeaders() });
			const data = await r.json();
			if (!r.ok || !data.payload) {
				setStatus('error: ' + (data.error || 'no backup found'), '#ff8888');
				return;
			}
			const result = decode(data.payload);
			if (result.error) {
				setStatus('restore error: ' + result.error, '#ff8888');
				return;
			}
			Object.keys(result.bundle).forEach((k) => localStorage.setItem(k, result.bundle[k]));
			setStatus('restored! reloading...', '#88dd88');
			setTimeout(() => location.reload(), 600);
		} catch (e) {
			setStatus('restore failed: ' + e.message, '#ff8888');
		}
	}

	async function doDelete() {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) return;
		if (!confirm('permanently delete your cloud backup? this cannot be undone.')) return;

		setStatus('deleting...', '');
		try {
			const r = await fetch(API, { method: 'DELETE', headers: authHeaders() });
			const data = await r.json();
			if (!r.ok) {
				setStatus('error: ' + (data.error || r.status), '#ff8888');
				return;
			}
			localStorage.removeItem('lastCloudBackup');
			setLastBackupDisplay(null);
			setStatus('cloud backup deleted.', '#aaa');
		} catch (e) {
			setStatus('delete failed: ' + e.message, '#ff8888');
		}
	}

	let autoTimer = null;

	function startAutoBackup() {
		clearInterval(autoTimer);
		autoTimer = null;
		if (!isEnabled() || !window.AuthAccount || !window.AuthAccount.isLoggedIn()) return;
		const iv = getAutoInterval();
		const ms = iv === '1h' ? 60 * 60 * 1000 : iv === '3h' ? 3 * 60 * 60 * 1000 : 30 * 60 * 1000;
		autoTimer = setInterval(() => {
			if (!document.hidden) doBackup(true);
		}, ms);
	}

	function buildUI() {
		const section = document.getElementById('cloudBackupSection');
		if (!section) return;

		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) {
			section.innerHTML = `
      <small class="helper" style="margin-top:6px;display:block;">
        log in to enable cloud backups.
      </small>`;
			return;
		}

		if (!isEnabled()) {
			section.innerHTML = `
      <button id="enableCloudBackupBtn" class="small" style="width:100%;margin-top:4px;">enable cloud backups</button>
      <small class="helper" style="margin-top:6px;">your save, stored remotely under your account.</small>
    `;
			document.getElementById('enableCloudBackupBtn').addEventListener('click', async () => {
				setEnabled(true);
				buildUI();
				startAutoBackup();
				doBackup(false);
			});
			return;
		}

		const lastTs = localStorage.getItem('lastCloudBackup');
		const lastStr = lastTs
			? 'last backup: ' + new Date(parseInt(lastTs)).toLocaleString()
			: 'no backup yet';
		const iv = getAutoInterval();

		section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:0.85em;opacity:0.8;">cloud backups: <span style="color:#88dd88;">on</span></span>
      <button id="disableCloudBackupBtn" class="small" style="opacity:0.5;">disable</button>
    </div>
    <div id="cloudLastBackup" style="font-size:0.8em;opacity:0.5;margin-bottom:10px;">${lastStr}</div>
    <label style="display:block;font-size:0.85em;margin-bottom:4px;">auto-backup interval:</label>
    <select id="cloudIntervalSelect" style="width:100%;margin-bottom:10px;">
      <option value="30m"${iv === '30m' ? ' selected' : ''}>every 30 minutes</option>
      <option value="1h"${iv === '1h' ? ' selected' : ''}>every 1 hour</option>
      <option value="3h"${iv === '3h' ? ' selected' : ''}>every 3 hours</option>
    </select>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="cloudBackupNowBtn" class="small">backup now</button>
      <button id="cloudRestoreBtn" class="small">restore from cloud</button>
      <button id="cloudDeleteBtn" class="small" style="opacity:0.5;color:#ff8888;">delete backup</button>
    </div>
    <div id="cloudBackupStatus" style="font-size:0.8em;min-height:1.2em;"></div>
  `;

		document.getElementById('disableCloudBackupBtn').addEventListener('click', () => {
			if (!confirm('disable cloud backups? your existing cloud data will not be deleted.')) return;
			setEnabled(false);
			clearInterval(autoTimer);
			autoTimer = null;
			buildUI();
		});

		document.getElementById('cloudIntervalSelect').addEventListener('change', (e) => {
			localStorage.setItem('cloudBackupInterval', e.target.value);
			startAutoBackup();
		});

		document.getElementById('cloudBackupNowBtn').addEventListener('click', () => doBackup(false));
		document.getElementById('cloudRestoreBtn').addEventListener('click', doRestore);
		document.getElementById('cloudDeleteBtn').addEventListener('click', doDelete);
	}

	function init() {
		buildUI();
		if (isEnabled()) startAutoBackup();
		document.addEventListener('authchange', () => {
			buildUI();
			startAutoBackup();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
