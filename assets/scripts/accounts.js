'use strict';

console.log(performance.now());

(function () {
	const API = 'https://accounts.authsrng.xyz/api/accounts';
	const TOKEN_KEY = 'authToken';
	const USER_KEY = 'authUsername';
	const UID_KEY = 'authUid';

	function getToken() {
		return localStorage.getItem(TOKEN_KEY);
	}

	function getUsername() {
		return localStorage.getItem(USER_KEY);
	}

	function getUid() {
		return localStorage.getItem(UID_KEY);
	}

	function isLoggedIn() {
		return !!getToken();
	}

	function setSession(token, uid, username) {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(UID_KEY, uid);
		localStorage.setItem(USER_KEY, username);
		document.dispatchEvent(new CustomEvent('authchange'));
	}

	function clearSession() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(UID_KEY);
		localStorage.removeItem(USER_KEY);
		document.dispatchEvent(new CustomEvent('authchange'));
	}

	async function apiCall(path, options) {
		const opts = options || {};
		const headers = opts.headers || {};
		headers['Content-Type'] = 'application/json';
		if (isLoggedIn()) headers['Authorization'] = 'Bearer ' + getToken();
		const res = await fetch(API + path, {
			method: opts.method || 'GET',
			headers,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
		});
		let data;
		try {
			data = await res.json();
		} catch (_) {
			data = {};
		}
		if (res.status === 401 && isLoggedIn()) {
			clearSession();
			updateAccountBtn();
		}
		if (!res.ok) throw new Error(data.error || 'request failed');
		return data;
	}

	function el(id) {
		return document.getElementById(id);
	}

	function showOverlay(id) {
		el(id).classList.add('show');
	}

	function hideOverlay(id) {
		el(id).classList.remove('show');
	}

	function showSyncLoading() {
		const overlay = document.getElementById('syncLoadingOverlay');
		const textEl = document.getElementById('syncLoadingText');
		if (!overlay) return;
	
		const messages = [
			'downloading data...',
			'pulling your progress...',
			'syncing save...',
			'fetching your rarities...',
			'acquiring data...',
			'grabbing your data...'
		];
		if (textEl) textEl.textContent = messages[Math.floor(Math.random() * messages.length)];
	
		overlay.classList.add('show');
	
		const delay = 1000 + Math.random() * 3000;
		setTimeout(() => {
			location.reload();
		}, delay);
	}

	function updateAccountBtn() {
		const btn = el('accountBtn');
		if (!btn) return;
		btn.textContent = isLoggedIn() ? getUsername() : 'log in';
	}

	function setAuthStatus(msg, color) {
		const s = el('authStatus');
		if (!s) return;
		s.textContent = msg;
		s.style.color = color || '';
	}

	function capitalize(s) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function switchAuthTab(tab) {
		['login', 'signup', 'forgot'].forEach((t) => {
			el('authTab' + capitalize(t)).classList.toggle('active', t === tab);
			el('authForm' + capitalize(t)).style.display = t === tab ? 'block' : 'none';
		});
		setAuthStatus('', '');
	}

	function renderBackupKeys(keys) {
	const body = el('backupKeysBody');
	body.innerHTML = `
      <h3 style="margin-top:0">your backup keys</h3>
      <p style="font-size:0.85em;opacity:0.7;">
        save these somewhere safe. each key can only be used once to reset your password.
        this is the only time they will ever be shown in full. closing this window hides them permanently.
      </p>
    `;
	keys.forEach((key, i) => {
		const row = document.createElement('div');
		row.className = 'backup-key-row';
		row.innerHTML = `<span class="backup-key-value">key ${i + 1}: ${key}</span>`;
		body.appendChild(row);
	});
	const closeBtn = document.createElement('button');
	closeBtn.textContent = 'i saved these, close';
	closeBtn.className = 'small';
	closeBtn.style.marginTop = '10px';
	closeBtn.style.width = '100%';
	closeBtn.addEventListener('click', () => {
		hideOverlay('backupKeysOverlay');
		showSyncLoading();
	});
	body.appendChild(closeBtn);
	showOverlay('backupKeysOverlay');
}

	async function openAccountInfo() {
		const body = el('accountInfoBody');
		body.innerHTML = '<p>loading...</p>';
		showOverlay('accountInfoOverlay');
		try {
			const data = await apiCall('/me');
			body.innerHTML = `
	        <h3 style="margin-top:0">${data.username}</h3>
	        <p style="font-size:0.85em;opacity:0.6;">
	          account created ${new Date(data.createdAt).toLocaleDateString()}<br>
	          backup keys remaining: ${data.backupKeysRemaining} / 3
	        </p>
	        <button id="refreshKeysBtn" class="small" style="width:100%;margin-bottom:8px;">refresh backup keys</button>
	        <button id="changePwBtn" class="small" style="width:100%;margin-bottom:8px;">change password</button>
	        <button id="logoutBtn" class="small" style="width:100%;margin-bottom:8px;color:#f66;">log out</button>
	        <button id="deleteAcctBtn" class="small" style="width:100%;opacity:0.6;color:#f66;">delete account</button>
	      `;
			el('refreshKeysBtn').addEventListener('click', refreshBackupKeys);
			el('changePwBtn').addEventListener('click', openChangePassword);
			el('logoutBtn').addEventListener('click', () => {
				clearSession();
				hideOverlay('accountInfoOverlay');
				updateAccountBtn();
			});
			el('deleteAcctBtn').addEventListener('click', openDeleteAccount);
		} catch (e) {
			body.innerHTML = `
	        <p style="color:#f66;">${e.message}</p>
	        <p style="font-size:0.85em;opacity:0.6;">your session may be invalid or expired. log out and sign back in.</p>
	        <button id="forceLogoutBtn" class="small" style="width:100%;color:#f66;">log out</button>
	      `;
			el('forceLogoutBtn').addEventListener('click', () => {
				clearSession();
				hideOverlay('accountInfoOverlay');
				updateAccountBtn();
			});
		}
	}

	async function refreshBackupKeys() {
		if (!confirm('this will invalidate your old backup keys and generate 3 new ones. continue?'))
			return;
		try {
			const data = await apiCall('/refresh-backup-keys', { method: 'POST' });
			hideOverlay('accountInfoOverlay');
			renderBackupKeys(data.backupKeys);
		} catch (e) {
			window.showAlert('error: ' + e.message);
		}
	}

	function openChangePassword() {
		const body = el('accountInfoBody');
		body.innerHTML = `
      <h3 style="margin-top:0">change password</h3>
      <input type="password" id="cpCurrent" class="auth-field" placeholder="current password">
      <input type="password" id="cpNew" class="auth-field" placeholder="new password (min 8 chars)">
      <button id="cpSubmit" class="small" style="width:100%;">update password</button>
      <div id="cpStatus" class="auth-status"></div>
    `;
		el('cpSubmit').addEventListener('click', async () => {
			const currentPassword = el('cpCurrent').value;
			const newPassword = el('cpNew').value;
			const status = el('cpStatus');
			try {
				const data = await apiCall('/change-password', {
					method: 'POST',
					body: { currentPassword, newPassword },
				});
				localStorage.setItem(TOKEN_KEY, data.token);
				status.style.color = '#8d8';
				status.textContent = 'password updated!';
				setTimeout(openAccountInfo, 800);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	function openDeleteAccount() {
		const body = el('accountInfoBody');
		body.innerHTML = `
	      <h3 style="margin-top:0;color:#f66;">delete account</h3>
	      <p style="font-size:0.85em;opacity:0.7;">
	        this permanently deletes your account, your cloud backup, and your leaderboard entry.
	        this cannot be undone. your local in-browser progress on this device will not be affected.
	      </p>
	      <input type="password" id="delPassword" class="auth-field" placeholder="enter your password to confirm">
	      <button id="delConfirmBtn" class="small" style="width:100%;color:#f66;">permanently delete my account</button>
	      <div id="delStatus" class="auth-status"></div>
	    `;
		el('delConfirmBtn').addEventListener('click', async () => {
			const password = el('delPassword').value;
			const status = el('delStatus');
			if (!password) {
				status.style.color = '#f66';
				status.textContent = 'enter your password';
				return;
			}
			if (!confirm('are you absolutely sure? this cannot be undone.')) return;
			try {
				status.style.color = '';
				status.textContent = 'deleting...';
				await apiCall('/delete', { method: 'POST', body: { password } });
				clearSession();
				hideOverlay('accountInfoOverlay');
				updateAccountBtn();
				window.showAlert(
					'your account, cloud backup, and leaderboard entry have all been deleted.'
				);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	async function handleLogin() {
		const username = el('loginUsername').value.trim();
		const password = el('loginPassword').value;
		if (!username || !password) {
			setAuthStatus('fill out both fields', '#f66');
			return;
		}
		try {
			setAuthStatus('logging in...', '');
			const data = await apiCall('/login', { method: 'POST', body: { username, password } });
			setSession(data.token, data.uid, data.username);
			hideOverlay('authOverlay');
			showSyncLoading();
		} catch (e) {
			setAuthStatus(e.message, '#f66');
		}
	}

	async function handleSignup() {
	const username = el('signupUsername').value.trim();
	const password = el('signupPassword').value;
	const confirmPw = el('signupPasswordConfirm').value;

	if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
		setAuthStatus('username must be 3-20 chars, letters/numbers/underscore/hyphen only', '#f66');
		return;
	}
	if (password.length < 8) {
		setAuthStatus('password must be at least 8 characters', '#f66');
		return;
	}
	if (password !== confirmPw) {
		setAuthStatus('passwords do not match', '#f66');
		return;
	}

	try {
		setAuthStatus('creating account...', '');
		const data = await apiCall('/register', { method: 'POST', body: { username, password } });
		setSession(data.token, data.uid, data.username);
		hideOverlay('authOverlay');
		renderBackupKeys(data.backupKeys);
	} catch (e) {
		setAuthStatus(e.message, '#f66');
	}
}

	async function handleForgot() {
		const username = el('forgotUsername').value.trim();
		const backupKey = el('forgotBackupKey').value.trim();
		const newPassword = el('forgotNewPassword').value;
	
		if (!username || !backupKey || !newPassword) {
			setAuthStatus('fill out all fields', '#f66');
			return;
		}
		if (newPassword.length < 8) {
			setAuthStatus('password must be at least 8 characters', '#f66');
			return;
		}
	
		try {
			setAuthStatus('resetting...', '');
			const data = await apiCall('/reset-password', {
				method: 'POST',
				body: { username, backupKey, newPassword }
			});
			setSession(data.token, data.uid, data.username);
			hideOverlay('authOverlay');
			showSyncLoading();
		} catch (e) {
			setAuthStatus(e.message, '#f66');
		}
	}

	function bindAuthUI() {
		el('accountBtn').addEventListener('click', () => {
			if (isLoggedIn()) openAccountInfo();
			else {
				switchAuthTab('login');
				showOverlay('authOverlay');
			}
		});
		el('authClose').addEventListener('click', () => hideOverlay('authOverlay'));
		el('accountInfoClose').addEventListener('click', () => hideOverlay('accountInfoOverlay'));
		el('backupKeysClose').addEventListener('click', () => hideOverlay('backupKeysOverlay'));

		el('authTabLogin').addEventListener('click', () => switchAuthTab('login'));
		el('authTabSignup').addEventListener('click', () => switchAuthTab('signup'));
		el('authTabForgot').addEventListener('click', () => switchAuthTab('forgot'));

		el('loginSubmit').addEventListener('click', handleLogin);
		el('signupSubmit').addEventListener('click', handleSignup);
		el('forgotSubmit').addEventListener('click', handleForgot);

		[el('authOverlay'), el('accountInfoOverlay'), el('backupKeysOverlay')].forEach((overlay) => {
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) overlay.classList.remove('show');
			});
		});
	}

	function runMigration() {
		if (localStorage.getItem('accountsMigrationDone_v1') === 'true') return;

		const hadCloudBackup = localStorage.getItem('cloudBackupEnabled') === 'true';
		const hadLeaderboard = localStorage.getItem('lbEnabled') === 'true';
		const oldUid = localStorage.getItem('cloudBackupUid');

		if (hadCloudBackup || hadLeaderboard) {
			if (oldUid) {
				if (hadCloudBackup) {
					fetch('https://backup.authsrng.xyz/api/backup/' + oldUid, {
						method: 'DELETE',
						headers: { 'X-Backup-Key': oldUid },
					}).catch(() => {});
				}
				if (hadLeaderboard) {
					fetch('https://leaderboard.authsrng.xyz/api/leaderboard/' + oldUid, {
						method: 'DELETE',
						headers: { 'X-Backup-Key': oldUid },
					}).catch(() => {});
				}
			}

			localStorage.removeItem('cloudBackupEnabled');
			localStorage.removeItem('lastCloudBackup');
			localStorage.removeItem('cloudBackupInterval');
			localStorage.removeItem('cloudBackupAgreed');
			localStorage.removeItem('lbEnabled');
			localStorage.removeItem('lbUsername');
			localStorage.removeItem('cloudBackupUid');

			el('migrationText').textContent =
				'cloud backups and the leaderboard now require an account. your previous backup and leaderboard entry have been removed from the server. create a free account to use these features again.';
			showOverlay('migrationPopup');

			el('migrationOk').addEventListener(
				'click',
				() => {
					hideOverlay('migrationPopup');
				},
				{ once: true }
			);
		} else {
			localStorage.removeItem('cloudBackupUid');
		}

		localStorage.setItem('accountsMigrationDone_v1', 'true');
	}

	function init() {
		bindAuthUI();
		updateAccountBtn();
		runMigration();
	}

	document.addEventListener('authchange', updateAccountBtn);

	window.AuthAccount = {
		getToken,
		getUsername,
		getUid,
		isLoggedIn,
		clearSession,
	};

	document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
