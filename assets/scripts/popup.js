// ── popup.js!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// HTML POPUPS ARE A FUCK

console.log(performance.now());

(function () {
	function patchSelectProperty(prop) {
		const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);

		Object.defineProperty(HTMLSelectElement.prototype, prop, {
			get: desc.get,
			set(v) {
				console.log('patched', prop, v);

				desc.set.call(this, v);

				this.dispatchEvent(new Event('change', { bubbles: true }));
			},
		});
	}

	patchSelectProperty('value');
	patchSelectProperty('selectedIndex');

	const OVERLAY_CSS =
		'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:20001;' +
		'display:flex;align-items:center;justify-content:center;';

	const BOX_CSS =
		'background:var(--panel-bg);border:1px solid var(--border-color);' +
		'border-radius:4px;padding:28px 24px 20px;max-width:420px;width:90%;' +
		'text-align:center;color:var(--text-color);font-family:monospace;';

	const BTN_BASE =
		'padding:8px 20px;border:1px solid var(--border-color);' +
		'color:var(--text-color);font-family:monospace;border-radius:2px;cursor:pointer;';

	const BTN_PRIMARY = BTN_BASE + 'background:var(--button-bg);';
	const BTN_CANCEL = BTN_BASE + 'background:transparent;opacity:0.6;';

	const INPUT_CSS =
		'width:100%;padding:8px;background:var(--input-bg);' +
		'border:1px solid var(--border-color);color:var(--text-color);' +
		'font-family:monospace;border-radius:2px;margin-bottom:16px;box-sizing:border-box;';

	const MSG_CSS = 'font-size:0.9em;opacity:0.75;margin-bottom:16px;white-space:pre-wrap;';
	const TITLE_CSS = 'font-size:1em;font-weight:bold;margin-bottom:10px;';
	const BTN_ROW_CSS = 'display:flex;gap:10px;justify-content:center;';

	function removeExisting() {
		const el = document.getElementById('customPopupOverlay');
		if (el) el.remove();
	}

	function makeOverlay() {
		removeExisting();
		const overlay = document.createElement('div');
		overlay.id = 'customPopupOverlay';
		overlay.style.cssText = OVERLAY_CSS;
		return overlay;
	}

	function makeBox() {
		const box = document.createElement('div');
		box.style.cssText = BOX_CSS;
		return box;
	}

	function makeTitle(text) {
		if (!text) return null;
		const el = document.createElement('div');
		el.style.cssText = TITLE_CSS;
		el.textContent = text;
		return el;
	}

	function makeMessage(text) {
		const el = document.createElement('div');
		el.style.cssText = MSG_CSS;
		el.textContent = text;
		return el;
	}

	function makeButton(label, css, onClick) {
		const btn = document.createElement('button');
		btn.textContent = label;
		btn.style.cssText = css;
		btn.addEventListener('click', onClick);
		return btn;
	}

	function makeBtnRow(...buttons) {
		const row = document.createElement('div');
		row.style.cssText = BTN_ROW_CSS;
		buttons.forEach((b) => row.appendChild(b));
		return row;
	}

	function mount(overlay, box) {
		overlay.appendChild(box);
		document.body.appendChild(overlay);
	}

	window.showAlert = function (message, title) {
		return new Promise((resolve) => {
			const overlay = makeOverlay();
			const box = makeBox();

			const titleEl = makeTitle(title);
			if (titleEl) box.appendChild(titleEl);
			box.appendChild(makeMessage(message));

			const close = () => {
				overlay.remove();
				resolve();
			};

			box.appendChild(makeBtnRow(makeButton('ok', BTN_PRIMARY, close)));

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) close();
			});
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Enter' || e.key === 'Escape') {
					document.removeEventListener('keydown', handler);
					close();
				}
			});

			mount(overlay, box);
		});
	};

	window.showConfirm = function (message, title) {
		return new Promise((resolve) => {
			const overlay = makeOverlay();
			const box = makeBox();

			const titleEl = makeTitle(title);
			if (titleEl) box.appendChild(titleEl);
			box.appendChild(makeMessage(message));

			const finish = (result) => {
				overlay.remove();
				resolve(result);
			};

			box.appendChild(
				makeBtnRow(
					makeButton('cancel', BTN_CANCEL, () => finish(false)),
					makeButton('ok', BTN_PRIMARY, () => finish(true))
				)
			);

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) finish(false);
			});
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Enter') {
					document.removeEventListener('keydown', handler);
					finish(true);
				}
				if (e.key === 'Escape') {
					document.removeEventListener('keydown', handler);
					finish(false);
				}
			});

			mount(overlay, box);
		});
	};

	window.showPrompt = function (message, defaultVal) {
		return new Promise((resolve) => {
			const overlay = makeOverlay();
			const box = makeBox();

			box.appendChild(makeMessage(message));

			const input = document.createElement('input');
			input.type = 'text';
			input.value = defaultVal ?? '';
			input.style.cssText = INPUT_CSS;
			box.appendChild(input);

			const finish = (value) => {
				overlay.remove();
				resolve(value);
			};

			box.appendChild(
				makeBtnRow(
					makeButton('cancel', BTN_CANCEL, () => finish(null)),
					makeButton('ok', BTN_PRIMARY, () => finish(input.value))
				)
			);

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') finish(input.value);
				if (e.key === 'Escape') finish(null);
			});

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) finish(null);
			});

			mount(overlay, box);
			setTimeout(() => input.focus(), 50);
		});
	};

	// ─custom fucking dropdown
	// bitch
	// sorry

	const DD_WRAP_CSS =
		'position:relative;display:inline-block;width:100%;font-family:monospace;font-size:0.85em;';
	const DD_TRIGGER_CSS =
		'width:100%;padding:4px 28px 4px 8px;background:var(--input-bg);' +
		'border:1px solid var(--border-color);color:var(--text-color);border-radius:2px;' +
		'cursor:pointer;text-align:left;font-family:monospace;font-size:1em;' +
		'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
	const DD_ARROW_CSS =
		'position:absolute;right:8px;top:50%;transform:translateY(-50%);' +
		'pointer-events:none;opacity:0.5;font-size:0.8em;';
	const DD_LIST_CSS =
		'position:fixed;background:var(--panel-bg);border:1px solid var(--border-color);' +
		'border-radius:2px;z-index:30000;max-height:260px;overflow-y:auto;' +
		'box-shadow:0 4px 16px rgba(0,0,0,0.5);min-width:160px;';
	const DD_ITEM_CSS =
		'padding:7px 12px;cursor:pointer;font-family:monospace;font-size:0.85em;' +
		'color:var(--text-color);text-align:left;white-space:nowrap;';
	const DD_ITEM_ACTIVE_CSS = DD_ITEM_CSS + 'background:var(--button-hover);';
	const DD_ITEM_SELECTED_CSS = DD_ITEM_CSS + 'opacity:1;font-weight:bold;';

	let activeDropdown = null;

	function closeActiveDropdown() {
		if (activeDropdown) {
			activeDropdown.remove();
			activeDropdown = null;
		}
	}

	document.addEventListener('pointerdown', (e) => {
		if (activeDropdown && !activeDropdown.contains(e.target)) closeActiveDropdown();
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeActiveDropdown();
	});

	function initDropdown(select) {
		if (select._ddInit) return;
		select._ddInit = true;
		select.style.display = 'none';

		const wrap = document.createElement('div');
		wrap.style.cssText = DD_WRAP_CSS;
		// copy inline styles like width/margin-top from original
		if (select.style.cssText) {
			const w = select.style.width;
			const mt = select.style.marginTop;
			if (w) wrap.style.width = w;
			if (mt) wrap.style.marginTop = mt;
		}

		const trigger = document.createElement('button');
		trigger.style.cssText = DD_TRIGGER_CSS;
		trigger.textContent = select.options[select.selectedIndex]?.text ?? '';

		const arrow = document.createElement('span');
		arrow.style.cssText = DD_ARROW_CSS;
		arrow.textContent = '▾';

		wrap.appendChild(trigger);
		wrap.appendChild(arrow);
		select.parentNode.insertBefore(wrap, select.nextSibling);

		trigger.addEventListener('click', (e) => {
			e.stopPropagation();

			if (activeDropdown) {
				closeActiveDropdown();
				return;
			}

			const list = document.createElement('div');
			list.style.cssText = DD_LIST_CSS;

			Array.from(select.options).forEach((opt, i) => {
				const item = document.createElement('div');
				item.style.cssText = i === select.selectedIndex ? DD_ITEM_SELECTED_CSS : DD_ITEM_CSS;
				item.textContent = opt.text;

				item.addEventListener('pointerenter', () => {
					item.style.cssText = DD_ITEM_ACTIVE_CSS;
				});
				item.addEventListener('pointerleave', () => {
					item.style.cssText = i === select.selectedIndex ? DD_ITEM_SELECTED_CSS : DD_ITEM_CSS;
				});
				item.addEventListener('pointerdown', (ev) => {
					ev.stopPropagation();
					select.selectedIndex = i;
					trigger.textContent = opt.text;
					closeActiveDropdown();
				});

				list.appendChild(item);
			});

			// position below trigger
			const rect = trigger.getBoundingClientRect();
			list.style.top = rect.bottom + 2 + 'px';
			list.style.left = rect.left + 'px';
			list.style.width = rect.width + 'px';

			document.body.appendChild(list);
			activeDropdown = list;

			// scroll selected into view
			const selectedItem = list.children[select.selectedIndex];
			if (selectedItem) selectedItem.scrollIntoView({ block: 'nearest' });
		});

		// keep trigger text in sync if value changes programmatically
		const observer = new MutationObserver(() => {
			trigger.textContent = select.options[select.selectedIndex]?.text ?? '';
		});
		observer.observe(select, { attributes: true, childList: true, subtree: true });

		// also sync on programmatic .value changes
		function syncTrigger() {
			trigger.textContent = select.options[select.selectedIndex]?.text ?? '';
		}

		syncTrigger();

		select.addEventListener('change', syncTrigger);
	}

	function initAllDropdowns() {
		document.querySelectorAll('select').forEach(initDropdown);
	}

	// init on load, and watch for dynamically added selects
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAllDropdowns);
	} else {
		initAllDropdowns();
	}

	const ddObserver = new MutationObserver(() => {
		document.querySelectorAll('select:not([_ddInit])').forEach(initDropdown);
	});
	ddObserver.observe(document.body, { childList: true, subtree: true });

	// file input styliung

	const FILE_BTN_CSS =
		'padding:6px 12px;background:var(--button-bg);border:1px solid var(--border-color);' +
		'color:var(--text-color);font-family:monospace;font-size:0.85em;border-radius:2px;' +
		'cursor:pointer;display:inline-block;';
	const FILE_NAME_CSS =
		'font-size:0.8em;opacity:0.5;margin-left:8px;font-family:monospace;vertical-align:middle;';

	function initFileInput(input) {
		if (input._fileInit) return;
		input._fileInit = true;
		input.style.display = 'none';

		const btn = document.createElement('button');
		btn.style.cssText = FILE_BTN_CSS;
		btn.textContent = 'choose file';

		const nameSpan = document.createElement('span');
		nameSpan.style.cssText = FILE_NAME_CSS;
		nameSpan.textContent = 'no file chosen';

		const wrapper = document.createElement('div');
		wrapper.style.cssText =
			'display:flex;align-items:center;margin-top:' + (input.style.marginTop || '0');

		btn.addEventListener('click', () => input.click());

		input.addEventListener('change', () => {
			const f = input.files?.[0];
			nameSpan.textContent = f ? f.name : 'no file chosen';
		});

		input.parentNode.insertBefore(wrapper, input.nextSibling);
		wrapper.appendChild(btn);
		wrapper.appendChild(nameSpan);
	}

	function initAllFileInputs() {
		document.querySelectorAll('input[type="file"]').forEach(initFileInput);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAllFileInputs);
	} else {
		initAllFileInputs();
	}

	const fileObserver = new MutationObserver(() => {
		document.querySelectorAll('input[type="file"]:not([_fileInit])').forEach(initFileInput);
	});
	fileObserver.observe(document.body, { childList: true, subtree: true });
})();
