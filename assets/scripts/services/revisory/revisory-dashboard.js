'use strict';

(function () {
	function el(tag, props, children) {
		const e = document.createElement(tag);
		if (props) Object.assign(e, props);
		if (children) children.forEach((c) => e.appendChild(c));
		return e;
	}

	function fmtTs(ts) {
		return new Date(ts).toLocaleString();
	}

	function fmtBytes(n) {
		if (n >= 1e6) return (n / 1e6).toFixed(1) + 'MB';
		if (n >= 1e3) return (n / 1e3).toFixed(1) + 'KB';
		return n + 'B';
	}

	let overlay = null;
	let currentTab = 'revisions';

	function ensureOverlay() {
		if (overlay) return overlay;
		overlay = el('div', { id: 'revisoryDashboardOverlay' });
		overlay.style.cssText =
			'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:22000;' +
			'align-items:center;justify-content:center;font-family:monospace;';

		const modal = el('div');
		modal.id = 'revisoryModal';
		modal.style.cssText =
			'background:var(--panel-bg);border:1px solid var(--border-color);border-radius:4px;' +
			'width:820px;max-width:95vw;height:640px;max-height:90vh;display:flex;flex-direction:column;' +
			'color:var(--text-color);overflow:hidden;';

		const header = el('div');
		header.style.cssText =
			'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;' +
			'border-bottom:1px solid var(--border-color);flex-shrink:0;';
		const title = el('div', { textContent: 'revisory' });
		title.style.cssText = 'font-size:0.95em;opacity:0.8;';
		const closeBtn = el('button', { className: 'small', textContent: 'close' });
		closeBtn.addEventListener('click', close);
		header.appendChild(title);
		header.appendChild(closeBtn);

		const tabs = el('div');
		tabs.style.cssText =
			'display:flex;gap:0;border-bottom:1px solid var(--border-color);flex-shrink:0;';
		['revisions', 'quarantine', 'shell'].forEach((name) => {
			const btn = el('button', { textContent: name, className: 'dev-tab' });
			btn.dataset.tab = name;
			btn.style.cssText = 'flex:1;border-radius:0;';
			btn.addEventListener('click', () => switchTab(name));
			tabs.appendChild(btn);
		});

		const body = el('div');
		body.id = 'revisoryDashboardBody';
		body.style.cssText = 'flex:1;overflow-y:auto;min-height:0;';

		modal.appendChild(header);
		modal.appendChild(tabs);
		modal.appendChild(body);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) close();
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && overlay.style.display !== 'none') close();
		});

		return overlay;
	}

	function switchTab(name) {
		currentTab = name;
		document.querySelectorAll('#revisoryDashboardOverlay .dev-tab').forEach((b) => {
			b.classList.toggle('active', b.dataset.tab === name);
		});
		renderTab();
	}

	async function renderTab() {
		const body = document.getElementById('revisoryDashboardBody');
		if (!body) return;
		body.innerHTML = '';
		if (currentTab === 'revisions') await renderRevisionsTab(body);
		else if (currentTab === 'quarantine') await renderQuarantineTab(body);
		else if (currentTab === 'shell') renderShellTab(body);
	}

	async function renderRevisionsTab(body) {
		const list = await window.Revisory.listRevisions(300);
		const headId = await window.Revisory.getHead('local');

		const wrap = el('div');
		wrap.style.cssText = 'padding:10px 14px;';

		const info = el('div', {
			textContent: list.length + ' revision(s) stored \u00b7 current head: ' + (headId || 'none'),
		});
		info.style.cssText = 'font-size:0.75em;opacity:0.5;margin-bottom:10px;';
		wrap.appendChild(info);

		list.forEach((rev) => {
			const row = el('div');
			row.style.cssText =
				'display:flex;justify-content:space-between;align-items:center;gap:10px;' +
				'padding:8px 10px;margin-bottom:6px;background:var(--overlay-bg);' +
				'border:1px solid var(--border-color);border-radius:3px;font-size:0.8em;';

			const left = el('div');
			left.style.cssText = 'min-width:0;';
			const idLine = el('div', { textContent: rev.id + (rev.id === headId ? '  (HEAD)' : '') });
			idLine.style.cssText = 'font-weight:bold;opacity:0.9;';
			const metaLine = el('div', {
				textContent:
					fmtTs(rev.ts) +
					' \u00b7 ' +
					rev.trigger +
					' \u00b7 ' +
					(rev.meta ? rev.meta.keyCount : '?') +
					' keys \u00b7 ' +
					fmtBytes((rev.meta && rev.meta.byteSize) || 0),
			});
			metaLine.style.cssText = 'opacity:0.5;font-size:0.85em;margin-top:2px;';
			left.appendChild(idLine);
			left.appendChild(metaLine);

			const actions = el('div');
			actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';
			const rollbackBtn = el('button', { className: 'small', textContent: 'rollback' });
			rollbackBtn.disabled = rev.id === headId;
			rollbackBtn.addEventListener('click', async () => {
				const ok = await window.showConfirm(
					'roll back local save to revision ' +
						rev.id +
						' (' +
						fmtTs(rev.ts) +
						')?\n\n' +
						'a safety snapshot of your current state will be taken first.',
					'confirm rollback'
				);
				if (!ok) return;
				await window.Revisory.rollbackTo(rev.id);
				window.showAlert('rolled back. reload the page to see the restored state.');
				renderTab();
			});
			actions.appendChild(rollbackBtn);
			row.appendChild(left);
			row.appendChild(actions);
			wrap.appendChild(row);
		});

		body.appendChild(wrap);
	}

	async function renderQuarantineTab(body) {
		const items = await window.Revisory.listQuarantine(false);
		const wrap = el('div');
		wrap.style.cssText = 'padding:10px 14px;';

		if (!items.length) {
			wrap.appendChild(
				el('div', {
					textContent: 'nothing held for review right now.',
					style: 'opacity:0.4;font-size:0.85em;padding:20px;text-align:center;',
				})
			);
			body.appendChild(wrap);
			return;
		}

		items.forEach((q) => {
			const card = el('div');
			card.style.cssText =
				'padding:12px;margin-bottom:10px;background:var(--overlay-bg);' +
				'border:1px solid var(--border-color);border-radius:4px;font-size:0.82em;';

			const cls = el('div', {
				textContent: q.classification.toUpperCase().replace(/_/g, ' '),
			});
			cls.style.cssText = 'font-weight:bold;color:#fa6;margin-bottom:4px;';

			const reasons = el('div', { textContent: q.reasons.join('; ') });
			reasons.style.cssText = 'opacity:0.7;margin-bottom:8px;';

			const analysis = el('div', {
				textContent:
					'incoming keys: ' +
					Object.keys(q.incomingSnapshot).length +
					' \u00b7 quarantined at ' +
					fmtTs(q.ts),
			});
			analysis.style.cssText = 'opacity:0.45;font-size:0.85em;margin-bottom:10px;';

			const actions = el('div');
			actions.style.cssText = 'display:flex;gap:6px;';

			const acceptBtn = el('button', { className: 'small', textContent: 'accept incoming' });
			acceptBtn.addEventListener('click', async () => {
				const ok = await window.showConfirm(
					'apply this incoming save over your current local data? this will create a safety revision first, but the incoming data will become your active save.',
					'accept incoming save'
				);
				if (!ok) return;
				await window.Revisory.resolveQuarantine(q.id, 'accept');
				window.showAlert('accepted. reload to see the applied state.');
				renderTab();
			});

			const mergeBtn = el('button', { className: 'small', textContent: 'merge additive only' });
			mergeBtn.addEventListener('click', async () => {
				await window.Revisory.resolveQuarantine(q.id, 'merge_additive');
				window.showAlert(
					'merged additively (existing keys were not overwritten). reload to see changes.'
				);
				renderTab();
			});

			const rejectBtn = el('button', {
				className: 'small',
				textContent: 'reject',
				style: 'color:#f66;',
			});
			rejectBtn.addEventListener('click', async () => {
				await window.Revisory.resolveQuarantine(q.id, 'reject');
				renderTab();
			});

			actions.appendChild(acceptBtn);
			actions.appendChild(mergeBtn);
			actions.appendChild(rejectBtn);

			card.appendChild(cls);
			card.appendChild(reasons);
			card.appendChild(analysis);
			card.appendChild(actions);
			wrap.appendChild(card);
		});

		body.appendChild(wrap);
	}

	const shellHistory = [];
	let persistentScope = null;
	let persistentFuncs = null;

	function ensureShellRuntime() {
		if (!persistentScope) persistentScope = new window.RevisoryLang.Scope(null);
		if (!persistentFuncs) persistentFuncs = Object.create(null);
	}

	function buildBuiltins(print) {
		return {
			help: () => {
				print('builtins: ls, cat, grep, keystat, snapshot, revisions, rollback,');
				print('          quarantine, resolve, verify, prune, print, len, keys, join');
				print('language: if/else, while, for x in list { }, func name(a,b) { return a }');
				print('variables persist across lines in this session: $x = 5');
				print("pipe sugar: expr | fn(...) inserts expr as fn's first argument");
				print('every command ends with (), for example, ls()');
				return undefined;
			},
			print: (...args) => {
				print(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
				return undefined;
			},
			ls: (prefix) =>
				Object.keys(window.Revisory.snapshotAllKeys()).filter((k) => k.startsWith(prefix || '')),
			cat: (key) => {
				const v = localStorage.getItem(key);
				return v === null ? '(not found)' : v;
			},
			grep: (list, pattern) => {
				const re = new RegExp(pattern, 'i');
				return (Array.isArray(list) ? list : [list]).filter((l) => re.test(String(l)));
			},
			len: (list) => (Array.isArray(list) ? list.length : String(list).length),
			keys: (obj) => Object.keys(obj || {}),
			join: (list, sep) => (Array.isArray(list) ? list.join(sep || ', ') : String(list)),
			keystat: async (key) => {
				if (!window.Revisory.__internalLoadKeyStats) return 'keystat introspection unavailable';
				return window.Revisory.__internalLoadKeyStats(key);
			},
			snapshot: async (trigger) => {
				const rev = await window.Revisory.createRevisionFromCurrentState(trigger || 'manual_shell');
				return 'created revision ' + rev.id;
			},
			revisions: async (limit) => {
				const list = await window.Revisory.listRevisions(limit || 50);
				return list.map((r) => r.id + '\t' + fmtTs(r.ts) + '\t' + r.trigger);
			},
			rollback: async (id) => {
				const rev = await window.Revisory.rollbackTo(id);
				return 'rolled back to ' + rev.id;
			},
			quarantine: async (all) => {
				const items = await window.Revisory.listQuarantine(!!all);
				return items.map((q) => q.id + '\t' + q.classification + '\t' + fmtTs(q.ts));
			},
			resolve: async (id, action) => {
				const result = await window.Revisory.resolveQuarantine(id, action);
				return JSON.stringify(result);
			},
			verify: async () => JSON.stringify(await window.Revisory.verifyIntegrity(), null, 2),
			prune: async (keepLast) => {
				const result = await window.Revisory.pruneOldRevisions({ keepLast });
				return 'pruned ' + result.pruned;
			},
		};
	}

	async function runShellLine(rawLine, print) {
		ensureShellRuntime();
		const builtins = buildBuiltins(print);
		return window.RevisoryLang.run(rawLine, builtins, persistentScope, persistentFuncs);
	}

	function renderShellTab(body) {
		const wrap = el('div');
		wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;';

		const log = el('div');
		log.id = 'revisoryShellLog';
		log.style.cssText =
			'flex:1;overflow-y:auto;padding:10px 14px;font-size:0.8em;white-space:pre-wrap;line-height:1.5;';

		const inputRow = el('div');
		inputRow.style.cssText =
			'display:flex;align-items:center;gap:6px;padding:8px 14px;border-top:1px solid var(--border-color);';
		const prompt = el('span', { textContent: '>' });
		prompt.style.cssText = 'opacity:0.4;';
		const input = el('input', { type: 'text', placeholder: 'try: help()' });
		input.style.cssText =
			'flex:1;background:transparent;border:none;outline:none;color:var(--text-color);font-family:monospace;font-size:0.85em;';

		function appendLog(text, color) {
			const line = el('div', { textContent: text });
			if (color) line.style.color = color;
			log.appendChild(line);
			log.scrollTop = log.scrollHeight;
		}

		if (!shellHistory.length) {
			appendLog(
				'revisory shell! variables persist for this session, pipes with |, functions with func, heavily in beta'
			);
			appendLog('type "help()" for the command list');
		} else {
			shellHistory.forEach((h) => appendLog(h.text, h.color));
		}

		let histIdx = -1;
		const cmdLog = [];

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				histIdx = Math.min(histIdx + 1, cmdLog.length - 1);
				input.value = cmdLog[cmdLog.length - 1 - histIdx] || '';
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				histIdx = Math.max(histIdx - 1, -1);
				input.value = histIdx < 0 ? '' : cmdLog[cmdLog.length - 1 - histIdx] || '';
				return;
			}
			if (e.key !== 'Enter') return;
			const raw = input.value;
			if (!raw.trim()) return;
			cmdLog.push(raw);
			histIdx = -1;
			input.value = '';

			const echoLine = '> ' + raw;
			appendLog(echoLine);
			shellHistory.push({ text: echoLine });

			try {
				const out = await runShellLine(raw, (line) => {
					appendLog(String(line));
					shellHistory.push({ text: String(line) });
				});
				if (out !== undefined) {
					const lines = Array.isArray(out) ? out : [String(out)];
					lines.forEach((l) => {
						const text = typeof l === 'string' ? l : JSON.stringify(l);
						appendLog(text);
						shellHistory.push({ text });
					});
				}
			} catch (err) {
				const msg = 'error: ' + (err.message || err);
				appendLog(msg, '#f66');
				shellHistory.push({ text: msg, color: '#f66' });
			}
		});

		inputRow.appendChild(prompt);
		inputRow.appendChild(input);
		wrap.appendChild(log);
		wrap.appendChild(inputRow);
		body.appendChild(wrap);

		setTimeout(() => input.focus(), 50);
	}

	function open() {
		if (!window.Revisory) {
			if (window.showAlert) window.showAlert('revisory is not loaded on this page.');
			return;
		}
		if (!window.RevisoryLang) {
			if (window.showAlert) window.showAlert('revisory shell language is not loaded on this page.');
			return;
		}
		const ov = ensureOverlay();
		ov.style.display = 'flex';
		switchTab(currentTab);
	}

	function close() {
		if (overlay) overlay.style.display = 'none';
	}

	window.RevisoryDashboard = { open, close };
})();
