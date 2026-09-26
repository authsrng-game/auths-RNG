'use strict';

(function () {
	const API = 'https://accounts.authsrng.xyz/api/accounts';

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
		const headers = { 'Content-Type': 'application/json' };
		const token = window.AuthAccount && window.AuthAccount.getToken();
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

	let messages = [];

	async function loadSystemMessages() {
		if (!window.AuthAccount || !window.AuthAccount.isLoggedIn()) return;
		try {
			const data = await apiCall('/system-messages');
			messages = data.messages || [];
			render();
		} catch (_) {}
	}

	function render() {
		const list = document.getElementById('notifList');
		const empty = document.getElementById('notifEmpty');
		const badge = document.getElementById('notifBadge');
		if (!list) return;

		const unread = messages.filter((m) => !m.read).length;
		if (badge) {
			badge.textContent = unread > 0 ? String(unread) : '';
			badge.style.display = unread > 0 ? 'inline-block' : 'none';
		}

		if (!messages.length) {
			if (empty) empty.style.display = 'block';
			return;
		}
		if (empty) empty.style.display = 'none';

		const html = messages
			.slice()
			.sort((a, b) => b.ts - a.ts)
			.map(
				(m) => `
			<div class="sysmsg-item${m.read ? '' : ' unread'}" data-id="${escHtml(m.id)}">
				<div class="sysmsg-from">${escHtml(m.from)}</div>
				<div class="sysmsg-subject">${escHtml(m.subject)}</div>
				<div class="sysmsg-body">${escHtml(m.body)}</div>
				<div class="sysmsg-ts">${new Date(m.ts).toLocaleString()}</div>
			</div>`
			)
			.join('');

		// Generated code starts here on 2026-06-18T16:05:00Z:
		list.querySelectorAll('.sysmsg-item').forEach((el) => el.remove());
		// Generated code ends here on 2026-06-18T16:05:00Z:
		list.insertAdjacentHTML('beforeend', html);

		list.querySelectorAll('.sysmsg-item.unread').forEach((el) => {
			el.addEventListener(
				'click',
				async () => {
					const id = el.dataset.id;
					try {
						await apiCall('/system-messages/' + id + '/read', { method: 'POST' });
						const m = messages.find((x) => x.id === id);
						if (m) m.read = true;
						el.classList.remove('unread');
						render();
					} catch (_) {}
				},
				{ once: true }
			);
		});
	}

	document.addEventListener('authchange', loadSystemMessages);
	document.addEventListener('DOMContentLoaded', loadSystemMessages);
})();
