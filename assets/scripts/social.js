'use strict';

(function () {
	const API = 'https://accounts.authsrng.xyz/api';
	const POLL_INTERVAL = 60000;

	function getToken() {
		return localStorage.getItem('authToken');
	}
	function isLoggedIn() {
		return !!getToken();
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
	function escHtml(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function fmtLastSeenShort(ts) {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 3600) return Math.floor(s / 60) + 'm ago';
		if (s < 86400) return Math.floor(s / 3600) + 'h ago';
		return Math.floor(s / 86400) + 'd ago';
	}

	function updateSocialButtonsVisibility() {
		const friendsBtn = el('friendsBtn');
		const messagesBtn = el('messagesBtn');
		const show = isLoggedIn() ? 'flex' : 'none';
		if (friendsBtn) friendsBtn.style.display = show;
		if (messagesBtn) messagesBtn.style.display = show;
	}

	async function apiCall(path, options) {
		const opts = options || {};
		const headers = opts.headers || {};
		headers['Content-Type'] = 'application/json';
		const token = getToken();
		if (token) headers['Authorization'] = 'Bearer ' + token;
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
		if (!res.ok) throw new Error(data.error || 'request failed');
		return data;
	}

	function avatarHtml(username, avatarUrl, size) {
		size = size || 32;
		if (avatarUrl)
			return `<img src="https://accounts.authsrng.xyz${avatarUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
		return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--button-bg);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0.6;">${escHtml((username || '?').charAt(0).toUpperCase())}</div>`;
	}

	async function openFriends() {
		const body = el('friendsBody');
		body.innerHTML = '<p>loading...</p>';
		showOverlay('friendsOverlay');
		try {
			const data = await apiCall('/friends');
			renderFriends(data);
		} catch (e) {
			body.innerHTML = `<p style="color:#f66;">${escHtml(e.message)}</p>`;
		}
	}

	function renderFriends(data) {
		const body = el('friendsBody');
		let html = `
      <h3 style="margin-top:0">friends</h3>
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <input type="text" id="addFriendInput" class="auth-field" placeholder="username" style="margin-bottom:0;flex:1;">
        <button id="addFriendBtn" class="small">add</button>
      </div>
      <div id="friendsStatus" class="auth-status"></div>
    `;

		if (data.incoming.length) {
			html += `<div style="font-size:0.75em;opacity:0.5;margin:14px 0 6px;">incoming requests</div>`;
			data.incoming.forEach((r) => {
				html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <span>${escHtml(r.username)}</span>
          <div style="display:flex;gap:4px;">
            <button class="small accept-req" data-id="${r.id}">accept</button>
            <button class="small decline-req" data-id="${r.id}" style="opacity:0.6;">decline</button>
          </div></div>`;
			});
		}

		if (data.outgoing.length) {
			html += `<div style="font-size:0.75em;opacity:0.5;margin:14px 0 6px;">pending sent</div>`;
			data.outgoing.forEach((r) => {
				html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <span style="opacity:0.7;">${escHtml(r.username)}</span>
          <button class="small decline-req" data-id="${r.id}" style="opacity:0.5;">cancel</button></div>`;
			});
		}

		html += `<div style="font-size:0.75em;opacity:0.5;margin:14px 0 6px;">friends (${data.friends.length})</div>`;
		if (!data.friends.length) {
			html += `<p style="font-size:0.82em;opacity:0.4;font-style:italic;">no friends yet</p>`;
		} else {
			data.friends.forEach((f) => {
				const seenLabel = f.lastSeenAt
					? (Date.now() - f.lastSeenAt < 120000 ? '<span style="color:#8d8;">● online</span>' : '<span style="opacity:0.4;">' + fmtLastSeenShort(f.lastSeenAt) + '</span>')
					: '';
				html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:8px;">
            ${avatarHtml(f.username, f.avatarUrl, 26)}
            <a href="profile.html?user=${encodeURIComponent(f.username)}" style="color:var(--text-color);">${escHtml(f.username)}</a>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:0.75em;">
            ${seenLabel}
            <button class="small remove-friend" data-username="${escHtml(f.username)}" style="opacity:0.5;">remove</button>
          </div></div>`;
			});
		}

		body.innerHTML = html;

		el('addFriendBtn').addEventListener('click', async () => {
			const input = el('addFriendInput');
			const status = el('friendsStatus');
			const username = input.value.trim();
			if (!username) return;
			try {
				status.style.color = '';
				status.textContent = 'sending request...';
				await apiCall('/friends/request', { method: 'POST', body: { username } });
				status.style.color = '#8d8';
				status.textContent = 'request sent!';
				input.value = '';
				setTimeout(openFriends, 700);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});

		body.querySelectorAll('.accept-req').forEach((btn) => {
			btn.addEventListener('click', async () => {
				try {
					await apiCall('/friends/accept', { method: 'POST', body: { requestId: btn.dataset.id } });
					openFriends();
					refreshBadges();
				} catch (e) {
					window.showAlert('error: ' + e.message);
				}
			});
		});

		body.querySelectorAll('.decline-req').forEach((btn) => {
			btn.addEventListener('click', async () => {
				try {
					await apiCall('/friends/decline', {
						method: 'POST',
						body: { requestId: btn.dataset.id },
					});
					openFriends();
					refreshBadges();
				} catch (e) {
					window.showAlert('error: ' + e.message);
				}
			});
		});

		body.querySelectorAll('.remove-friend').forEach((btn) => {
			btn.addEventListener('click', async () => {
				if (!confirm('remove ' + btn.dataset.username + ' as a friend?')) return;
				try {
					await apiCall('/friends/remove', {
						method: 'POST',
						body: { username: btn.dataset.username },
					});
					openFriends();
				} catch (e) {
					window.showAlert('error: ' + e.message);
				}
			});
		});
	}

	async function openMessages() {
		const body = el('messagesBody');
		body.innerHTML = '<p>loading...</p>';
		showOverlay('messagesOverlay');
		try {
			const data = await apiCall('/messages/threads');
			renderThreadList(data.threads);
		} catch (e) {
			body.innerHTML = `<p style="color:#f66;">${escHtml(e.message)}</p>`;
		}
	}

	function renderThreadList(threads) {
		const body = el('messagesBody');
		let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">messages</h3>
      <button id="composeBtn" class="small">new message</button></div>`;

		if (!threads.length) {
			html += `<p style="font-size:0.82em;opacity:0.4;font-style:italic;">no messages yet</p>`;
		} else {
			threads.forEach((t) => {
				html += `<div class="thread-row" data-thread="${t.threadId}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);cursor:pointer;${t.unread ? 'font-weight:bold;' : 'opacity:0.75;'}">
          ${avatarHtml(t.withUsername, t.withAvatarUrl, 30)}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;">
              <span>${escHtml(t.withUsername)}</span>
              ${t.unread ? `<span style="color:var(--accent-color);font-size:0.75em;">${t.unread} new</span>` : ''}
            </div>
            <div style="font-size:0.8em;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.subject)}</div>
          </div></div>`;
			});
		}

		body.innerHTML = html;
		el('composeBtn').addEventListener('click', () => openCompose());
		body.querySelectorAll('.thread-row').forEach((row) => {
			row.addEventListener('click', () => openThread(row.dataset.thread));
		});
	}

	function openCompose(prefillUsername) {
		const body = el('messagesBody');
		showOverlay('messagesOverlay');
		body.innerHTML = `
      <h3 style="margin-top:0">new message</h3>
      <input type="text" id="composeTo" class="auth-field" placeholder="to username" value="${escHtml(prefillUsername || '')}">
      <input type="text" id="composeSubject" class="auth-field" placeholder="subject" maxlength="100">
      <textarea id="composeBody" class="auth-field" rows="6" maxlength="1500" placeholder="write your message..."></textarea>
      <div style="font-size:0.75em;opacity:0.5;margin:-4px 0 10px;text-align:right;" id="composeCharCount">0 / 1500</div>
      <button id="sendComposeBtn" class="small" style="width:100%;margin-bottom:8px;">send</button>
      <button id="backToThreadsBtn" class="small" style="width:100%;opacity:0.6;">back</button>
      <div id="composeStatus" class="auth-status"></div>
    `;

		const bodyInput = el('composeBody');
		bodyInput.addEventListener('input', () => {
			el('composeCharCount').textContent = bodyInput.value.length + ' / 1500';
		});
		el('backToThreadsBtn').addEventListener('click', openMessages);
		el('sendComposeBtn').addEventListener('click', async () => {
			const toUsername = el('composeTo').value.trim();
			const subject = el('composeSubject').value.trim();
			const messageBody = bodyInput.value.trim();
			const status = el('composeStatus');

			if (!toUsername || !subject || !messageBody) {
				status.style.color = '#f66';
				status.textContent = 'fill out all fields';
				return;
			}
			try {
				status.style.color = '';
				status.textContent = 'sending...';
				await apiCall('/messages/send', {
					method: 'POST',
					body: { toUsername, subject, body: messageBody },
				});
				status.style.color = '#8d8';
				status.textContent = 'sent!';
				setTimeout(openMessages, 600);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	async function openThread(threadId) {
		const body = el('messagesBody');
		body.innerHTML = '<p>loading...</p>';
		try {
			const data = await apiCall('/messages/thread/' + threadId);
			let html = `<button id="backToThreadsBtn2" class="small" style="margin-bottom:10px;">← back</button>
        <h3 style="margin:0 0 12px;">${escHtml(data.subject)}</h3>
        <div style="max-height:320px;overflow-y:auto;margin-bottom:12px;">`;
			data.messages.forEach((m) => {
				html += `<div style="margin-bottom:12px;padding:10px;background:var(--overlay-bg);border:1px solid var(--border-color);border-radius:3px;">
          <div style="display:flex;justify-content:space-between;font-size:0.78em;opacity:0.5;margin-bottom:6px;">
            <span>${escHtml(m.fromUsername)}</span><span>${new Date(m.ts).toLocaleString()}</span>
          </div>
          <div style="font-size:0.9em;white-space:pre-wrap;">${escHtml(m.body)}</div></div>`;
			});
			html += `</div>
        <textarea id="replyBody" class="auth-field" rows="3" maxlength="1500" placeholder="reply..."></textarea>
        <button id="sendReplyBtn" class="small" style="width:100%;">reply</button>
        <div id="replyStatus" class="auth-status"></div>`;
			body.innerHTML = html;

			el('backToThreadsBtn2').addEventListener('click', openMessages);
			el('sendReplyBtn').addEventListener('click', async () => {
				const replyInput = el('replyBody');
				const status = el('replyStatus');
				const text = replyInput.value.trim();
				if (!text) return;
				try {
					status.style.color = '';
					status.textContent = 'sending...';
					await apiCall('/messages/send', { method: 'POST', body: { threadId, body: text } });
					openThread(threadId);
				} catch (e) {
					status.style.color = '#f66';
					status.textContent = e.message;
				}
			});
		} catch (e) {
			body.innerHTML = `<p style="color:#f66;">${escHtml(e.message)}</p>`;
		}
	}

	async function refreshBadges() {
		updateSocialButtonsVisibility();

		if (!isLoggedIn()) {
			toggleBadge('friendsBadge', 0);
			toggleBadge('messagesBadge', 0);
			return;
		}
		try {
			const [friendsData, msgData] = await Promise.all([
				apiCall('/friends'),
				apiCall('/messages/unread-count'),
			]);
			toggleBadge('friendsBadge', friendsData.incoming.length);
			toggleBadge('messagesBadge', msgData.count);
		} catch (_) {}
	}

	function toggleBadge(id, count) {
		const badge = el(id);
		if (!badge) return;
		if (count > 0) {
			badge.textContent = count > 99 ? '99+' : String(count);
			badge.classList.add('visible');
		} else {
			badge.classList.remove('visible');
		}
	}

	function bindUI() {
		const friendsBtn = el('friendsBtn');
		const messagesBtn = el('messagesBtn');
		if (friendsBtn) friendsBtn.addEventListener('click', openFriends);
		if (messagesBtn) messagesBtn.addEventListener('click', openMessages);
		const friendsClose = el('friendsClose');
		const messagesClose = el('messagesClose');
		if (friendsClose) friendsClose.addEventListener('click', () => hideOverlay('friendsOverlay'));
		if (messagesClose)
			messagesClose.addEventListener('click', () => hideOverlay('messagesOverlay'));
		[el('friendsOverlay'), el('messagesOverlay')].forEach((overlay) => {
			if (!overlay) return;
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) overlay.classList.remove('show');
			});
		});
	}

	function checkComposeParam() {
		const params = new URLSearchParams(location.search);
		const compose = params.get('compose');
		if (compose && isLoggedIn()) {
			showOverlay('messagesOverlay');
			openCompose(compose);
		}
	}

	function init() {
		bindUI();
		updateSocialButtonsVisibility();
		refreshBadges();
		checkComposeParam();
		setInterval(refreshBadges, POLL_INTERVAL);
	}

	document.addEventListener('authchange', refreshBadges);

	window.SocialFeatures = { openFriends, openMessages, openCompose };

	document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
