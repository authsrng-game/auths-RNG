(function () {
	'use strict';

	const SETTINGS_PAGE = 9;
	const STYLES = ['dots', 'tabs', 'dock', 'sidebar', 'palette', 'custom'];

	const PAGES = [
		{ icon: '🎲', name: 'roll' },
		{ icon: '🛒', name: 'shop' },
		{ icon: '🏆', name: 'gauntlets' },
		{ icon: '🧭', name: 'expeditions' },
		{ icon: '🃏', name: 'the dealer' },
		{ icon: '🧬', name: 'mutations' },
		{ icon: '✨', name: 'starmap' },
		{ icon: '🔮', name: 'runes' },
		{ icon: '🌊', name: 'wishing well' },
		{ icon: '⚙️', name: 'settings' },
		{ icon: '🔗', name: 'links' },
		{ icon: '🐱', name: 'cat shrine' },
	];

	const PRESET_PATCH = {
		dock: { show: 'icon', shape: 'pill', scale: 115 },
		sidebar: { dock: 'left', layout: 'column' },
		palette: { arrows: true },
	};

	const FIELDS = [
		{
			key: 'show',
			label: 'item style',
			type: 'select',
			opts: [
				['icon-label', 'icon + label'],
				['icon', 'icon only'],
				['label', 'label only'],
				['dot', 'dots'],
			],
		},
		{
			key: 'layout',
			label: 'layout',
			type: 'select',
			opts: [
				['row', 'row'],
				['column', 'column'],
				['grid', 'grid'],
			],
		},
		{ key: 'cols', label: 'grid columns', type: 'range', min: 2, max: 6, step: 1 },
		{
			key: 'shape',
			label: 'shape',
			type: 'select',
			opts: [
				['square', 'square'],
				['rounded', 'rounded'],
				['pill', 'pill'],
			],
		},
		{ key: 'scale', label: 'size', type: 'range', min: 70, max: 160, step: 5, unit: '%' },
		{ key: 'gap', label: 'spacing', type: 'range', min: 0, max: 16, step: 1, unit: 'px' },
		{ key: 'opacity', label: 'opacity', type: 'range', min: 30, max: 100, step: 5, unit: '%' },
		{
			key: 'collapse',
			label: 'visibility',
			type: 'select',
			opts: [
				['always', 'always visible'],
				['hover', 'fade until hovered'],
				['button', 'collapse to a button'],
			],
		},
		{ key: 'arrows', label: 'side arrows', type: 'check' },
		{ key: 'swipe', label: 'swipe to change page', type: 'check' },
		{ key: 'instant', label: 'instant page change', type: 'check' },
	];

	let effective = null;
	let liveRoot = null;
	let liveSig = '';
	let palEl = null;
	let nvb = null;
	let draft = null;

	function defaultItems() {
		return PAGES.map((p, i) => ({ page: i, icon: p.icon, label: p.name, hidden: false }));
	}

	function baseConfig() {
		return {
			dock: 'bottom',
			align: 'center',
			floatX: 50,
			floatY: 50,
			layout: 'row',
			cols: 4,
			show: 'icon-label',
			shape: 'square',
			scale: 100,
			gap: 6,
			opacity: 100,
			collapse: 'always',
			arrows: false,
			swipe: true,
			instant: false,
			items: defaultItems(),
		};
	}

	function presetConfig(name) {
		return Object.assign(baseConfig(), PRESET_PATCH[name] || {});
	}

	function clamp(n, lo, hi, d) {
		n = Number(n);
		return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
	}

	function pick(v, list, d) {
		return list.indexOf(v) !== -1 ? v : d;
	}

	function escAttr(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function normalize(raw) {
		const c = Object.assign(baseConfig(), raw && typeof raw === 'object' ? raw : {});
		c.dock = pick(c.dock, ['top', 'bottom', 'left', 'right', 'float'], 'bottom');
		c.align = pick(c.align, ['start', 'center', 'end'], 'center');
		c.layout = pick(c.layout, ['row', 'column', 'grid'], 'row');
		c.show = pick(c.show, ['dot', 'icon', 'label', 'icon-label'], 'icon-label');
		c.shape = pick(c.shape, ['square', 'rounded', 'pill'], 'square');
		c.collapse = pick(c.collapse, ['always', 'hover', 'button'], 'always');
		c.floatX = clamp(c.floatX, 0, 100, 50);
		c.floatY = clamp(c.floatY, 0, 100, 50);
		c.cols = Math.round(clamp(c.cols, 2, 6, 4));
		c.scale = clamp(c.scale, 70, 160, 100);
		c.gap = clamp(c.gap, 0, 16, 6);
		c.opacity = clamp(c.opacity, 30, 100, 100);
		c.arrows = !!c.arrows;
		c.swipe = c.swipe !== false;
		c.instant = !!c.instant;
		const seen = new Set();
		const items = [];
		(Array.isArray(c.items) ? c.items : []).forEach((it) => {
			const page = Number(it && it.page);
			if (!Number.isInteger(page) || page < 0 || page >= PAGES.length || seen.has(page)) return;
			seen.add(page);
			items.push({
				page: page,
				icon: String(it.icon == null ? PAGES[page].icon : it.icon).slice(0, 4),
				label: String(it.label || PAGES[page].name).slice(0, 24),
				hidden: !!it.hidden && page !== SETTINGS_PAGE,
			});
		});
		PAGES.forEach((p, i) => {
			if (!seen.has(i)) items.push({ page: i, icon: p.icon, label: p.name, hidden: false });
		});
		c.items = items;
		return c;
	}

	function isLocked(i) {
		return !!(window.lockedPages && window.lockedPages.has(i));
	}

	function currentPage() {
		return typeof window._currentPage === 'number' ? window._currentPage : 0;
	}

	function goTo(page) {
		if (typeof window.goToPage === 'function') window.goToPage(page);
		if (liveRoot && liveRoot.classList.contains('nv-cl-button'))
			liveRoot.classList.add('nv-closed');
	}

	function commit(patch) {
		if (typeof window.applySettings === 'function') return window.applySettings(patch);
	}

	function applyPos(root, cfg) {
		root.className = root.className
			.replace(/\bnv-(dock|al)-\w+/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		root.classList.add('nv-dock-' + cfg.dock);
		if (cfg.dock === 'float') {
			root.style.left = cfg.floatX + '%';
			root.style.top = cfg.floatY + '%';
		} else {
			root.classList.add('nv-al-' + cfg.align);
			root.style.left = '';
			root.style.top = '';
		}
	}

	function buildRoot(cfg, mode, onGo) {
		const root = document.createElement('nav');
		root.className = [
			'nv-root',
			'nv-' + mode,
			'nv-lay-' + cfg.layout,
			'nv-sh-' + cfg.shape,
			'nv-sw-' + cfg.show,
			'nv-cl-' + cfg.collapse,
		].join(' ');
		root.setAttribute('aria-label', 'page navigation');
		root.style.setProperty('--nv-k', String((cfg.scale / 100) * (mode === 'preview' ? 0.6 : 1)));
		root.style.setProperty('--nv-gap', String(cfg.gap));
		root.style.setProperty('--nv-op', String(cfg.opacity));
		root.style.setProperty('--nv-cols', String(cfg.cols));

		if (cfg.collapse === 'button') {
			const t = document.createElement('button');
			t.type = 'button';
			t.className = 'nv-toggle';
			t.textContent = '☰';
			t.setAttribute('aria-label', 'toggle navigation');
			t.addEventListener('click', () => root.classList.toggle('nv-closed'));
			root.appendChild(t);
			if (mode === 'live') root.classList.add('nv-closed');
		}

		cfg.items.forEach((it) => {
			if (it.hidden) return;
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'nv-item';
			b.dataset.page = String(it.page);
			b.title = it.label;
			b.setAttribute('aria-label', it.label);
			if (cfg.show !== 'dot') {
				const showIcon = (cfg.show === 'icon' || cfg.show === 'icon-label') && !!it.icon;
				const showLabel = cfg.show === 'label' || cfg.show === 'icon-label' || !showIcon;
				if (showIcon) {
					const s = document.createElement('span');
					s.className = 'nv-icon';
					s.textContent = it.icon;
					b.appendChild(s);
				}
				if (showLabel) {
					const s = document.createElement('span');
					s.className = 'nv-label';
					s.textContent = it.label;
					b.appendChild(s);
				}
			}
			b.addEventListener('click', () => onGo(it.page));
			root.appendChild(b);
		});
		return root;
	}

	function syncLive() {
		if (!liveRoot) return;
		const cur = currentPage();
		liveRoot.querySelectorAll('.nv-item[data-page]').forEach((b) => {
			const i = Number(b.dataset.page);
			b.hidden = isLocked(i);
			const on = i === cur;
			b.classList.toggle('nv-on', on);
			if (on) b.setAttribute('aria-current', 'page');
			else b.removeAttribute('aria-current');
		});
		const on = liveRoot.querySelector('.nv-item.nv-on');
		if (!on || liveRoot.classList.contains('nv-closed')) return;
		if (liveRoot.classList.contains('nv-lay-row')) {
			liveRoot.scrollLeft = on.offsetLeft - (liveRoot.clientWidth - on.offsetWidth) / 2;
		} else if (liveRoot.classList.contains('nv-lay-column')) {
			liveRoot.scrollTop = on.offsetTop - (liveRoot.clientHeight - on.offsetHeight) / 2;
		}
	}

	function renderLive(style, rawCfg) {
		const cfg = style === 'custom' ? normalize(rawCfg) : presetConfig(style);
		effective = cfg;
		const sig = style + '|' + JSON.stringify(cfg);
		if (sig === liveSig) {
			syncLive();
			return;
		}
		liveSig = sig;
		if (liveRoot) {
			liveRoot.remove();
			liveRoot = null;
		}
		const cl = document.body.classList;
		cl.remove('nav-custom', 'nav-no-arrows', 'nav-no-swipe', 'nav-instant');
		if (style === 'dots') return;

		cl.add('nav-custom');
		cl.toggle('nav-no-arrows', !cfg.arrows);
		cl.toggle('nav-no-swipe', !cfg.swipe);
		cl.toggle('nav-instant', !!cfg.instant);

		const root = buildRoot(
			style === 'palette' ? Object.assign({}, cfg, { items: [] }) : cfg,
			'live',
			goTo
		);
		if (style === 'palette') {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'nv-item';
			b.textContent = '☰ pages';
			b.addEventListener('click', openPalette);
			root.appendChild(b);
		}
		applyPos(root, cfg);
		document.body.appendChild(root);
		liveRoot = root;
		syncLive();
	}

	function apply(style, rawCfg) {
		const s = STYLES.indexOf(style) !== -1 ? style : 'dots';
		const sel = document.getElementById('navStyleSelect');
		if (sel && sel.value !== s) sel.value = s;
		renderLive(s, rawCfg);
	}

	function closePalette() {
		if (!palEl) return;
		palEl.remove();
		palEl = null;
	}

	function openPalette() {
		if (palEl) {
			closePalette();
			return;
		}
		if (document.body.classList.contains('legacy-mode')) return;
		const items = (effective || presetConfig('tabs')).items;
		const ov = document.createElement('div');
		ov.className = 'nv-pal-overlay';
		ov.innerHTML =
			'<div class="nv-pal"><input class="nv-pal-input" type="text" placeholder="jump to a page..." spellcheck="false" autocomplete="off"><div class="nv-pal-list"></div></div>';
		document.body.appendChild(ov);
		palEl = ov;
		const input = ov.querySelector('input');
		const list = ov.querySelector('.nv-pal-list');
		let sel = 0;
		let shown = [];

		function choose(it) {
			closePalette();
			if (typeof window.goToPage === 'function') window.goToPage(it.page);
		}

		function render() {
			const q = input.value.trim().toLowerCase();
			shown = items.filter(
				(it) =>
					!isLocked(it.page) &&
					(!q || it.label.toLowerCase().indexOf(q) !== -1 || PAGES[it.page].name.indexOf(q) !== -1)
			);
			sel = Math.min(sel, Math.max(0, shown.length - 1));
			list.innerHTML = '';
			shown.forEach((it, idx) => {
				const row = document.createElement('div');
				row.className =
					'nv-pal-row' +
					(idx === sel ? ' nv-sel' : '') +
					(it.page === currentPage() ? ' nv-cur' : '');
				row.textContent = (it.icon ? it.icon + '  ' : '') + it.label;
				row.addEventListener('click', () => choose(it));
				list.appendChild(row);
			});
			if (!shown.length) {
				const e = document.createElement('div');
				e.className = 'nv-pal-empty';
				e.textContent = 'no pages found';
				list.appendChild(e);
			}
		}

		input.addEventListener('input', () => {
			sel = 0;
			render();
		});
		input.addEventListener('keydown', (e) => {
			e.stopPropagation();
			if (e.key === 'Escape') closePalette();
			else if (e.key === 'ArrowDown') {
				e.preventDefault();
				sel = Math.min(sel + 1, shown.length - 1);
				render();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				sel = Math.max(sel - 1, 0);
				render();
			} else if (e.key === 'Enter' && shown[sel]) choose(shown[sel]);
		});
		ov.addEventListener('pointerdown', (e) => {
			if (e.target === ov) closePalette();
		});
		render();
		input.focus();
	}

	function fieldHtml(f) {
		const id = 'nvbf-' + f.key;
		let inner;
		if (f.type === 'select') {
			inner =
				'<label class="nvb-lab" for="' +
				id +
				'">' +
				f.label +
				'</label><select id="' +
				id +
				'" class="nvb-in">' +
				f.opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') +
				'</select>';
		} else if (f.type === 'range') {
			inner =
				'<label class="nvb-lab" for="' +
				id +
				'">' +
				f.label +
				': <span id="' +
				id +
				'-v"></span></label><input id="' +
				id +
				'" class="nvb-in" type="range" min="' +
				f.min +
				'" max="' +
				f.max +
				'" step="' +
				f.step +
				'">';
		} else {
			inner =
				'<label class="nvb-chk"><input id="' + id + '" type="checkbox"> ' + f.label + '</label>';
		}
		return '<div class="nvb-field" id="nvbw-' + f.key + '">' + inner + '</div>';
	}

	function syncControls() {
		FIELDS.forEach((f) => {
			const n = document.getElementById('nvbf-' + f.key);
			if (!n) return;
			if (f.type === 'check') n.checked = !!draft[f.key];
			else n.value = draft[f.key];
			const v = document.getElementById('nvbf-' + f.key + '-v');
			if (v) v.textContent = draft[f.key] + (f.unit || '');
		});
		const w = document.getElementById('nvbw-cols');
		if (w) w.style.display = draft.layout === 'grid' ? '' : 'none';
	}

	function renderItems() {
		const host = document.getElementById('nvbItems');
		if (!host) return;
		host.innerHTML = '';
		draft.items.forEach((it, idx) => {
			const row = document.createElement('div');
			row.className = 'nvb-item-row';
			const locked = it.page === SETTINGS_PAGE;
			row.innerHTML =
				'<input type="checkbox" data-i="' +
				idx +
				'" data-f="vis"' +
				(it.hidden ? '' : ' checked') +
				(locked ? ' disabled title="settings always stays visible"' : '') +
				'>' +
				'<input class="nvb-in nvb-icon" data-i="' +
				idx +
				'" data-f="icon" maxlength="4" value="' +
				escAttr(it.icon) +
				'">' +
				'<input class="nvb-in nvb-lbl" data-i="' +
				idx +
				'" data-f="label" maxlength="24" value="' +
				escAttr(it.label) +
				'">' +
				'<button class="small" data-i="' +
				idx +
				'" data-f="up"' +
				(idx === 0 ? ' disabled' : '') +
				'>↑</button>' +
				'<button class="small" data-i="' +
				idx +
				'" data-f="down"' +
				(idx === draft.items.length - 1 ? ' disabled' : '') +
				'>↓</button>';
			host.appendChild(row);
		});
	}

	function bindDrag(root, screen) {
		root.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			if (root.setPointerCapture) root.setPointerCapture(e.pointerId);
			root.classList.add('nv-drag');
			const move = (ev) => {
				const r = screen.getBoundingClientRect();
				const x = Math.min(100, Math.max(0, ((ev.clientX - r.left) / r.width) * 100));
				const y = Math.min(100, Math.max(0, ((ev.clientY - r.top) / r.height) * 100));
				const d = [
					['left', x],
					['right', 100 - x],
					['top', y],
					['bottom', 100 - y],
				].sort((a, b) => a[1] - b[1])[0];
				if (d[1] < 18) {
					draft.dock = d[0];
					const t = d[0] === 'left' || d[0] === 'right' ? y : x;
					draft.align = t < 33 ? 'start' : t > 67 ? 'end' : 'center';
				} else {
					draft.dock = 'float';
					draft.floatX = Math.round(x);
					draft.floatY = Math.round(y);
				}
				applyPos(root, draft);
			};
			const up = () => {
				root.removeEventListener('pointermove', move);
				root.removeEventListener('pointerup', up);
				root.removeEventListener('pointercancel', up);
				if (draft.layout !== 'grid' && draft.dock !== 'float') {
					draft.layout = draft.dock === 'left' || draft.dock === 'right' ? 'column' : 'row';
				}
				syncControls();
				renderPreview();
			};
			root.addEventListener('pointermove', move);
			root.addEventListener('pointerup', up);
			root.addEventListener('pointercancel', up);
		});
	}

	function renderPreview() {
		const screen = document.getElementById('nvbScreen');
		if (!screen) return;
		screen.querySelectorAll('.nv-root').forEach((n) => n.remove());
		const root = buildRoot(draft, 'preview', function () {});
		applyPos(root, draft);
		screen.appendChild(root);
		bindDrag(root, screen);
	}

	function loadDraft(cfg) {
		draft = cfg;
		syncControls();
		renderItems();
		renderPreview();
	}

	function moveItem(i, d) {
		const j = i + d;
		if (j < 0 || j >= draft.items.length) return;
		const tmp = draft.items[i];
		draft.items[i] = draft.items[j];
		draft.items[j] = tmp;
		renderItems();
		renderPreview();
	}

	function closeBuilder() {
		if (!nvb) return;
		nvb.remove();
		nvb = null;
		draft = null;
		document.body.style.overflow = '';
	}

	function applyBuilder() {
		const cfg = normalize(draft);
		commit({ navStyle: 'custom', navConfig: cfg });
		closeBuilder();
	}

	function openBuilder() {
		if (nvb) return;
		draft = normalize(JSON.parse(JSON.stringify(effective || presetConfig('tabs'))));
		nvb = document.createElement('div');
		nvb.className = 'nvb-overlay';
		nvb.innerHTML =
			'<div class="nvb-panel">' +
			'<div class="nvb-head"><span>navigator builder</span><button class="small" data-act="discard">close</button></div>' +
			'<div class="nvb-presets"><button class="small" data-preset="tabs">tab bar</button><button class="small" data-preset="dock">icon dock</button><button class="small" data-preset="sidebar">sidebar</button></div>' +
			'<div class="nvb-grid"><div>' +
			'<div class="nvb-screen" id="nvbScreen"><div class="nvb-fake"><i></i><i></i><i></i></div></div>' +
			'<div class="nvb-hint">drag the bar to an edge to dock it, or drop it anywhere else to float it. settings always stays visible so you can undo this.</div>' +
			'</div><div class="nvb-controls">' +
			FIELDS.map(fieldHtml).join('') +
			'</div></div>' +
			'<div class="nvb-pages-title">pages</div><div id="nvbItems"></div>' +
			'<div class="nvb-foot"><button data-act="apply" style="flex:1">apply &amp; save</button><button class="small" data-act="reset">reset</button><button class="small" data-act="discard">discard</button></div>' +
			'</div>';

		nvb.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			if (b.dataset.act === 'apply') applyBuilder();
			else if (b.dataset.act === 'discard') closeBuilder();
			else if (b.dataset.act === 'reset') loadDraft(presetConfig('tabs'));
			else if (b.dataset.preset) loadDraft(presetConfig(b.dataset.preset));
			else if (b.dataset.f === 'up') moveItem(Number(b.dataset.i), -1);
			else if (b.dataset.f === 'down') moveItem(Number(b.dataset.i), 1);
		});

		const onField = (e) => {
			const t = e.target;
			if (t.dataset && t.dataset.f && t.dataset.i !== undefined) {
				const it = draft.items[Number(t.dataset.i)];
				if (!it) return;
				if (t.dataset.f === 'vis') it.hidden = !t.checked;
				else if (t.dataset.f === 'icon') it.icon = t.value.slice(0, 4);
				else if (t.dataset.f === 'label') it.label = t.value.slice(0, 24) || PAGES[it.page].name;
				else return;
				renderPreview();
				return;
			}
			if (!t.id || t.id.indexOf('nvbf-') !== 0) return;
			const f = FIELDS.find((x) => 'nvbf-' + x.key === t.id);
			if (!f) return;
			draft[f.key] =
				f.type === 'check' ? t.checked : f.type === 'range' ? Number(t.value) : t.value;
			syncControls();
			renderPreview();
		};
		nvb.addEventListener('input', onField);
		nvb.addEventListener('change', onField);
		nvb.addEventListener('keydown', (e) => {
			e.stopPropagation();
			if (e.key === 'Escape') closeBuilder();
		});

		document.body.appendChild(nvb);
		document.body.style.overflow = 'hidden';
		loadDraft(draft);
	}

	function injectStyles() {
		if (document.getElementById('nav-system-style')) return;
		const s = document.createElement('style');
		s.id = 'nav-system-style';
		s.textContent = `
.nv-root{--nv-k:1;--nv-gap:6;--nv-op:100;--nv-cols:4;--nv-edge:16px;--nv-sl:68px;--nv-sr:132px;--nv-st:60px;--nv-sb:70px;--nv-mw:calc(100vw - 150px);--nv-mh:calc(100vh - 150px);position:fixed;z-index:9997;display:flex;align-items:center;gap:calc(var(--nv-gap) * var(--nv-k) * 1px);padding:calc(var(--nv-k) * 6px);background:var(--panel-bg);border:1px solid var(--border-color);border-radius:calc(var(--nv-k) * 12px);max-width:var(--nv-mw);max-height:var(--nv-mh);overflow:auto;scrollbar-width:none;opacity:calc(var(--nv-op) / 100);transition:opacity .2s}
.nv-root::-webkit-scrollbar{display:none}
.nv-preview{position:absolute;--nv-edge:6px;--nv-sl:6px;--nv-sr:6px;--nv-st:6px;--nv-sb:6px;--nv-mw:calc(100% - 12px);--nv-mh:calc(100% - 12px);cursor:grab;touch-action:none;z-index:2}
.nv-preview.nv-drag{cursor:grabbing}
.nv-lay-column{flex-direction:column}
.nv-lay-grid{display:grid;grid-template-columns:repeat(var(--nv-cols),auto)}
.nv-dock-bottom{bottom:var(--nv-edge)}
.nv-dock-top{top:var(--nv-edge)}
.nv-dock-left{left:var(--nv-edge)}
.nv-dock-right{right:var(--nv-edge)}
.nv-dock-top.nv-al-center,.nv-dock-bottom.nv-al-center{left:50%;transform:translateX(-50%)}
.nv-dock-top.nv-al-start,.nv-dock-bottom.nv-al-start{left:var(--nv-sl)}
.nv-dock-top.nv-al-end,.nv-dock-bottom.nv-al-end{right:var(--nv-sr)}
.nv-dock-left.nv-al-center,.nv-dock-right.nv-al-center{top:50%;transform:translateY(-50%)}
.nv-dock-left.nv-al-start,.nv-dock-right.nv-al-start{top:var(--nv-st)}
.nv-dock-left.nv-al-end,.nv-dock-right.nv-al-end{bottom:var(--nv-sb)}
.nv-dock-float{transform:translate(-50%,-50%)}
.nv-item,.nv-toggle{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:calc(var(--nv-k) * 6px);min-width:calc(var(--nv-k) * 34px);height:calc(var(--nv-k) * 34px);padding:0 calc(var(--nv-k) * 8px);background:transparent;border:1px solid transparent;color:var(--text-color);font-size:calc(var(--nv-k) * 12px);line-height:1;opacity:.6;text-transform:lowercase;white-space:nowrap;border-radius:calc(var(--nv-k) * 8px)}
.nv-root .nv-item:hover,.nv-root .nv-toggle:hover{animation:none;opacity:.95;background:var(--button-hover)}
.nv-root .nv-item.nv-on{opacity:1;background:var(--button-bg);border-color:var(--border-color)}
.nv-item[hidden]{display:none}
.nv-closed .nv-item{display:none}
.nv-icon{font-size:calc(var(--nv-k) * 15px)}
.nv-sh-rounded .nv-item,.nv-sh-rounded .nv-toggle{border-radius:calc(var(--nv-k) * 16px)}
.nv-sh-pill .nv-item,.nv-sh-pill .nv-toggle{border-radius:999px}
.nv-sw-dot .nv-item{min-width:calc(var(--nv-k) * 9px);width:calc(var(--nv-k) * 9px);height:calc(var(--nv-k) * 9px);padding:0;border:none;border-radius:999px;background:var(--border-color);opacity:1}
.nv-root.nv-sw-dot .nv-item.nv-on{width:calc(var(--nv-k) * 28px);background:var(--text-color);border:none}
.nv-root.nv-sw-dot.nv-lay-column .nv-item.nv-on{width:calc(var(--nv-k) * 9px);height:calc(var(--nv-k) * 28px)}
.nv-lay-column .nv-item{justify-content:flex-start}
.nv-lay-column.nv-sw-icon-label .nv-item,.nv-lay-column.nv-sw-label .nv-item{width:100%}
.nv-live.nv-cl-hover:not(:hover):not(:focus-within){opacity:calc(var(--nv-op) / 100 * .25)}
body.nav-custom .page-dots{display:none}
body.nav-no-arrows .page-arrow{display:none}
body.nav-instant .page-container{transition:none !important}
body.legacy-mode .nv-live{display:none}
@media (max-width:700px){.nv-live.nv-lay-column.nv-sw-icon-label .nv-label{display:none}}
.nv-pal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:20100;display:flex;justify-content:center;align-items:flex-start;padding-top:14vh}
.nv-pal{width:min(420px,92vw);background:var(--panel-bg);border:1px solid var(--border-color);border-radius:6px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.6)}
.nv-pal-input{width:100%;padding:12px 14px;background:var(--input-bg);border:none;border-bottom:1px solid var(--border-color);color:var(--text-color);font-family:monospace;font-size:16px;outline:none}
.nv-pal-list{max-height:50vh;overflow-y:auto}
.nv-pal-row{padding:9px 14px;cursor:pointer;font-size:.9em;white-space:pre}
.nv-pal-row.nv-sel{background:var(--button-hover)}
.nv-pal-row.nv-cur{border-left:2px solid var(--accent-color)}
.nv-pal-empty{padding:14px;opacity:.5;font-size:.85em;text-align:center}
.nvb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:20002;overflow-y:auto}
.nvb-panel{max-width:680px;margin:0 auto;padding:20px 20px 0;color:var(--text-color)}
.nvb-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:1.05em}
.nvb-presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.nvb-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media (max-width:600px){.nvb-grid{grid-template-columns:1fr}}
.nvb-screen{position:relative;width:100%;aspect-ratio:4 / 3;background:var(--bg-color);border:1px solid var(--border-color);border-radius:6px;overflow:hidden}
.nvb-fake{position:absolute;inset:18%;display:flex;flex-direction:column;gap:8%}
.nvb-fake i{display:block;flex:1;background:var(--overlay-bg);border:1px solid var(--border-color);border-radius:3px}
.nvb-hint{font-size:.72em;opacity:.45;margin-top:8px;line-height:1.5}
.nvb-field{margin-bottom:10px}
.nvb-lab{display:block;font-size:.8em;opacity:.7;margin-bottom:4px}
.nvb-in{width:100%;background:var(--input-bg);color:var(--text-color);border:1px solid var(--border-color);padding:6px 8px;font-family:monospace;font-size:.85em;border-radius:2px}
.nvb-chk{display:flex;gap:8px;align-items:center;font-size:.85em;opacity:.8}
.nvb-pages-title{font-size:.75em;opacity:.4;letter-spacing:.06em;margin:22px 0 8px}
.nvb-item-row{display:flex;gap:6px;align-items:center;margin-bottom:6px}
.nvb-icon{width:52px;flex:0 0 52px;text-align:center}
.nvb-lbl{flex:1;min-width:0;width:auto}
.nvb-foot{position:sticky;bottom:0;display:flex;gap:8px;padding:12px 0;margin-top:16px;background:var(--bg-color);border-top:1px solid var(--border-color)}
`;
		document.head.appendChild(s);
	}

	function init() {
		try {
			if (new URLSearchParams(location.search).get('nav') === 'reset') {
				const s = JSON.parse(localStorage.getItem('userSettings') || '{}');
				delete s.navStyle;
				delete s.navConfig;
				localStorage.setItem('userSettings', JSON.stringify(s));
			}
		} catch (_) {}

		injectStyles();
		effective = presetConfig('tabs');

		const sel = document.getElementById('navStyleSelect');
		if (sel) sel.addEventListener('change', () => commit({ navStyle: sel.value }));
		const btn = document.getElementById('openNavBuilderBtn');
		if (btn) btn.addEventListener('click', openBuilder);

		const dots = document.querySelector('.page-dots');
		if (dots) {
			new MutationObserver(syncLive).observe(dots, {
				attributes: true,
				attributeFilter: ['class'],
				subtree: true,
			});
		}

		document.addEventListener('keydown', (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				openPalette();
			}
		});

		try {
			const saved = JSON.parse(localStorage.getItem('userSettings') || '{}');
			apply(saved.navStyle, saved.navConfig);
		} catch (_) {
			apply('dots');
		}
	}

	window.NavSystem = { apply: apply, openBuilder: openBuilder, openPalette: openPalette };

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
