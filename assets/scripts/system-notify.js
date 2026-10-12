'use strict';

(function () {
	const API = 'https://accounts.authsrng.xyz/api/accounts';
	let messages = [];

	function escHtml(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	async function apiCall(path, options) {
		const opts = options || {};
		const token = window.AuthAccount && window.AuthAccount.getToken();
		const headers = { 'Content-Type': 'application/json' };
		if (token) headers['Authorization'] = 'Bearer ' + token;
		const res = await fetch(API + path, { method: opts.method || 'GET', headers });
		let data = {};
		try {
			data = await res.json();
		} catch (_) {}
		if (!res.ok) throw new Error(data.error || 'request failed');
		return data;
	}

	window.getSystemUnread = () => messages.filter((m) => !m.read).length;

	window.renderSystemMessages = function () {
		const list = document.getElementById('notifList');
		const empty = document.getElementById('notifEmpty');
		if (!list) return;
		list.querySelectorAll('.sysmsg-item').forEach((n) => n.remove());
		if (messages.length && empty) empty.style.display = 'none';
		const html = messages
			.slice()
			.sort((a, b) => b.ts - a.ts)
			.map(
				(m) => `<div class="sysmsg-item${m.read ? '' : ' unread'}" data-id="${escHtml(m.id)}">
				<div class="sysmsg-from">${escHtml(m.from)}</div>
				<div class="sysmsg-subject">${escHtml(m.subject)}</div>
				<div class="sysmsg-body">${escHtml(m.body)}</div>
				<div class="sysmsg-ts">${new Date(m.ts).toLocaleString()}</div>
			</div>`
			)
			.join('');
		list.insertAdjacentHTML('afterbegin', html);
		list.querySelectorAll('.sysmsg-item.unread').forEach((n) => {
			n.addEventListener(
				'click',
				async () => {
					const id = n.dataset.id;
					try {
						await apiCall('/system-messages/' + id + '/read', { method: 'POST' });
						const m = messages.find((x) => x.id === id);
						if (m) m.read = true;
						n.classList.remove('unread');
						if (typeof updateNotifBadge === 'function') updateNotifBadge();
					} catch (err) {
						console.warn('[system-notify] failed to mark message read:', id, err);
					}
				},
				{ once: true }
			);
		});
	};

	async function load() {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) {
			messages = [];
			window.renderSystemMessages();
			return;
		}
		try {
			messages = (await apiCall('/system-messages')).messages || [];
			window.renderSystemMessages();
			if (typeof updateNotifBadge === 'function') updateNotifBadge();
		} catch (err) {
			console.warn('[system-notify] failed to load system messages:', err);
		}
	}

	document.addEventListener('authchange', load);
	document.addEventListener('DOMContentLoaded', load);
})();
