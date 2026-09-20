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

	function capitalize(s) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function escHtml(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
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

	// ---- password field helper: adds a show/hide toggle to any <input type="password"> ----
	function wirePasswordToggle(input) {
		if (!input || input.dataset.toggleWired) return;
		input.dataset.toggleWired = '1';

		const wrap = document.createElement('div');
		wrap.style.position = 'relative';
		input.parentNode.insertBefore(wrap, input);
		wrap.appendChild(input);
		input.style.paddingRight = '38px';
		input.style.width = '100%';
		input.style.boxSizing = 'border-box';

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'pw-toggle-btn';
		btn.textContent = 'show';
		btn.setAttribute('aria-label', 'show password');
		btn.addEventListener('click', () => {
			const showing = input.type === 'text';
			input.type = showing ? 'password' : 'text';
			btn.textContent = showing ? 'show' : 'hide';
		});
		wrap.appendChild(btn);
	}

	function wireAllPasswordToggles(root) {
		(root || document).querySelectorAll('input[type="password"]').forEach(wirePasswordToggle);
	}

	function passwordStrength(pw) {
		if (!pw) return { label: '', color: '' };
		let score = 0;
		if (pw.length >= 8) score++;
		if (pw.length >= 12) score++;
		if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
		if (/\d/.test(pw)) score++;
		if (/[^a-zA-Z0-9]/.test(pw)) score++;
		if (pw.length < 8) return { label: 'too short', color: '#f66' };
		if (score <= 2) return { label: 'weak', color: '#f66' };
		if (score <= 3) return { label: 'okay', color: '#e8b93f' };
		return { label: 'strong', color: '#8d8' };
	}

	const ALLOWED_AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];
	const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

	const MAX_BANNER_BYTES = 3 * 1024 * 1024;

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

	function setAuthStatus(msg, color) {
		const s = el('authStatus');
		if (!s) return;
		s.textContent = msg;
		s.style.color = color || '';
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
			? `<img src="https://accounts.authsrng.xyz${escHtml(avatarUrl)}" class="account-btn-avatar"> `
			: '';
		btn.innerHTML = `${avatarHtml}${escHtml(username)} <span class="beta-tag">beta</span>`;
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

		const copyAllBtn = document.createElement('button');
		copyAllBtn.textContent = 'copy all keys';
		copyAllBtn.className = 'small';
		copyAllBtn.style.marginTop = '10px';
		copyAllBtn.style.width = '100%';
		copyAllBtn.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(keys.join('\n'));
				copyAllBtn.textContent = 'copied!';
				setTimeout(() => (copyAllBtn.textContent = 'copy all keys'), 1200);
			} catch (_) {}
		});
		body.appendChild(copyAllBtn);

		const closeBtn = document.createElement('button');
		closeBtn.textContent = 'i saved these, close';
		closeBtn.className = 'small';
		closeBtn.style.marginTop = '8px';
		closeBtn.style.width = '100%';
		closeBtn.addEventListener('click', () => {
			hideOverlay('backupKeysOverlay');
			showSyncLoading();
		});
		body.appendChild(closeBtn);
		showOverlay('backupKeysOverlay');
	}

	function showSyncLoading() {
		setTimeout(() => {
			location.reload();
		}, 150);
	}

	// ------------------------------------------------------------------
	// dashyboard
	// ------------------------------------------------------------------

	const DASH_TABS = [
		{ id: 'overview', label: 'overview' },
		{ id: 'profile', label: 'profile' },
		{ id: 'appearance', label: 'appearance' },
		{ id: 'layout', label: 'layout' },
		{ id: 'social', label: 'social links' },
		{ id: 'connections', label: 'connections' },
		{ id: 'security', label: 'security' },
	];

	let dashState = null; // cached /me data + working copies of edits
	let dashActiveTab = 'overview';

	async function openAccountInfo(tab) {
		dashActiveTab = tab || 'overview';
		showOverlay('accountInfoOverlay');
		const root = el('accountInfoBody');
		root.innerHTML = '<p>loading...</p>';
		try {
			const data = await apiCall('/me');
			dashState = {
				data,
				bio: data.bio || '',
				pronouns: data.pronouns || '',
				avatarFile: null,
				removeAvatar: false,
				bannerFile: null,
				removeBanner: false,
				theme: Object.assign(
					{
						bannerType: 'none',
						bannerColor1: '#1a1a1a',
						bannerColor2: '#2a2a3a',
						accentColor: '#dcdcdc',
					},
					data.theme || {}
				),
				widgetOrder: (() => {
					const all = ['bio', 'stats', 'achievements'];
					const order = data.widgets && data.widgets.length ? data.widgets.slice() : all.slice();
					all.forEach((w) => {
						if (order.indexOf(w) === -1) order.push(w);
					});
					return order;
				})(),
				widgetEnabled: new Set(
					data.widgets && data.widgets.length ? data.widgets : ['bio', 'stats', 'achievements']
				),
				socialLinks: data.socialLinks || {},
				freeformLink: data.freeformLink || {},
			};
			renderDashboard();
		} catch (e) {
			root.innerHTML = `
	        <p style="color:#f66;">${escHtml(e.message)}</p>
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

	function renderDashboard() {
		const root = el('accountInfoBody');
		const data = dashState.data;
		const avatarHtml = data.avatarUrl
			? `<img src="https://accounts.authsrng.xyz${escHtml(data.avatarUrl)}" class="dash-avatar">`
			: `<div class="dash-avatar dash-avatar-placeholder">${escHtml(data.username.charAt(0).toUpperCase())}</div>`;

		let tabsHtml = '';
		DASH_TABS.forEach((t) => {
			tabsHtml += `<button class="dash-tab-btn${t.id === dashActiveTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`;
		});

		root.innerHTML = `
			<div class="dash-header">
				${avatarHtml}
				<div class="dash-header-info">
					<div class="dash-username">${escHtml(data.username)}</div>
					<div class="dash-joined">joined ${new Date(data.createdAt).toLocaleDateString()}</div>
				</div>
				<button id="dashCloseBtn" class="dash-close" aria-label="close">&times;</button>
			</div>
			<div class="dash-tabs">${tabsHtml}</div>
			<div id="dashPane" class="dash-pane"></div>
		`;

		el('dashCloseBtn').addEventListener('click', () => hideOverlay('accountInfoOverlay'));
		root.querySelectorAll('.dash-tab-btn').forEach((btn) => {
			btn.addEventListener('click', () => {
				dashActiveTab = btn.dataset.tab;
				renderDashboard();
			});
		});

		const renderers = {
			overview: renderTabOverview,
			profile: renderTabProfile,
			appearance: renderTabAppearance,
			layout: renderTabLayout,
			social: renderTabSocial,
			connections: renderTabConnections,
			security: renderTabSecurity,
		};
		renderers[dashActiveTab]();
	}

	function dashStatus(msg, color) {
		const pane = el('dashPane');
		let s = pane.querySelector('.dash-status');
		if (!s) {
			s = document.createElement('div');
			s.className = 'auth-status dash-status';
			pane.appendChild(s);
		}
		s.style.color = color || '';
		s.textContent = msg;
	}

	function renderTabOverview() {
		const pane = el('dashPane');
		const data = dashState.data;
		const bioHtml = data.bio
			? `<p style="font-size:0.85em;opacity:0.8;white-space:pre-wrap;">${escHtml(data.bio)}</p>`
			: `<p style="font-size:0.8em;opacity:0.4;font-style:italic;">no bio set yet</p>`;

		pane.innerHTML = `
			<div class="dash-stat-row">
				<div class="dash-stat"><div class="dash-stat-num">${data.backupKeysRemaining}</div><div class="dash-stat-label">backup keys left</div></div>
				<div class="dash-stat"><div class="dash-stat-num">${data.activeSessions || 1}</div><div class="dash-stat-label">active sessions</div></div>
			</div>
			${bioHtml}
			<div class="dash-quick-actions">
				<button id="qaViewProfile" class="small">view public profile</button>
				<button id="qaEditProfile" class="small">edit profile</button>
			</div>
			<button id="logoutBtn" class="small" style="width:100%;margin-top:14px;color:#f66;">log out</button>
		`;
		el('qaViewProfile').addEventListener('click', () => {
			window.location.href = `/assets/frontend/profile.html?user=${encodeURIComponent(data.username)}`;
		});
		el('qaEditProfile').addEventListener('click', () => {
			dashActiveTab = 'profile';
			renderDashboard();
		});
		el('logoutBtn').addEventListener('click', () => {
			clearSession();
			hideOverlay('accountInfoOverlay');
			updateAccountBtn();
		});
	}

	function openCropModal(file, aspectRatio, onConfirm) {
		const overlay = document.createElement('div');
		overlay.className = 'auth-overlay show';
		overlay.style.zIndex = '30000';

		const modal = document.createElement('div');
		modal.className = 'auth-modal';
		modal.style.maxWidth = '420px';
		modal.innerHTML = `
			<h3 style="margin-top:0">crop image</h3>
			<div id="cropStage" style="position:relative;width:100%;aspect-ratio:${aspectRatio};overflow:hidden;background:#000;border:1px solid var(--border-color);border-radius:3px;cursor:grab;">
				<img id="cropImg" style="position:absolute;max-width:none;user-select:none;pointer-events:none;">
			</div>
			<label style="display:block;margin:12px 0 4px;font-size:0.85em;opacity:0.7;">zoom</label>
			<input type="range" id="cropZoom" min="100" max="300" value="100" style="width:100%;margin-bottom:12px;">
			<button id="cropConfirmBtn" class="small" style="width:100%;margin-bottom:8px;">use this crop</button>
			<button id="cropCancelBtn" class="small" style="width:100%;opacity:0.6;">cancel</button>
		`;
		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		const stage = modal.querySelector('#cropStage');
		const img = modal.querySelector('#cropImg');
		const zoomSlider = modal.querySelector('#cropZoom');

		let naturalW = 0,
			naturalH = 0;
		let offsetX = 0,
			offsetY = 0;
		let zoom = 1;
		let dragging = false,
			dragStartX = 0,
			dragStartY = 0,
			dragOffX = 0,
			dragOffY = 0;

		const reader = new FileReader();
		reader.onload = () => {
			img.src = reader.result;
			img.onload = () => {
				naturalW = img.naturalWidth;
				naturalH = img.naturalHeight;
				layout();
			};
		};
		reader.readAsDataURL(file);

		function layout() {
			const stageW = stage.clientWidth;
			const stageH = stage.clientHeight;
			const coverScale = Math.max(stageW / naturalW, stageH / naturalH);
			const scale = coverScale * zoom;
			const w = naturalW * scale;
			const h = naturalH * scale;

			offsetX = Math.min(0, Math.max(offsetX, stageW - w));
			offsetY = Math.min(0, Math.max(offsetY, stageH - h));

			img.style.width = w + 'px';
			img.style.height = h + 'px';
			img.style.left = offsetX + 'px';
			img.style.top = offsetY + 'px';
		}

		zoomSlider.addEventListener('input', () => {
			zoom = zoomSlider.value / 100;
			layout();
		});

		stage.addEventListener('pointerdown', (e) => {
			dragging = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragOffX = offsetX;
			dragOffY = offsetY;
			stage.style.cursor = 'grabbing';
			stage.setPointerCapture(e.pointerId);
		});
		stage.addEventListener('pointermove', (e) => {
			if (!dragging) return;
			offsetX = dragOffX + (e.clientX - dragStartX);
			offsetY = dragOffY + (e.clientY - dragStartY);
			layout();
		});
		stage.addEventListener('pointerup', () => {
			dragging = false;
			stage.style.cursor = 'grab';
		});

		function cleanup() {
			overlay.remove();
		}

		modal.querySelector('#cropCancelBtn').addEventListener('click', cleanup);

		modal.querySelector('#cropConfirmBtn').addEventListener('click', () => {
			const stageW = stage.clientWidth;
			const stageH = stage.clientHeight;
			const coverScale = Math.max(stageW / naturalW, stageH / naturalH);
			const scale = coverScale * zoom;

			const outputW = aspectRatio === 1 ? 512 : 1200;
			const outputH = aspectRatio === 1 ? 512 : Math.round(1200 / aspectRatio);

			const canvas = document.createElement('canvas');
			canvas.width = outputW;
			canvas.height = outputH;
			const ctx = canvas.getContext('2d');

			const srcX = -offsetX / scale;
			const srcY = -offsetY / scale;
			const srcW = stageW / scale;
			const srcH = stageH / scale;

			ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);

			const mime = file.type === 'image/gif' ? 'image/png' : file.type;
			canvas.toBlob(
				(blob) => {
					const croppedFile = new File([blob], file.name.replace(/\.\w+$/, '') + '-cropped.png', {
						type: mime,
					});
					cleanup();
					onConfirm(croppedFile);
				},
				mime,
				0.92
			);
		});
	}

	function renderTabProfile() {
		const pane = el('dashPane');
		const data = dashState.data;
		const s = dashState;

		const avatarPreview = s.removeAvatar
			? `<div class="dash-avatar dash-avatar-placeholder" id="editAvatarPreview">${escHtml(data.username.charAt(0).toUpperCase())}</div>`
			: data.avatarUrl && !s.avatarFile
				? `<img src="https://accounts.authsrng.xyz${escHtml(data.avatarUrl)}" class="dash-avatar" id="editAvatarPreview">`
				: `<div class="dash-avatar dash-avatar-placeholder" id="editAvatarPreview">${escHtml(data.username.charAt(0).toUpperCase())}</div>`;

		const bannerShown = s.removeBanner ? null : data.bannerImageUrl;
		const bannerPreviewStyle = bannerShown
			? `background-image:url('https://accounts.authsrng.xyz${escHtml(bannerShown)}');background-size:cover;background-position:center;`
			: `background:var(--overlay-bg);`;

		pane.innerHTML = `
			<label class="dash-field-label">banner image</label>
			<div id="bannerPreview" class="dash-banner-preview" style="${bannerPreviewStyle}"></div>
			<div style="display:flex;gap:6px;margin-bottom:16px;">
				<input type="file" id="bannerFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" style="font-size:0.8em;flex:1;">
				<button id="removeBannerBtn" class="small" style="opacity:0.6;">${bannerShown ? 'remove' : 'no image'}</button>
			</div>

			<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
				${avatarPreview}
				<div style="display:flex;flex-direction:column;gap:6px;">
					<input type="file" id="avatarFileInput" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" style="font-size:0.8em;">
					<button id="removeAvatarBtn" class="small" style="opacity:0.6;">remove picture</button>
				</div>
			</div>

			<label class="dash-field-label">pronouns</label>
			<input type="text" id="pronounsInput" class="auth-field" maxlength="30" placeholder="e.g. she/her, they/them" value="${escHtml(s.pronouns)}">

			<label class="dash-field-label">bio</label>
			<textarea id="bioInput" class="auth-field" rows="4" maxlength="300" placeholder="write a short bio...">${escHtml(s.bio)}</textarea>
			<div style="font-size:0.75em;opacity:0.5;margin:-4px 0 14px;text-align:right;" id="bioCharCount">${s.bio.length} / 300</div>

			<button id="saveProfileBtn" class="small" style="width:100%;">save changes</button>
		`;

		const bioInput = el('bioInput');
		bioInput.addEventListener('input', () => {
			s.bio = bioInput.value;
			el('bioCharCount').textContent = bioInput.value.length + ' / 300';
		});
		el('pronounsInput').addEventListener('input', (e) => {
			s.pronouns = e.target.value;
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
			openCropModal(file, 16 / 5, (croppedFile) => {
				s.bannerFile = croppedFile;
				s.removeBanner = false;
				const reader = new FileReader();
				reader.onload = () => {
					el('bannerPreview').style.cssText =
						`background-image:url('${reader.result}');background-size:cover;background-position:center;`;
				};
				reader.readAsDataURL(croppedFile);
			});
			e.target.value = '';
		});

		el('removeBannerBtn').addEventListener('click', () => {
			s.bannerFile = null;
			s.removeBanner = true;
			el('bannerFileInput').value = '';
			el('bannerPreview').style.cssText = 'background:var(--overlay-bg);';
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
			openCropModal(file, 1, (croppedFile) => {
				s.avatarFile = croppedFile;
				s.removeAvatar = false;
				const preview = el('editAvatarPreview');
				const reader = new FileReader();
				reader.onload = () => {
					if (preview.tagName === 'IMG') {
						preview.src = reader.result;
					} else {
						const img = document.createElement('img');
						img.src = reader.result;
						img.className = 'dash-avatar';
						img.id = 'editAvatarPreview';
						preview.replaceWith(img);
					}
				};
				reader.readAsDataURL(croppedFile);
			});
			e.target.value = '';
		});

		el('removeAvatarBtn').addEventListener('click', () => {
			s.avatarFile = null;
			s.removeAvatar = true;
			el('avatarFileInput').value = '';
			const preview = el('editAvatarPreview');
			const placeholder = document.createElement('div');
			placeholder.className = 'dash-avatar dash-avatar-placeholder';
			placeholder.id = 'editAvatarPreview';
			placeholder.textContent = data.username.charAt(0).toUpperCase();
			preview.replaceWith(placeholder);
		});

		el('saveProfileBtn').addEventListener('click', async () => {
			const payload = { bio: s.bio, pronouns: s.pronouns };
			if (s.removeAvatar) {
				payload.removeAvatar = true;
			} else if (s.avatarFile) {
				try {
					payload.avatarBase64 = await readFileAsBase64(s.avatarFile);
					payload.avatarMime = s.avatarFile.type;
				} catch (e) {
					dashStatus('failed to read image', '#f66');
					return;
				}
			}
			try {
				dashStatus('saving...', '');
				await apiCall('/profile', { method: 'POST', body: payload });
				if (s.removeBanner) {
					await apiCall('/banner-image', { method: 'POST', body: { removeBanner: true } });
				} else if (s.bannerFile) {
					const bannerBase64 = await readFileAsBase64(s.bannerFile);
					await apiCall('/banner-image', {
						method: 'POST',
						body: { bannerBase64, bannerMime: s.bannerFile.type },
					});
				}
				dashStatus('saved!', '#8d8');
				setTimeout(() => openAccountInfo('profile'), 500);
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function renderTabAppearance() {
		const pane = el('dashPane');
		const s = dashState;
		const theme = s.theme;

		let presetHtml = '';
		THEME_PRESETS.forEach((p) => {
			presetHtml += `<button class="small preset-btn" data-preset="${escHtml(p.name)}">${escHtml(p.name)}</button>`;
		});

		pane.innerHTML = `
			<div id="themePreview" class="dash-banner-preview" style="margin-bottom:14px;"></div>
			<label class="dash-field-label">presets</label>
			<div id="presetGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px;">${presetHtml}</div>

			<label class="dash-field-label">banner style</label>
			<select id="bannerTypeSelect" class="auth-field">
				<option value="none">none</option>
				<option value="solid">solid color</option>
				<option value="gradient">gradient</option>
			</select>

			<div id="bannerColorRow" style="display:none;margin-bottom:10px;">
				<label class="dash-field-label">color</label>
				<input type="color" id="bannerColor1" style="width:100%;height:36px;">
			</div>
			<div id="bannerColor2Row" style="display:none;margin-bottom:10px;">
				<label class="dash-field-label">second color</label>
				<input type="color" id="bannerColor2" style="width:100%;height:36px;">
			</div>

			<label class="dash-field-label">accent color</label>
			<input type="color" id="accentColor" style="width:100%;height:36px;margin-bottom:16px;">

			<button id="saveThemeBtn" class="small" style="width:100%;">save theme</button>
		`;

		const bannerTypeSelect = el('bannerTypeSelect');
		const bannerColor1 = el('bannerColor1');
		const bannerColor2 = el('bannerColor2');
		const accentColor = el('accentColor');
		const preview = el('themePreview');

		bannerTypeSelect.value = theme.bannerType;
		bannerColor1.value = theme.bannerColor1;
		bannerColor2.value = theme.bannerColor2;
		accentColor.value = theme.accentColor;

		function updatePreview() {
			const type = bannerTypeSelect.value;
			el('bannerColorRow').style.display = type === 'none' ? 'none' : 'block';
			el('bannerColor2Row').style.display = type === 'gradient' ? 'block' : 'none';
			if (type === 'none') preview.style.background = 'var(--overlay-bg)';
			else if (type === 'solid') preview.style.background = bannerColor1.value;
			else
				preview.style.background = `linear-gradient(135deg, ${bannerColor1.value}, ${bannerColor2.value})`;

			theme.bannerType = type;
			theme.bannerColor1 = bannerColor1.value;
			theme.bannerColor2 = bannerColor2.value;
			theme.accentColor = accentColor.value;
		}

		bannerTypeSelect.addEventListener('change', updatePreview);
		bannerColor1.addEventListener('input', updatePreview);
		bannerColor2.addEventListener('input', updatePreview);
		accentColor.addEventListener('input', updatePreview);
		updatePreview();

		pane.querySelectorAll('.preset-btn').forEach((btn) => {
			btn.addEventListener('click', () => {
				const preset = THEME_PRESETS.find((p) => p.name === btn.dataset.preset);
				if (!preset) return;
				bannerTypeSelect.value = preset.bannerType;
				bannerColor1.value = preset.bannerColor1;
				bannerColor2.value = preset.bannerColor2;
				accentColor.value = preset.accentColor;
				updatePreview();
			});
		});

		el('saveThemeBtn').addEventListener('click', async () => {
			try {
				dashStatus('saving...', '');
				await apiCall('/theme', { method: 'POST', body: theme });
				dashStatus('saved!', '#8d8');
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function renderTabLayout() {
		const pane = el('dashPane');
		const s = dashState;
		const widgetLabels = { bio: 'bio', stats: 'stats', achievements: 'achievements' };

		let rows = '';
		s.widgetOrder.forEach((w, i) => {
			const isOn = s.widgetEnabled.has(w);
			rows += `<div class="dash-widget-row">
				<label style="display:flex;align-items:center;gap:8px;${isOn ? '' : 'opacity:0.4;'}">
					<input type="checkbox" class="widget-toggle" data-widget="${w}" ${isOn ? 'checked' : ''}>
					${escHtml(widgetLabels[w] || w)}
				</label>
				<div style="display:flex;gap:4px;">
					<button class="small widget-up" data-index="${i}" style="opacity:${i === 0 ? '0.2' : '0.7'};" ${i === 0 ? 'disabled' : ''}>↑</button>
					<button class="small widget-down" data-index="${i}" style="opacity:${i === s.widgetOrder.length - 1 ? '0.2' : '0.7'};" ${i === s.widgetOrder.length - 1 ? 'disabled' : ''}>↓</button>
				</div>
			</div>`;
		});

		pane.innerHTML = `
			<p style="font-size:0.8em;opacity:0.6;margin-bottom:12px;">toggle sections on/off and reorder them with the arrows.</p>
			${rows}
			<button id="saveWidgetsBtn" class="small" style="width:100%;margin-top:14px;">save layout</button>
		`;

		pane.querySelectorAll('.widget-toggle').forEach((cb) => {
			cb.addEventListener('change', () => {
				if (cb.checked) s.widgetEnabled.add(cb.dataset.widget);
				else s.widgetEnabled.delete(cb.dataset.widget);
				renderTabLayout();
			});
		});
		pane.querySelectorAll('.widget-up').forEach((btn) => {
			btn.addEventListener('click', () => {
				const i = parseInt(btn.dataset.index, 10);
				if (i <= 0) return;
				[s.widgetOrder[i - 1], s.widgetOrder[i]] = [s.widgetOrder[i], s.widgetOrder[i - 1]];
				renderTabLayout();
			});
		});
		pane.querySelectorAll('.widget-down').forEach((btn) => {
			btn.addEventListener('click', () => {
				const i = parseInt(btn.dataset.index, 10);
				if (i >= s.widgetOrder.length - 1) return;
				[s.widgetOrder[i + 1], s.widgetOrder[i]] = [s.widgetOrder[i], s.widgetOrder[i + 1]];
				renderTabLayout();
			});
		});

		el('saveWidgetsBtn').addEventListener('click', async () => {
			const finalOrder = s.widgetOrder.filter((w) => s.widgetEnabled.has(w));
			try {
				dashStatus('saving...', '');
				await apiCall('/widgets', { method: 'POST', body: { widgets: finalOrder } });
				dashStatus('saved!', '#8d8');
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function renderTabSocial() {
		const pane = el('dashPane');
		const s = dashState;
		const platforms = [
			{ key: 'discord', label: 'discord username' },
			{ key: 'youtube', label: 'youtube handle' },
			{ key: 'tiktok', label: 'tiktok handle' },
			{ key: 'github', label: 'github username' },
			{ key: 'twitch', label: 'twitch username' },
		];

		let fields = '';
		platforms.forEach((p) => {
			const existing = s.socialLinks[p.key] ? s.socialLinks[p.key].handle : '';
			fields += `<label class="dash-field-label">${escHtml(p.label)}</label>
				<input type="text" class="auth-field social-input" data-platform="${p.key}" placeholder="username" value="${escHtml(existing)}">`;
		});

		pane.innerHTML = `
			<p style="font-size:0.8em;opacity:0.6;margin-bottom:12px;">just your username/handle on each platform, no need for full urls.</p>
			${fields}
			<label class="dash-field-label">custom link label</label>
			<input type="text" id="freeformLabel" class="auth-field" maxlength="30" placeholder="e.g. my website" value="${escHtml(s.freeformLink.label || '')}">
			<label class="dash-field-label">custom link url</label>
			<input type="text" id="freeformUrl" class="auth-field" maxlength="300" placeholder="https://..." value="${escHtml(s.freeformLink.url || '')}">
			<button id="saveSocialBtn" class="small" style="width:100%;margin-top:4px;">save links</button>
		`;

		el('saveSocialBtn').addEventListener('click', async () => {
			const links = {};
			pane.querySelectorAll('.social-input').forEach((inp) => {
				const v = inp.value.trim();
				if (v) links[inp.dataset.platform] = v;
			});
			const freeformLabel = el('freeformLabel').value.trim();
			const freeformUrl = el('freeformUrl').value.trim();
			try {
				dashStatus('saving...', '');
				await apiCall('/social-links', {
					method: 'POST',
					body: {
						links,
						freeformLabel: freeformUrl ? freeformLabel : undefined,
						freeformUrl: freeformUrl || undefined,
					},
				});
				dashStatus('saved!', '#8d8');
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function renderTabConnections() {
		const pane = el('dashPane');
		const data = dashState.data;

		if (data.discordId) {
			pane.innerHTML = `
      <div class="dash-security-item">
        <div>
          <div class="dash-security-title">discord</div>
          <div class="dash-security-desc">connected as ${escHtml(data.discordUsername || data.discordId)}</div>
        </div>
        <button id="discordUnlinkBtn" class="small" style="opacity:0.6;color:#f66;">disconnect</button>
      </div>
      <p style="font-size:0.8em;opacity:0.6;margin-top:12px;">
        your discord account is linked! our discord bot uses this to assign roll milestone roles automatically.
      </p>
    `;
			el('discordUnlinkBtn').addEventListener('click', async () => {
				if (
					!confirm(
						'disconnect your discord account? you will stop receiving automatic roll roles...!!'
					)
				)
					return;
				try {
					await apiCall('/discord/unlink', { method: 'POST' });
					dashState.data.discordId = null;
					dashState.data.discordUsername = null;
					renderTabConnections();
				} catch (e) {
					dashStatus(e.message, '#f66');
				}
			});
		} else {
			pane.innerHTML = `
      <p style="font-size:0.85em;opacity:0.75;">
        link your discord account to automatically receive roll milestone roles in the discord server for ego points!
      </p>
      <button id="discordConnectBtn" class="small" style="width:100%;">connect discord</button>
    `;
			el('discordConnectBtn').addEventListener('click', async () => {
				try {
					const res = await apiCall('/discord/authorize');
					// Generated code starts here on 2026-09-18T10:00:00Z:
					if (res && typeof res.url === 'string' && /^https?:\/\//i.test(res.url)) {
						window.location.href = res.url;
					}
					// Generated code ends here on 2026-09-18T10:00:00Z:
				} catch (e) {
					dashStatus(e.message, '#f66');
				}
			});
		}
	}

	async function openSessionsInline() {
		const pane = el('dashPane');
		pane.innerHTML = '<p>loading your yummy sessions...</p>';
		try {
			const data = await apiCall('/sessions');
			renderSessionsInline(data.sessions);
		} catch (e) {
			pane.innerHTML = `<p style="color:#f66;">${escHtml(e.message)}</p>`;
		}
	}

	function renderSessionsInline(sessions) {
		const pane = el('dashPane');
		let html = `<p style="font-size:0.8em;opacity:0.6;margin-bottom:12px;">devices/browsers currently logged into your account.</p>`;
		sessions.forEach((sess) => {
			html += `<div class="dash-session-row">
				<div>
					<div style="font-size:0.88em;">${escHtml(parseUA(sess.userAgent))}${sess.current ? ' <span style="opacity:0.5;font-size:0.85em;">(this device)</span>' : ''}</div>
					<div style="font-size:0.72em;opacity:0.45;">last active ${new Date(sess.lastSeenAt).toLocaleString()}</div>
				</div>
				${sess.current ? '' : `<button class="small revoke-session" data-sid="${escHtml(sess.sid)}" style="opacity:0.6;color:#f66;">revoke</button>`}
			</div>`;
		});
		html += `<button id="revokeOthersBtn" class="small" style="width:100%;margin-top:12px;opacity:0.7;">log out all other devices</button>
			<button id="backToSecurityBtn" class="small" style="width:100%;margin-top:8px;opacity:0.6;">back</button>`;
		pane.innerHTML = html;

		pane.querySelectorAll('.revoke-session').forEach((btn) => {
			btn.addEventListener('click', async () => {
				try {
					await apiCall('/sessions/revoke', { method: 'POST', body: { sid: btn.dataset.sid } });
					openSessionsInline();
				} catch (e) {
					dashStatus(e.message, '#f66');
				}
			});
		});
		el('revokeOthersBtn').addEventListener('click', async () => {
			if (!confirm('log out all other devices? this device stays logged in.')) return;
			try {
				await apiCall('/sessions/revoke-others', { method: 'POST' });
				openSessionsInline();
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
		el('backToSecurityBtn').addEventListener('click', renderTabSecurity);
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

	function renderTabSecurity() {
		const pane = el('dashPane');
		const data = dashState.data;
		pane.innerHTML = `
			<div class="dash-security-item">
				<div>
					<div class="dash-security-title">sessions</div>
					<div class="dash-security-desc">${data.activeSessions || 1} device${(data.activeSessions || 1) === 1 ? '' : 's'} currently logged in</div>
				</div>
				<button id="manageSessionsBtn" class="small">manage</button>
			</div>
			<div class="dash-security-item">
				<div>
					<div class="dash-security-title">backup keys</div>
					<div class="dash-security-desc">${data.backupKeysRemaining} of 3 remaining</div>
				</div>
				<button id="refreshKeysBtn" class="small">refresh</button>
			</div>
			<div class="dash-security-item">
				<div>
					<div class="dash-security-title">password</div>
					<div class="dash-security-desc">change your account password</div>
				</div>
				<button id="changePwBtn" class="small">change</button>
			</div>
			<div class="dash-security-item dash-security-danger">
				<div>
					<div class="dash-security-title" style="color:#f66;">delete account</div>
					<div class="dash-security-desc">permanently removes your account and data</div>
				</div>
				<button id="deleteAcctBtn" class="small" style="color:#f66;">delete</button>
			</div>
			<div id="dashSecurityInline"></div>
		`;
		el('manageSessionsBtn').addEventListener('click', openSessionsInline);
		el('refreshKeysBtn').addEventListener('click', refreshBackupKeys);
		el('changePwBtn').addEventListener('click', renderChangePasswordInline);
		el('deleteAcctBtn').addEventListener('click', renderDeleteAccountInline);
	}

	function renderChangePasswordInline() {
		const pane = el('dashPane');
		pane.innerHTML = `
			<label class="dash-field-label">current password</label>
			<input type="password" id="cpCurrent" class="auth-field" placeholder="current password">
			<label class="dash-field-label">new password</label>
			<input type="password" id="cpNew" class="auth-field" placeholder="new password (min 8 chars)">
			<div id="cpStrength" style="font-size:0.75em;margin:-4px 0 12px;"></div>
			<button id="cpSubmit" class="small" style="width:100%;">update password</button>
			<button id="cpBack" class="small" style="width:100%;margin-top:8px;opacity:0.6;">back</button>
		`;
		wireAllPasswordToggles(pane);

		const cpNew = el('cpNew');
		cpNew.addEventListener('input', () => {
			const st = passwordStrength(cpNew.value);
			el('cpStrength').textContent = st.label;
			el('cpStrength').style.color = st.color;
		});

		el('cpBack').addEventListener('click', renderTabSecurity);
		el('cpSubmit').addEventListener('click', async () => {
			const currentPassword = el('cpCurrent').value;
			const newPassword = el('cpNew').value;
			try {
				const data = await apiCall('/change-password', {
					method: 'POST',
					body: { currentPassword, newPassword },
				});
				localStorage.setItem(TOKEN_KEY, data.token);
				dashStatus('password updated!', '#8d8');
				setTimeout(renderTabSecurity, 900);
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function renderDeleteAccountInline() {
		const pane = el('dashPane');
		pane.innerHTML = `
			<p style="font-size:0.85em;opacity:0.75;">
				this permanently deletes your account, your cloud backup, and your leaderboard entry.
				this cannot be undone. your local in-browser progress on this device will not be affected.
			</p>
			<input type="password" id="delPassword" class="auth-field" placeholder="enter your password to confirm">
			<button id="delConfirmBtn" class="small" style="width:100%;color:#f66;">permanently delete my account</button>
			<button id="delBack" class="small" style="width:100%;margin-top:8px;opacity:0.6;">back</button>
		`;
		wireAllPasswordToggles(pane);

		el('delBack').addEventListener('click', renderTabSecurity);
		el('delConfirmBtn').addEventListener('click', async () => {
			const password = el('delPassword').value;
			if (!password) {
				dashStatus('enter your password', '#f66');
				return;
			}
			if (!confirm('are you absolutely sure? this cannot be undone.')) return;
			try {
				dashStatus('deleting...', '');
				await apiCall('/delete', { method: 'POST', body: { password } });
				clearSession();
				hideOverlay('accountInfoOverlay');
				updateAccountBtn();
				window.showAlert(
					'your account, cloud backup, and leaderboard entry have all been deleted.'
				);
			} catch (e) {
				dashStatus(e.message, '#f66');
			}
		});
	}

	function getAltchaValue(widgetId) {
		const widget = el(widgetId);
		if (!widget) return null;
		const input = widget.querySelector('input[name="altcha"]');
		return input ? input.value : null;
	}

	async function handleLogin() {
		const username = el('loginUsername').value.trim();
		const password = el('loginPassword').value;
		if (!username || !password) {
			setAuthStatus('fill out both fields', '#f66');
			return;
		}
		const altcha = getAltchaValue('loginAltcha');
		if (!altcha) {
			setAuthStatus('please complete the captcha', '#f66');
			return;
		}
		try {
			setAuthStatus('logging in...', '');
			const data = await apiCall('/login', {
				method: 'POST',
				body: { username, password, altcha },
			});
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
		const altcha = getAltchaValue('signupAltcha');
		if (!altcha) {
			setAuthStatus('please complete the captcha', '#f66');
			return;
		}

		try {
			setAuthStatus('creating account...', '');
			const data = await apiCall('/register', {
				method: 'POST',
				body: { username, password, altcha },
			});
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
			if (isLoggedIn()) openAccountInfo('overview');
			else {
				switchAuthTab('login');
				showOverlay('authOverlay');
			}
		});
		el('authClose').addEventListener('click', () => hideOverlay('authOverlay'));
		el('backupKeysClose').addEventListener('click', () => hideOverlay('backupKeysOverlay'));
		const legacyAccountClose = el('accountInfoClose');
		if (legacyAccountClose) legacyAccountClose.style.display = 'none';

		el('authTabLogin').addEventListener('click', () => switchAuthTab('login'));
		el('authTabSignup').addEventListener('click', () => switchAuthTab('signup'));
		el('authTabForgot').addEventListener('click', () => switchAuthTab('forgot'));

		el('loginSubmit').addEventListener('click', handleLogin);
		el('signupSubmit').addEventListener('click', handleSignup);
		el('forgotSubmit').addEventListener('click', handleForgot);

		// enter-to-submit on auth forms
		['loginPassword'].forEach((id) => {
			const input = el(id);
			if (input) input.addEventListener('keydown', (e) => e.key === 'Enter' && handleLogin());
		});
		['signupPasswordConfirm'].forEach((id) => {
			const input = el(id);
			if (input) input.addEventListener('keydown', (e) => e.key === 'Enter' && handleSignup());
		});
		['forgotNewPassword'].forEach((id) => {
			const input = el(id);
			if (input) input.addEventListener('keydown', (e) => e.key === 'Enter' && handleForgot());
		});

		wireAllPasswordToggles(document);

		const signupPw = el('signupPassword');
		if (signupPw) {
			const hint = document.createElement('div');
			hint.id = 'signupPwStrength';
			hint.style.cssText = 'font-size:0.75em;margin:-6px 0 10px;';
			signupPw.closest('div').after(hint);
			signupPw.addEventListener('input', () => {
				const st = passwordStrength(signupPw.value);
				hint.textContent = st.label;
				hint.style.color = st.color;
			});
		}

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
		openDashboard: openAccountInfo,
	};

	document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
