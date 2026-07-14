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

	function setSession(token, uid, username, avatarUrl) {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(UID_KEY, uid);
		localStorage.setItem(USER_KEY, username);
		if (avatarUrl) localStorage.setItem('authAvatarUrl', avatarUrl);
		else localStorage.removeItem('authAvatarUrl');
		document.dispatchEvent(new CustomEvent('authchange'));
	}

	function clearSession() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(UID_KEY);
		localStorage.removeItem(USER_KEY);
		localStorage.removeItem('authAvatarUrl');
		localStorage.removeItem('pendingWelcomeBack');
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

	function showWelcomeBackPopup() {
		let raw;
		try {
			raw = localStorage.getItem('pendingWelcomeBack');
		} catch (_) {
			raw = null;
		}
		if (!raw) return;
		localStorage.removeItem('pendingWelcomeBack');

		let info;
		try {
			info = JSON.parse(raw);
		} catch (_) {
			return;
		}
		if (!info) return;

		const parts = [`you were gone ${info.daysAway} day${info.daysAway === 1 ? '' : 's'}!`];
		if (info.pendingFriendRequests > 0)
			parts.push(
				`${info.pendingFriendRequests} pending friend request${info.pendingFriendRequests === 1 ? '' : 's'}.`
			);
		if (info.unreadMessages > 0)
			parts.push(`${info.unreadMessages} unread message${info.unreadMessages === 1 ? '' : 's'}.`);

		const overlay = el('migrationPopup');
		if (!overlay) return;
		el('migrationText').textContent = parts.join(' ');
		const heading = overlay.querySelector('h3');
		if (heading) heading.textContent = 'welcome back!';
		showOverlay('migrationPopup');
		el('migrationOk').addEventListener('click', () => hideOverlay('migrationPopup'), {
			once: true,
		});
	}

	document.addEventListener('syncBootComplete', showWelcomeBackPopup);

	async function openSessions() {
		const body = el('accountInfoBody');
		body.innerHTML = '<p>loading...</p>';
		try {
			const data = await apiCall('/sessions');
			renderSessions(data.sessions);
		} catch (e) {
			body.innerHTML = `<p style="color:#f66;">${escHtml(e.message)}</p><button id="backToAccountBtn" class="small" style="width:100%;">back</button>`;
			el('backToAccountBtn').addEventListener('click', () => openAccountInfo());
		}
	}

	function renderSessions(sessions) {
		const body = el('accountInfoBody');
		let html = `
      <h3 style="margin-top:0">active sessions</h3>
      <p style="font-size:0.8em;opacity:0.6;margin-bottom:12px;">these are the devices/browsers currently logged into your account.</p>
    `;

		sessions.forEach((s) => {
			html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
        <div>
          <div style="font-size:0.88em;">${escHtml(parseUA(s.userAgent))}${s.current ? ' <span style="opacity:0.5;font-size:0.85em;">(this device)</span>' : ''}</div>
          <div style="font-size:0.72em;opacity:0.45;">last active ${new Date(s.lastSeenAt).toLocaleString()}</div>
        </div>
        ${s.current ? '' : `<button class="small revoke-session" data-sid="${escHtml(s.sid)}" style="opacity:0.6;color:#f66;">revoke</button>`}
      </div>`;
		});

		html += `
      <button id="revokeOthersBtn" class="small" style="width:100%;margin-top:12px;opacity:0.7;">log out all other devices</button>
      <button id="backToAccountBtn" class="small" style="width:100%;margin-top:8px;opacity:0.6;">back</button>
      <div id="sessionsStatus" class="auth-status"></div>
    `;

		body.innerHTML = html;

		body.querySelectorAll('.revoke-session').forEach((btn) => {
			btn.addEventListener('click', async () => {
				try {
					await apiCall('/sessions/revoke', { method: 'POST', body: { sid: btn.dataset.sid } });
					openSessions();
				} catch (e) {
					el('sessionsStatus').style.color = '#f66';
					el('sessionsStatus').textContent = e.message;
				}
			});
		});

		el('revokeOthersBtn').addEventListener('click', async () => {
			if (!confirm('log out all other devices? this device stays logged in.')) return;
			try {
				await apiCall('/sessions/revoke-others', { method: 'POST' });
				openSessions();
			} catch (e) {
				el('sessionsStatus').style.color = '#f66';
				el('sessionsStatus').textContent = e.message;
			}
		});

		el('backToAccountBtn').addEventListener('click', () => openAccountInfo());
	}

	function showSyncLoading() {
		setTimeout(() => {
			location.reload();
		}, 150);
	}

	function updateAccountBtn() {
		const btn = el('accountBtn');
		if (!btn) return;
		if (!isLoggedIn()) {
			btn.innerHTML = 'log in';
			return;
		}
		const avatarUrl = localStorage.getItem('authAvatarUrl');
		const username = getUsername();
		const avatarHtml = avatarUrl
			? `<img src="https://accounts.authsrng.xyz${avatarUrl}" class="account-btn-avatar"> `
			: '';
		btn.innerHTML = `${avatarHtml}${username} <span class="beta-tag">beta</span>`;
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

	function escHtml(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function parseUA(ua) {
		if (!ua) return 'unknown device';
		if (/curl|wget/i.test(ua)) return 'script/cli';
		if (/Mobi|Android/i.test(ua)) return 'mobile browser';
		if (/Firefox/i.test(ua)) return 'firefox';
		if (/Chrome/i.test(ua)) return 'chrome';
		if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
		return 'browser';
	}

	function readFileAsBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				const base64 = result.slice(result.indexOf(',') + 1);
				resolve(base64);
			};
			reader.onerror = () => reject(new Error('failed to read file'));
			reader.readAsDataURL(file);
		});
	}

	const ALLOWED_AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];
	const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

	const MAX_BANNER_BYTES = 3 * 1024 * 1024;
	const MAX_PRONOUNS_CHARS = 30;

	const THEME_PRESETS = [
		{
			name: 'default',
			bannerType: 'none',
			bannerColor1: '#1a1a1a',
			bannerColor2: '#2a2a3a',
			accentColor: '#dcdcdc',
		},
		{
			name: 'sunset',
			bannerType: 'gradient',
			bannerColor1: '#ff6b6b',
			bannerColor2: '#ffb347',
			accentColor: '#ffb347',
		},
		{
			name: 'void',
			bannerType: 'gradient',
			bannerColor1: '#0a0014',
			bannerColor2: '#2d0a3d',
			accentColor: '#b388ff',
		},
		{
			name: 'mint',
			bannerType: 'gradient',
			bannerColor1: '#0f3d2e',
			bannerColor2: '#1a5c46',
			accentColor: '#6ee7b7',
		},
		{
			name: 'crimson',
			bannerType: 'solid',
			bannerColor1: '#3d0a0a',
			bannerColor2: '#3d0a0a',
			accentColor: '#ff6b6b',
		},
		{
			name: 'ocean',
			bannerType: 'gradient',
			bannerColor1: '#0a1e3d',
			bannerColor2: '#1a4d7a',
			accentColor: '#5dade2',
		},
	];

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
			const avatarImg = data.avatarUrl
				? `<img src="https://accounts.authsrng.xyz${data.avatarUrl}" class="account-avatar-preview" id="currentAvatarImg">`
				: `<div class="account-avatar-placeholder" id="currentAvatarImg">${data.username.charAt(0).toUpperCase()}</div>`;
			const bioHtml = data.bio
				? `<p style="font-size:0.85em;opacity:0.75;margin:0 0 12px;white-space:pre-wrap;">${data.bio.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
				: `<p style="font-size:0.8em;opacity:0.4;margin:0 0 12px;font-style:italic;">no bio set</p>`;
			const pronounsHtml = data.pronouns
				? `<span style="font-size:0.78em;opacity:0.5;margin-left:6px;">(${escHtml(data.pronouns)})</span>`
				: '';

			body.innerHTML = `
	        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
	          ${avatarImg}
	          <div>
	            <h3 style="margin:0;">${data.username}${pronounsHtml}</h3>
	            <p style="font-size:0.8em;opacity:0.5;margin:2px 0 0;">joined ${new Date(data.createdAt).toLocaleDateString()}</p>
	          </div>
	        </div>
	        ${bioHtml}
	        <p style="font-size:0.85em;opacity:0.6;margin-bottom:12px;">backup keys remaining: ${data.backupKeysRemaining} / 3</p>
	        <button id="viewProfileBtn" class="small" style="width:100%;margin-bottom:8px;">view profile</button>
	        <button id="editProfileBtn" class="small" style="width:100%;margin-bottom:8px;">edit profile</button>
	        <button id="sessionsBtn" class="small" style="width:100%;margin-bottom:8px;">manage sessions (${data.activeSessions || 1})</button>
	        <button id="refreshKeysBtn" class="small" style="width:100%;margin-bottom:8px;">refresh backup keys</button>
	        <button id="changePwBtn" class="small" style="width:100%;margin-bottom:8px;">change password</button>
	        <button id="logoutBtn" class="small" style="width:100%;margin-bottom:8px;color:#f66;">log out</button>
	        <button id="deleteAcctBtn" class="small" style="width:100%;opacity:0.6;color:#f66;">delete account</button>
	      `;
			el('viewProfileBtn').addEventListener('click', () => {
				window.location.href = `/assets/frontend/profile.html?user=${encodeURIComponent(data.username)}`;
			});
			el('editProfileBtn').addEventListener('click', () => openEditProfile(data));
			el('sessionsBtn').addEventListener('click', () => openSessions());
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

	function openEditProfile(currentData) {
		const body = el('accountInfoBody');
		let selectedFile = null;
		let removeFlag = false;
		let selectedBannerFile = null;
		let removeBannerFlag = false;

		const avatarPreview = currentData.avatarUrl
			? `<img src="https://accounts.authsrng.xyz${currentData.avatarUrl}" class="account-avatar-preview" id="editAvatarPreview">`
			: `<div class="account-avatar-placeholder" id="editAvatarPreview">${currentData.username.charAt(0).toUpperCase()}</div>`;

		const bannerPreviewStyle = currentData.bannerImageUrl
			? `background-image:url('https://accounts.authsrng.xyz${currentData.bannerImageUrl}');background-size:cover;background-position:center;`
			: `background:var(--overlay-bg);`;

		body.innerHTML = `
	      <h3 style="margin-top:0">edit profile</h3>

	      <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">banner image</label>
	      <div id="bannerPreview" style="height:70px;border-radius:4px;border:1px solid var(--border-color);margin-bottom:8px;${bannerPreviewStyle}"></div>
	      <div style="display:flex;gap:6px;margin-bottom:14px;">
	        <input type="file" id="bannerFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" style="font-size:0.8em;flex:1;">
	        <button id="removeBannerBtn" class="small" style="opacity:0.6;">${currentData.bannerImageUrl ? 'remove' : 'no image'}</button>
	      </div>

	      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
	        ${avatarPreview}
	        <div style="display:flex;flex-direction:column;gap:6px;">
	          <input type="file" id="avatarFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" style="font-size:0.8em;">
	          <button id="removeAvatarBtn" class="small" style="opacity:0.6;">${currentData.avatarUrl ? 'remove picture' : 'no picture set'}</button>
	        </div>
	      </div>

	      <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">pronouns</label>
	      <input type="text" id="pronounsInput" class="auth-field" maxlength="30" placeholder="e.g. she/her, they/them" value="${escHtml(currentData.pronouns || '')}">

	      <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">bio</label>
	      <textarea id="bioInput" class="auth-field" rows="4" maxlength="300" placeholder="write a short bio...">${currentData.bio || ''}</textarea>
	      <div style="font-size:0.75em;opacity:0.5;margin:-4px 0 10px;text-align:right;" id="bioCharCount">${(currentData.bio || '').length} / 300</div>

	      <button id="saveProfileBtn" class="small" style="width:100%;margin-bottom:8px;">save changes</button>
	      <button id="editThemeBtn" class="small" style="width:100%;margin-bottom:8px;opacity:0.8;">customize appearance</button>
	      <button id="editWidgetsBtn" class="small" style="width:100%;margin-bottom:8px;opacity:0.8;">customize layout</button>
	      <button id="cancelProfileBtn" class="small" style="width:100%;opacity:0.6;">cancel</button>
	      <div id="profileStatus" class="auth-status"></div>
	    `;

		const bioInput = el('bioInput');
		bioInput.addEventListener('input', () => {
			el('bioCharCount').textContent = bioInput.value.length + ' / 300';
		});

		el('bannerFileInput').addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;

			if (!ALLOWED_AVATAR_MIMES.includes(file.type)) {
				window.showAlert('unsupported format. use png, jpg, gif, webp, or avif.');
				e.target.value = '';
				return;
			}
			if (file.size > MAX_BANNER_BYTES) {
				window.showAlert('banner image must be under 3MB.');
				e.target.value = '';
				return;
			}

			selectedBannerFile = file;
			removeBannerFlag = false;
			const reader = new FileReader();
			reader.onload = () => {
				el('bannerPreview').style.cssText =
					`height:70px;border-radius:4px;border:1px solid var(--border-color);margin-bottom:8px;background-image:url('${reader.result}');background-size:cover;background-position:center;`;
			};
			reader.readAsDataURL(file);
		});

		el('removeBannerBtn').addEventListener('click', () => {
			selectedBannerFile = null;
			removeBannerFlag = true;
			el('bannerFileInput').value = '';
			el('bannerPreview').style.cssText =
				'height:70px;border-radius:4px;border:1px solid var(--border-color);margin-bottom:8px;background:var(--overlay-bg);';
		});

		el('avatarFileInput').addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;

			if (!ALLOWED_AVATAR_MIMES.includes(file.type)) {
				window.showAlert('unsupported format. use png, jpg, gif, webp, or avif.');
				e.target.value = '';
				return;
			}
			if (file.size > MAX_AVATAR_BYTES) {
				window.showAlert('image must be under 2MB.');
				e.target.value = '';
				return;
			}

			selectedFile = file;
			removeFlag = false;
			const preview = el('editAvatarPreview');
			const reader = new FileReader();
			reader.onload = () => {
				if (preview.tagName === 'IMG') {
					preview.src = reader.result;
				} else {
					const img = document.createElement('img');
					img.src = reader.result;
					img.className = 'account-avatar-preview';
					img.id = 'editAvatarPreview';
					preview.replaceWith(img);
				}
			};
			reader.readAsDataURL(file);
		});

		el('removeAvatarBtn').addEventListener('click', () => {
			selectedFile = null;
			removeFlag = true;
			el('avatarFileInput').value = '';
			const preview = el('editAvatarPreview');
			const placeholder = document.createElement('div');
			placeholder.className = 'account-avatar-placeholder';
			placeholder.id = 'editAvatarPreview';
			placeholder.textContent = currentData.username.charAt(0).toUpperCase();
			preview.replaceWith(placeholder);
		});

		el('cancelProfileBtn').addEventListener('click', () => openAccountInfo());

		el('editThemeBtn').addEventListener('click', async () => {
			try {
				const meData = await apiCall('/me');
				openEditTheme(meData);
			} catch (e) {
				window.showAlert('failed to load current theme: ' + e.message);
			}
		});

		el('editWidgetsBtn').addEventListener('click', async () => {
			try {
				const meData = await apiCall('/me');
				openEditWidgets(meData);
			} catch (e) {
				window.showAlert('failed to load current layout: ' + e.message);
			}
		});

		el('saveProfileBtn').addEventListener('click', async () => {
			const status = el('profileStatus');
			const payload = { bio: bioInput.value, pronouns: el('pronounsInput').value };

			if (removeFlag) {
				payload.removeAvatar = true;
			} else if (selectedFile) {
				try {
					payload.avatarBase64 = await readFileAsBase64(selectedFile);
					payload.avatarMime = selectedFile.type;
				} catch (e) {
					status.style.color = '#f66';
					status.textContent = 'failed to read image';
					return;
				}
			}

			try {
				status.style.color = '';
				status.textContent = 'saving...';
				await apiCall('/profile', { method: 'POST', body: payload });

				if (removeBannerFlag) {
					await apiCall('/banner-image', { method: 'POST', body: { removeBanner: true } });
				} else if (selectedBannerFile) {
					const bannerBase64 = await readFileAsBase64(selectedBannerFile);
					await apiCall('/banner-image', {
						method: 'POST',
						body: { bannerBase64, bannerMime: selectedBannerFile.type },
					});
				}

				status.style.color = '#8d8';
				status.textContent = 'saved!';
				setTimeout(openAccountInfo, 600);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	function openEditTheme(currentData) {
		const body = el('accountInfoBody');
		const theme = currentData.theme || {
			bannerType: 'none',
			bannerColor1: '#1a1a1a',
			bannerColor2: '#2a2a3a',
			accentColor: '#dcdcdc',
		};

		body.innerHTML = `
	      <h3 style="margin-top:0">customize profile</h3>
	      <div id="themePreview" style="height:70px;border-radius:4px;border:1px solid var(--border-color);margin-bottom:14px;"></div>
		  <label style="display:block;margin-bottom:6px;font-size:0.85em;opacity:0.7;">presets</label>
	      <div id="presetGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;"></div>

	      <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">banner style</label>
	      <select id="bannerTypeSelect" class="auth-field">
	        <option value="none">none</option>
	        <option value="solid">solid color</option>
	        <option value="gradient">gradient</option>
	      </select>

	      <div id="bannerColorRow" style="display:none;margin-bottom:10px;">
	        <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">color</label>
	        <input type="color" id="bannerColor1" style="width:100%;height:36px;">
	      </div>

	      <div id="bannerColor2Row" style="display:none;margin-bottom:10px;">
	        <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">second color</label>
	        <input type="color" id="bannerColor2" style="width:100%;height:36px;">
	      </div>

	      <label style="display:block;margin-bottom:4px;font-size:0.85em;opacity:0.7;">accent color</label>
	      <input type="color" id="accentColor" style="width:100%;height:36px;margin-bottom:14px;">

	      <button id="saveThemeBtn" class="small" style="width:100%;margin-bottom:8px;">save theme</button>
	      <button id="cancelThemeBtn" class="small" style="width:100%;opacity:0.6;">cancel</button>
	      <div id="themeStatus" class="auth-status"></div>
	    `;

		const bannerTypeSelect = el('bannerTypeSelect');
		const bannerColor1 = el('bannerColor1');
		const bannerColor2 = el('bannerColor2');
		const accentColor = el('accentColor');
		const preview = el('themePreview');

		bannerTypeSelect.value = theme.bannerType || 'none';
		bannerColor1.value = theme.bannerColor1 || '#1a1a1a';
		bannerColor2.value = theme.bannerColor2 || '#2a2a3a';
		accentColor.value = theme.accentColor || '#dcdcdc';

		function updatePreview() {
			const type = bannerTypeSelect.value;
			el('bannerColorRow').style.display = type === 'none' ? 'none' : 'block';
			el('bannerColor2Row').style.display = type === 'gradient' ? 'block' : 'none';

			if (type === 'none') preview.style.background = 'var(--overlay-bg)';
			else if (type === 'solid') preview.style.background = bannerColor1.value;
			else
				preview.style.background = `linear-gradient(135deg, ${bannerColor1.value}, ${bannerColor2.value})`;
		}

		bannerTypeSelect.addEventListener('change', updatePreview);
		bannerColor1.addEventListener('input', updatePreview);
		bannerColor2.addEventListener('input', updatePreview);
		updatePreview();

		const presetGrid = el('presetGrid');
		THEME_PRESETS.forEach((preset) => {
			const btn = document.createElement('button');
			btn.className = 'small';
			btn.textContent = preset.name;
			btn.style.fontSize = '0.75em';
			btn.addEventListener('click', () => {
				bannerTypeSelect.value = preset.bannerType;
				bannerColor1.value = preset.bannerColor1;
				bannerColor2.value = preset.bannerColor2;
				accentColor.value = preset.accentColor;
				updatePreview();
			});
			presetGrid.appendChild(btn);
		});

		el('cancelThemeBtn').addEventListener('click', () => openAccountInfo());

		el('saveThemeBtn').addEventListener('click', async () => {
			const status = el('themeStatus');
			try {
				status.style.color = '';
				status.textContent = 'saving...';
				await apiCall('/theme', {
					method: 'POST',
					body: {
						bannerType: bannerTypeSelect.value,
						bannerColor1: bannerColor1.value,
						bannerColor2: bannerColor2.value,
						accentColor: accentColor.value,
					},
				});
				status.style.color = '#8d8';
				status.textContent = 'saved!';
				setTimeout(openAccountInfo, 600);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	function openEditWidgets(currentData) {
		const body = el('accountInfoBody');
		const widgetLabels = { bio: 'bio', stats: 'stats', achievements: 'achievements' };
		const allWidgets = ['bio', 'stats', 'achievements'];
		let order =
			currentData.widgets && currentData.widgets.length
				? currentData.widgets.slice()
				: allWidgets.slice();
		allWidgets.forEach((w) => {
			if (order.indexOf(w) === -1) order.push(w);
		});
		const enabled = new Set(
			currentData.widgets && currentData.widgets.length ? currentData.widgets : allWidgets
		);

		function render() {
			let html = `
	      <h3 style="margin-top:0">customize layout</h3>
	      <p style="font-size:0.8em;opacity:0.6;margin-bottom:12px;">toggle sections on/off and reorder them with the arrows.</p>
	    `;
			order.forEach((w, i) => {
				const isOn = enabled.has(w);
				html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <label style="display:flex;align-items:center;gap:8px;${isOn ? '' : 'opacity:0.4;'}">
            <input type="checkbox" class="widget-toggle" data-widget="${w}" ${isOn ? 'checked' : ''}>
            ${escHtml(widgetLabels[w] || w)}
          </label>
          <div style="display:flex;gap:4px;">
            <button class="small widget-up" data-index="${i}" style="opacity:${i === 0 ? '0.2' : '0.7'};" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="small widget-down" data-index="${i}" style="opacity:${i === order.length - 1 ? '0.2' : '0.7'};" ${i === order.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
        </div>`;
			});
			html += `
	      <button id="saveWidgetsBtn" class="small" style="width:100%;margin-top:12px;">save layout</button>
	      <button id="cancelWidgetsBtn" class="small" style="width:100%;margin-top:8px;opacity:0.6;">back</button>
	      <div id="widgetsStatus" class="auth-status"></div>
	    `;
			body.innerHTML = html;

			body.querySelectorAll('.widget-toggle').forEach((cb) => {
				cb.addEventListener('change', () => {
					if (cb.checked) enabled.add(cb.dataset.widget);
					else enabled.delete(cb.dataset.widget);
					render();
				});
			});
			body.querySelectorAll('.widget-up').forEach((btn) => {
				btn.addEventListener('click', () => {
					const i = parseInt(btn.dataset.index, 10);
					if (i <= 0) return;
					[order[i - 1], order[i]] = [order[i], order[i - 1]];
					render();
				});
			});
			body.querySelectorAll('.widget-down').forEach((btn) => {
				btn.addEventListener('click', () => {
					const i = parseInt(btn.dataset.index, 10);
					if (i >= order.length - 1) return;
					[order[i + 1], order[i]] = [order[i], order[i + 1]];
					render();
				});
			});

			el('cancelWidgetsBtn').addEventListener('click', () => openAccountInfo());

			el('saveWidgetsBtn').addEventListener('click', async () => {
				const status = el('widgetsStatus');
				const finalOrder = order.filter((w) => enabled.has(w));
				try {
					status.style.color = '';
					status.textContent = 'saving...';
					await apiCall('/widgets', { method: 'POST', body: { widgets: finalOrder } });
					status.style.color = '#8d8';
					status.textContent = 'saved!';
					setTimeout(openAccountInfo, 600);
				} catch (e) {
					status.style.color = '#f66';
					status.textContent = e.message;
				}
			});
		}

		render();
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
			if (data.welcomeBack) {
				try {
					localStorage.setItem('pendingWelcomeBack', JSON.stringify(data.welcomeBack));
				} catch (_) {}
			} else {
				localStorage.removeItem('pendingWelcomeBack');
			}
			setSession(data.token, data.uid, data.username, data.avatarUrl);
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
				body: { username, backupKey, newPassword },
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
