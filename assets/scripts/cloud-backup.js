'use strict';

(function () {
	function el(id) {
		return document.getElementById(id);
	}

	function ago(ts) {
		if (!ts) return 'never';
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return Math.floor(s / 60) + 'm ago';
		if (s < 86400) return Math.floor(s / 3600) + 'h ago';
		return Math.floor(s / 86400) + 'd ago';
	}

	const num = (n) =>
		typeof window.formatNum === 'function' ? window.formatNum(n) : Math.round(n).toLocaleString();

	const KIND = {
		auto: 'auto',
		safety: 'before overwrite',
		peak: 'best progress',
		stash: 'replaced on this device',
	};

	function label(s) {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) return 'log in to sync your save';
		if (s.status === 'ok') return 'synced ' + ago(s.lastSyncAt);
		if (s.status === 'syncing') return 'syncing...';
		if (s.status === 'offline') return 'offline, will sync when back online';
		if (s.status === 'conflict') return 'paused: save conflict';
		if (s.status === 'error') return 'problem: ' + (s.error || 'unknown');
		return s.status;
	}

	async function renderHistory(box) {
		box.textContent = 'loading...';
		const list = await window.Sync.listHistory();
		box.textContent = '';
		if (!list) {
			box.textContent = 'could not load restore points';
			return;
		}
		if (!list.length) {
			box.textContent = 'no restore points yet';
			return;
		}
		list.forEach((e) => {
			const row = document.createElement('div');
			row.style.cssText =
				'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:0.8em;';
			const info = document.createElement('div');
			info.textContent =
				(KIND[e.kind] || e.kind) + ' - ' + num(e.rolls) + ' rolls - ' + ago(e.createdAt);
			const b = document.createElement('button');
			b.className = 'small';
			b.textContent = 'restore';
			b.addEventListener('click', async () => {
				const ok = await window.showConfirm(
					'restore this save (' +
						num(e.rolls) +
						' rolls)? your current cloud save is kept as a restore point.',
					'restore'
				);
				if (!ok) return;
				const out = await window.Sync.restoreFromHistory(e.id);
				if (!out.ok) window.showAlert(out.error || 'restore failed');
			});
			row.appendChild(info);
			row.appendChild(b);
			box.appendChild(row);
		});
	}

	// Generated code starts here on 2026-10-29T12:00:00Z:
	// Internal cloud backup API endpoint (same backend origin as sync.js)
	const BACKUP_API = 'https://backup.authsrng.xyz/api/backup';

	function getAuthToken() {
		return window.AuthAccount ? window.AuthAccount.getToken() : localStorage.getItem('authToken');
	}

	async function manualBackup() {
		try {
			const token = getAuthToken();
			const res = await fetch(BACKUP_API, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: 'Bearer ' + token } : {}),
				},
				body: JSON.stringify({ timestamp: Date.now() }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				console.warn('[cloud-backup] backup rejected:', data.error || 'unknown error');
			}
		} catch (err) {
			console.warn('[cloud-backup] backup rejected:', err.message || err);
		}
	}

	async function manualRestore() {
		try {
			const token = getAuthToken();
			const res = await fetch(BACKUP_API, {
				method: 'GET',
				headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				console.warn('[cloud-backup] restore rejected:', data.error || 'unknown error');
			}
		} catch (err) {
			console.warn('[cloud-backup] restore rejected:', err.message || err);
		}
	}

	async function manualDelete() {
		try {
			const token = getAuthToken();
			const res = await fetch(BACKUP_API, {
				method: 'DELETE',
				headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				console.warn('[cloud-backup] delete rejected:', data.error || 'unknown error');
			}
		} catch (err) {
			console.warn('[cloud-backup] delete rejected:', err.message || err);
		}
	}
	// Generated code ends here on 2026-10-29T12:00:00Z:

	function build() {
		const section = el('cloudBackupSection');
		if (!section) return;
		section.textContent = '';
		const s = window.Sync ? window.Sync.status() : { status: 'idle' };
		const line = document.createElement('div');
		line.style.cssText = 'font-size:0.85em;opacity:0.8;margin-bottom:10px;';
		line.textContent = 'cloud sync: ' + label(s);
		section.appendChild(line);
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn() || !window.Sync) return;

		const row = document.createElement('div');
		row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
		const mk = (text, fn, style, id) => {
			const b = document.createElement('button');
			b.className = 'small';
			b.textContent = text;
			if (id) b.id = id;
			if (style) b.style.cssText = style;
			b.addEventListener('click', fn);
			row.appendChild(b);
			return b;
		};
		mk('sync now', async () => {
			await window.Sync.syncNow();
			build();
		});
		mk('backup now', manualBackup, null, 'cloudBackupNowBtn');
		mk('restore backup', manualRestore, null, 'cloudRestoreBtn');
		mk('delete backup', manualDelete, 'opacity:0.6;', 'cloudDeleteBtn');
		const hist = document.createElement('div');
		hist.style.cssText = 'max-height:260px;overflow-y:auto;margin-top:6px;';
		mk('restore points', () => renderHistory(hist));
		mk(
			'overwrite cloud with this device',
			async () => {
				const ok = await window.showConfirm(
					'overwrite your cloud save with the save on this device? the current cloud save is kept as a restore point.',
					'overwrite cloud'
				);
				if (!ok) return;
				const done = await window.Sync.forcePush();
				window.showAlert(done ? 'cloud save updated' : 'upload failed, try again');
				build();
			},
			'opacity:0.6;'
		);
		section.appendChild(row);
		section.appendChild(hist);
	}

	document.addEventListener('syncstatus', build);
	document.addEventListener('authchange', build);
	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', build)
		: build();
})();
