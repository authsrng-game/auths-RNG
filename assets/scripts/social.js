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

	function escAttr(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
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
			return `<img src="https://accounts.authsrng.xyz${escAttr(avatarUrl)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
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
					? Date.now() - f.lastSeenAt < 120000
						? '<span style="color:#8d8;">● online</span>'
						: '<span style="opacity:0.4;">' + fmtLastSeenShort(f.lastSeenAt) + '</span>'
					: '';
				html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:8px;">
            ${avatarHtml(f.username, f.avatarUrl, 26)}
            <a href="/assets/frontend/profile.html?user=${encodeURIComponent(f.username)}" style="color:var(--text-color);">${escHtml(f.username)}</a>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:0.75em;">
            ${seenLabel}
            <button class="small report-friend" data-username="${escHtml(f.username)}" style="opacity:0.5;">report</button>
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

		body.querySelectorAll('.report-friend').forEach((btn) => {
			btn.addEventListener('click', () => openReportModal(btn.dataset.username));
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
				const nameLabel = t.isGroup
					? `👥 ${escHtml(t.withUsername)} <span style="opacity:0.5;font-size:0.85em;">(${t.participantCount})</span>`
					: escHtml(t.withUsername);
				html += `<div class="thread-row" data-thread="${t.threadId}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);cursor:pointer;${t.unread ? 'font-weight:bold;' : 'opacity:0.75;'}">
          ${t.isGroup ? avatarHtml(null, null, 30) : avatarHtml(t.withUsername, t.withAvatarUrl, 30)}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nameLabel}</span>
              ${t.unread ? `<span style="color:var(--accent-color);font-size:0.75em;flex-shrink:0;">${t.unread} new</span>` : ''}
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
      <input type="text" id="composeTo" class="auth-field" placeholder="usernames, comma separated" value="${escHtml(prefillUsername || '')}">
      <input type="text" id="composeGroupName" class="auth-field" placeholder="group name (optional)" maxlength="40" style="display:none;">
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

		const toInput = el('composeTo');
		const groupNameInput = el('composeGroupName');
		toInput.addEventListener('input', () => {
			const count = toInput.value
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean).length;
			groupNameInput.style.display = count > 1 ? 'block' : 'none';
		});

		el('backToThreadsBtn').addEventListener('click', openMessages);
		el('sendComposeBtn').addEventListener('click', async () => {
			const toUsernames = toInput.value
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const groupName = groupNameInput.value.trim();
			const subject = el('composeSubject').value.trim();
			const messageBody = bodyInput.value.trim();
			const status = el('composeStatus');

			if (!toUsernames.length || !subject || !messageBody) {
				status.style.color = '#f66';
				status.textContent = 'fill out all fields';
				return;
			}
			try {
				status.style.color = '';
				status.textContent = 'sending...';
				await apiCall('/messages/send', {
					method: 'POST',
					body: { toUsernames, groupName: groupName || undefined, subject, body: messageBody },
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
			const isGroup = data.participants.length > 2;
			const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

			let html = `<button id="backToThreadsBtn2" class="small" style="margin-bottom:10px;">← back</button>
        <h3 style="margin:0 0 4px;">${escHtml(data.subject)}</h3>`;

			if (isGroup) {
				html += `<div style="font-size:0.78em;opacity:0.5;margin-bottom:12px;">${escHtml(data.name || '')}${data.name ? ' · ' : ''}${data.participants.map((p) => escHtml(p.username)).join(', ')}</div>`;
			} else {
				html += `<div style="margin-bottom:12px;"></div>`;
			}

			html += `<div style="max-height:320px;overflow-y:auto;margin-bottom:12px;">`;

			data.messages.forEach((m) => {
				const reactionCounts = {};
				(m.reactions || []).forEach((r) => {
					reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
				});
				const myReaction = (m.reactions || []).find((r) => r.uid === myUid())?.emoji || null;

				const reactionPills = Object.keys(reactionCounts)
					.map(
						(e) =>
							`<span class="msg-reaction-pill${e === myReaction ? ' mine' : ''}" data-msgid="${m.id}" data-emoji="${e}" style="cursor:pointer;font-size:0.85em;border:1px solid var(--border-color);border-radius:20px;padding:1px 7px;margin-right:4px;${e === myReaction ? 'border-color:var(--accent-color);' : ''}">${e} ${reactionCounts[e]}</span>`
					)
					.join('');

				html += `<div style="margin-bottom:12px;padding:10px;background:var(--overlay-bg);border:1px solid var(--border-color);border-radius:3px;">
          <div style="display:flex;justify-content:space-between;font-size:0.78em;opacity:0.5;margin-bottom:6px;">
            <span>${escHtml(m.fromUsername)}</span><span>${new Date(m.ts).toLocaleString()}</span>
          </div>
          <div style="font-size:0.9em;white-space:pre-wrap;margin-bottom:6px;">${escHtml(m.body)}</div>
          <div style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;">
            ${reactionPills}
            <span class="msg-react-add" data-msgid="${m.id}" style="cursor:pointer;font-size:0.8em;opacity:0.4;padding:1px 6px;">+</span>
          </div></div>`;
			});

			html += `</div>
        <textarea id="replyBody" class="auth-field" rows="3" maxlength="1500" placeholder="reply..."></textarea>
        <button id="sendReplyBtn" class="small" style="width:100%;">reply</button>
        <div id="replyStatus" class="auth-status"></div>`;
			body.innerHTML = html;

			body.querySelectorAll('.msg-reaction-pill').forEach((pill) => {
				pill.addEventListener('click', async () => {
					const isMine = pill.classList.contains('mine');
					try {
						await apiCall('/messages/react', {
							method: 'POST',
							body: { messageId: pill.dataset.msgid, emoji: isMine ? null : pill.dataset.emoji },
						});
						openThread(threadId);
					} catch (e) {
						window.showAlert('error: ' + e.message);
					}
				});
			});

			body.querySelectorAll('.msg-react-add').forEach((btn) => {
				btn.addEventListener('click', (evt) => {
					closeReactionPicker();
					const picker = document.createElement('div');
					picker.className = 'reaction-picker';
					picker.style.cssText =
						'position:absolute;background:var(--panel-bg);border:1px solid var(--border-color);border-radius:20px;padding:4px 6px;display:flex;gap:4px;z-index:25000;';
					emojis.forEach((e) => {
						const span = document.createElement('span');
						span.textContent = e;
						span.style.cssText = 'cursor:pointer;font-size:1.1em;';
						span.addEventListener('click', async () => {
							try {
								await apiCall('/messages/react', {
									method: 'POST',
									body: { messageId: btn.dataset.msgid, emoji: e },
								});
								openThread(threadId);
							} catch (err) {
								window.showAlert('error: ' + err.message);
							}
						});
						picker.appendChild(span);
					});
					const rect = evt.target.getBoundingClientRect();
					picker.style.top = rect.bottom + window.scrollY + 4 + 'px';
					picker.style.left = rect.left + window.scrollX + 'px';
					document.body.appendChild(picker);
					setTimeout(
						() => document.addEventListener('click', closeReactionPicker, { once: true }),
						0
					);
				});
			});

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

	function closeReactionPicker() {
		document.querySelectorAll('.reaction-picker').forEach((p) => p.remove());
	}

	function myUid() {
		return window.AuthAccount ? window.AuthAccount.getUid() : null;
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

	function openReportModal(username) {
		const overlay = document.createElement('div');
		overlay.className = 'auth-overlay show';
		overlay.style.zIndex = '30000';

		const modal = document.createElement('div');
		modal.className = 'auth-modal';
		modal.style.maxWidth = '420px';
		modal.innerHTML = `
      <h3 style="margin-top:0">report ${escHtml(username)}</h3>
      <textarea id="reportReason" class="auth-field" rows="4" maxlength="500" placeholder="what happened?"></textarea>
      <div style="font-size:0.75em;opacity:0.5;margin:-4px 0 10px;text-align:right;" id="reportCharCount">0 / 500</div>
      <button id="reportSubmitBtn" class="small" style="width:100%;margin-bottom:8px;">submit report</button>
      <button id="reportCancelBtn" class="small" style="width:100%;opacity:0.6;">cancel</button>
      <div id="reportStatus" class="auth-status"></div>
    `;
		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		const reasonInput = modal.querySelector('#reportReason');
		reasonInput.addEventListener('input', () => {
			modal.querySelector('#reportCharCount').textContent = reasonInput.value.length + ' / 500';
		});

		modal.querySelector('#reportCancelBtn').addEventListener('click', () => overlay.remove());

		modal.querySelector('#reportSubmitBtn').addEventListener('click', async () => {
			const reason = reasonInput.value.trim();
			const status = modal.querySelector('#reportStatus');
			if (!reason) {
				status.style.color = '#f66';
				status.textContent = 'please describe what happened';
				return;
			}
			try {
				status.style.color = '';
				status.textContent = 'submitting...';
				await apiCall('/accounts/report', {
					method: 'POST',
					body: { targetUsername: username, reason },
				});
				status.style.color = '#8d8';
				status.textContent = 'report submitted, thank you.';
				setTimeout(() => overlay.remove(), 1200);
			} catch (e) {
				status.style.color = '#f66';
				status.textContent = e.message;
			}
		});
	}

	function init() {
		bindUI();
		updateSocialButtonsVisibility();
		refreshBadges();
		checkComposeParam();
		setInterval(refreshBadges, POLL_INTERVAL);
	}

	document.addEventListener('authchange', refreshBadges);

	window.SocialFeatures = { openFriends, openMessages, openCompose, openReportModal };

	document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
