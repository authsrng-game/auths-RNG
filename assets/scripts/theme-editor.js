(function () {
	'use strict';

	console.log(performance.now());

	const BUILT_IN_PRESETS = [
		{
			name: 'default',
			vars: {
				bgColor: '#0e0e0e',
				textColor: '#dcdcdc',
				panelBg: '#111111',
				overlayBg: '#0a0a0a',
				borderColor: '#2a2a2a',
				buttonBg: '#1a1a1a',
				accentColor: '#dcdcdc',
				pointsColor: '#ffb86b',
				achievementBg: '#1a2a1a',
				achievementBorder: '#2a4a2a',
			},
			settings: { radius: 2, borderWidth: 1, textSize: 16, font: 'default' },
		},
		{
			name: 'material you',
			vars: {
				bgColor: '#1c1b1f',
				textColor: '#e6e1e5',
				panelBg: '#2d2c31',
				overlayBg: '#141218',
				borderColor: '#49454f',
				buttonBg: '#4a4458',
				accentColor: '#d0bcff',
				pointsColor: '#ffb4ab',
				achievementBg: '#21005d',
				achievementBorder: '#d0bcff',
			},
			settings: { radius: 16, borderWidth: 0, textSize: 16, font: 'default' },
		},
		{
			name: 'midnight blue',
			vars: {
				bgColor: '#0a0e1a',
				textColor: '#c8d8f0',
				panelBg: '#0f1525',
				overlayBg: '#070b14',
				borderColor: '#1e2d4a',
				buttonBg: '#152038',
				accentColor: '#4d9fff',
				pointsColor: '#ffd166',
				achievementBg: '#0d1e3a',
				achievementBorder: '#2255aa',
			},
			settings: { radius: 4, borderWidth: 1, textSize: 16, font: 'default' },
		},
		{
			name: 'rose',
			vars: {
				bgColor: '#1a0d0f',
				textColor: '#f0d8dc',
				panelBg: '#240f13',
				overlayBg: '#120709',
				borderColor: '#4a1f26',
				buttonBg: '#331218',
				accentColor: '#ff6b8a',
				pointsColor: '#ffb347',
				achievementBg: '#2a0d14',
				achievementBorder: '#8b2a3a',
			},
			settings: { radius: 3, borderWidth: 1, textSize: 16, font: 'default' },
		},
		{
			name: 'forest',
			vars: {
				bgColor: '#0a1208',
				textColor: '#c8e0c0',
				panelBg: '#0f1a0c',
				overlayBg: '#070e05',
				borderColor: '#1e3a18',
				buttonBg: '#142610',
				accentColor: '#6abf5e',
				pointsColor: '#d4a843',
				achievementBg: '#0d2209',
				achievementBorder: '#2d6625',
			},
			settings: { radius: 2, borderWidth: 1, textSize: 16, font: 'default' },
		},
		{
			name: 'slate',
			vars: {
				bgColor: '#0f1117',
				textColor: '#cbd5e1',
				panelBg: '#161b27',
				overlayBg: '#0b0e17',
				borderColor: '#2a3347',
				buttonBg: '#1e2538',
				accentColor: '#94a3b8',
				pointsColor: '#f59e0b',
				achievementBg: '#162032',
				achievementBorder: '#334d6e',
			},
			settings: { radius: 6, borderWidth: 1, textSize: 16, font: 'default' },
		},
		{
			name: 'paper',
			vars: {
				bgColor: '#f5f0e8',
				textColor: '#2c2416',
				panelBg: '#ede8de',
				overlayBg: '#f9f6f0',
				borderColor: '#c8b99a',
				buttonBg: '#e0d8c8',
				accentColor: '#8b5e3c',
				pointsColor: '#c2540a',
				achievementBg: '#dff0df',
				achievementBorder: '#7aaa6a',
			},
			settings: { radius: 2, borderWidth: 1, textSize: 16, font: 'serif' },
		},
		{
			name: 'amber',
			vars: {
				bgColor: '#0f0a00',
				textColor: '#ffe8a0',
				panelBg: '#1a1000',
				overlayBg: '#090600',
				borderColor: '#3d2a00',
				buttonBg: '#261900',
				accentColor: '#ffb800',
				pointsColor: '#ff7c00',
				achievementBg: '#1f1500',
				achievementBorder: '#7a5500',
			},
			settings: { radius: 0, borderWidth: 1, textSize: 15, font: 'mono' },
		},
		{
			name: 'ice',
			vars: {
				bgColor: '#f0f6ff',
				textColor: '#1a2a3a',
				panelBg: '#e4eef9',
				overlayBg: '#f7faff',
				borderColor: '#b8d0e8',
				buttonBg: '#d8eaf7',
				accentColor: '#2e7fc2',
				pointsColor: '#0066cc',
				achievementBg: '#d8eef8',
				achievementBorder: '#5aaade',
			},
			settings: { radius: 8, borderWidth: 1, textSize: 16, font: 'default' },
		},
	];

	const STORAGE_KEY = 'themeEditorPresets';
	const ACTIVE_KEY = 'themeEditorActive';

	const PRESET_SCHEMA_VERSION = 2;

	const PRESET_DEFAULTS = {
		vars: {
			bgColor: '#0e0e0e',
			textColor: '#dcdcdc',
			panelBg: '#111111',
			overlayBg: '#0a0a0a',
			borderColor: '#2a2a2a',
			buttonBg: '#1a1a1a',
			accentColor: '#dcdcdc',
			pointsColor: '#ffb86b',
			achievementBg: '#1a2a1a',
			achievementBorder: '#2a4a2a',
			gauntletEasy: '#8d8',
			gauntletMedium: '#78f',
			gauntletHard: '#f77',
			gauntletInsane: '#d4f',
			gauntletGodlike: '#ffd700',
			gauntletInferno: '#ff4500',
			gauntletVoid: '#96f',
			gauntletAbyss: '#0cc',
			gauntletEclipseGate: '#f80',
			wellResultAmount: '#4a4',
			notifBadge: '#dcdcdc',
			activePotionTimer: '#fa6',
		},
		settings: {
			radius: 2,
			radiusTopLeft: null,
			radiusTopRight: null,
			radiusBottomLeft: null,
			radiusBottomRight: null,
			radiusIndependent: false,
			buttonRadius: null,
			rollBtnRadius: null,
			borderWidth: 1,
			borderStyle: 'solid',
			shadowDepth: 0,
			textSize: 16,
			font: 'default',
			customFontName: '',
			customFontUrl: '',
			headerScale: 1,
			bodyScale: 1,
			smallScale: 1,
			rollBtnTextScale: 1,
			headerLetterSpacing: 0.06,
			headerWeight: 400,
			headerCase: 'none',
			buttonCase: 'lowercase',
			spacingScale: 1,
			colorMode: {
				bgColor: 'solid',
				panelBg: 'solid',
				buttonBg: 'solid',
				achievementBg: 'solid',
			},
			gradientOverrides: {
				bgColor: { from: '#0e0e0e', to: '#1a1a2e', angle: 135 },
				panelBg: { from: '#111111', to: '#1a1a1a', angle: 135 },
				buttonBg: { from: '#1a1a1a', to: '#242424', angle: 135 },
				achievementBg: { from: '#1a2a1a', to: '#2a4a2a', angle: 135 },
			},
			easing: 'default',
			perElementMotion: {
				hoverGlow: true,
				rainbowShimmer: true,
				pageTransition: true,
				achievementPulse: true,
			},
			noiseEnabled: false,
			noiseIntensity: 5,
			vignetteEnabled: false,
			vignetteIntensity: 30,
			bgPatternSize: 20,
			bgPatternColor: 'auto',
			bgPatternOpacity: 5,
			inventoryStyle: 'compact',
			spinnerStyle: 'slot',
			rollBtnSize: 'normal',
			customRollText: '',
			bgPattern: 'none',
			season: 'none',
			particleDensity: 'medium',
			blurPanels: false,
			blurIntensity: 10,
			blurSaturate: 140,
			blurPanelOpacity: 55,
			blurBorderOpacity: 8,
			compactMode: false,
			hideCursor: false,
			hideLuckBreakdown: false,
			reduceMotion: false,
			highContrast: false,
			largeTargets: false,
			rgb: false,
			wacky: false,
			chaos: false,
			confettiThreshold: 0,
			rareThreshold: 1000,
			cutsceneThreshold: 0,
			bgType: 'color',
			bgGradientFrom: '#0e0e0e',
			bgGradientTo: '#1a1a2e',
			bgGradientAngle: 135,
			bgGradientType: 'linear',
			glowEnabled: false,
			glowColor: '#dcdcdc',
			glowCount: 3,
			glowSize: 300,
			glowOpacity: 20,
			glowSpeed: 20,
			startAnim: {
				enabled: true,
				preset: 'default',
				bgColor: 'theme',
				fgColor: 'theme',
				customBg: '#0e0e0e',
				customFg: '#dcdcdc',
				wakeText: 'click/tap to wake up...',
				speed: 'normal',
				skipOnReturn: false,
				customCode: '',
			},
		},
	};

	function deepMerge(base, patch) {
		if (Array.isArray(base) || typeof base !== 'object' || base === null) {
			return patch === undefined ? base : patch;
		}
		const out = { ...base };
		if (patch && typeof patch === 'object') {
			for (const k of Object.keys(patch)) {
				out[k] = deepMerge(base[k], patch[k]);
			}
		}
		return out;
	}

	function migratePreset(preset) {
		const version = preset.__v ?? 1;
		let p = preset;

		if (version < 2) {
			p = {
				...p,
				vars: { ...p.vars },
				settings: { ...p.settings },
			};
			if (p.settings && p.settings.glow !== undefined) {
				p.settings.glowEnabled = !!p.settings.glow;
				delete p.settings.glow;
			}
		}

		const merged = {
			name: p.name,
			__v: PRESET_SCHEMA_VERSION,
			vars: deepMerge(PRESET_DEFAULTS.vars, p.vars || {}),
			settings: deepMerge(PRESET_DEFAULTS.settings, p.settings || {}),
			iconPack: 'default',
			potionPack: 'default',
			iconOverrides: {
				notifBell: '',
				friendsBtn: '',
				messagesBtn: '',
				wellVisual: '',
				seasonWinter: '',
				seasonSpring: '',
				seasonSummer: '',
				seasonFall: '',
			},
		};
		return merged;
	}

	function relativeLuminance(hex) {
		const rgb = hexToRgb(hex);
		if (!rgb) return null;
		const toLinear = (c) => {
			const s = c / 255;
			return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
		};
		const r = toLinear(rgb.r);
		const g = toLinear(rgb.g);
		const b = toLinear(rgb.b);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}

	function contrastRatio(hexA, hexB) {
		const lA = relativeLuminance(hexA);
		const lB = relativeLuminance(hexB);
		if (lA === null || lB === null) return null;
		const lighter = Math.max(lA, lB);
		const darker = Math.min(lA, lB);
		return (lighter + 0.05) / (darker + 0.05);
	}

	function contrastLabel(ratio) {
		if (ratio === null) return { text: 'invalid color', cls: 'ctr-fail' };
		const r = ratio.toFixed(2);
		if (ratio >= 7) return { text: `${r}:1 — AAA`, cls: 'ctr-pass' };
		if (ratio >= 4.5) return { text: `${r}:1 — AA`, cls: 'ctr-pass' };
		if (ratio >= 3) return { text: `${r}:1 — AA large text only`, cls: 'ctr-warn' };
		return { text: `${r}:1 — fails`, cls: 'ctr-fail' };
	}

	function hexToRgb(hex) {
		const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
	}

	const IDB_NAME = 'authsrng-theme';
	const IDB_STORE = 'assets';

	function openIDB() {
		return new Promise((res, rej) => {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
			req.onsuccess = (e) => res(e.target.result);
			req.onerror = () => rej(req.error);
		});
	}

	async function idbSet(key, val) {
		const db = await openIDB();
		return new Promise((res, rej) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).put(val, key);
			tx.oncomplete = res;
			tx.onerror = () => rej(tx.error);
		});
	}

	async function idbGet(key) {
		const db = await openIDB();
		return new Promise((res, rej) => {
			const tx = db.transaction(IDB_STORE, 'readonly');
			const req = tx.objectStore(IDB_STORE).get(key);
			req.onsuccess = () => res(req.result ?? null);
			req.onerror = () => rej(req.error);
		});
	}

	async function idbDel(key) {
		const db = await openIDB();
		return new Promise((res, rej) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).delete(key);
			tx.oncomplete = res;
			tx.onerror = () => rej(tx.error);
		});
	}

	async function idbSetFont(name, buffer) {
		const db = await openIDB();
		return new Promise((res, rej) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).put(buffer, 'font-' + name);
			tx.oncomplete = res;
			tx.onerror = () => rej(tx.error);
		});
	}

	async function idbGetFont(name) {
		return idbGet('font-' + name);
	}

	let _loadedFontFace = null;

	async function applyCustomFont(name) {
		if (!name) return;
		try {
			const buf = await idbGetFont(name);
			if (!buf) return;
			if (_loadedFontFace) {
				document.fonts.delete(_loadedFontFace);
				_loadedFontFace = null;
			}
			const face = new FontFace('authsrng-custom', buf);
			await face.load();
			document.fonts.add(face);
			_loadedFontFace = face;
			document.documentElement.style.setProperty('--font-body', 'authsrng-custom, monospace');
		} catch (e) {
			console.error('custom font load failed', e);
		}
	}

	function el(id) {
		return document.getElementById(id);
	}

	function getUserPresets() {
		let raw;
		try {
			raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		} catch (_) {
			return [];
		}
		if (!Array.isArray(raw)) return [];

		let migratedAny = false;
		const migrated = raw.map((p) => {
			if (p.__v === PRESET_SCHEMA_VERSION) return p;
			migratedAny = true;
			return migratePreset(p);
		});

		if (migratedAny) saveUserPresets(migrated);
		return migrated;
	}

	function saveUserPresets(arr) {
		try {
			const stamped = arr.map((p) => ({ ...p, __v: PRESET_SCHEMA_VERSION }));
			localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
		} catch (_) {}
	}

	function getAllPresets() {
		return [...BUILT_IN_PRESETS, ...getUserPresets()];
	}

	const CONTRAST_PAIRS = [
		{ fg: 'te-textColor', bg: 'te-bgColor', label: 'text on background' },
		{ fg: 'te-textColor', bg: 'te-panelBg', label: 'text on panel' },
		{ fg: 'te-textColor', bg: 'te-buttonBg', label: 'text on button' },
		{ fg: 'te-pointsColor', bg: 'te-bgColor', label: 'points on background' },
	];

	function ensureContrastBadge(afterId, key) {
		const id = 'te-ctr-' + key;
		let badge = el(id);
		if (badge) return badge;
		const anchor = el(afterId);
		if (!anchor) return null;
		badge = document.createElement('div');
		badge.id = id;
		badge.className = 'te-contrast-badge';
		anchor.parentNode.insertBefore(badge, anchor.nextSibling);
		return badge;
	}

	function updateContrastBadges() {
		CONTRAST_PAIRS.forEach((pair, i) => {
			const fgEl = el(pair.fg);
			const bgEl = el(pair.bg);
			if (!fgEl || !bgEl) return;
			const badge = ensureContrastBadge(pair.bg, i);
			if (!badge) return;
			const ratio = contrastRatio(fgEl.value, bgEl.value);
			const { text, cls } = contrastLabel(ratio);
			badge.textContent = `${pair.label}: ${text}`;
			badge.className = 'te-contrast-badge ' + cls;
		});
	}

	const UNDO_LIMIT = 50;
	let undoStack = [];
	let undoDebounceTimer = null;
	let suppressUndoCapture = false;
	let _lastCustomCodeApproved = false;

	function snapshotEditorState() {
		return JSON.stringify(readEditor());
	}

	function pushUndoSnapshot() {
		if (suppressUndoCapture) return;
		const snap = snapshotEditorState();
		if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
		undoStack.push(snap);
		if (undoStack.length > UNDO_LIMIT) undoStack.shift();
		syncUndoButton();
	}

	function pushUndoSnapshotDebounced() {
		clearTimeout(undoDebounceTimer);
		undoDebounceTimer = setTimeout(pushUndoSnapshot, 300);
	}

	function popUndoSnapshot() {
		if (undoStack.length < 2) return null;
		undoStack.pop();
		return undoStack[undoStack.length - 1];
	}

	function syncUndoButton() {
		const btn = el('te-undo');
		if (btn) btn.disabled = undoStack.length < 2;
	}

	function resetUndoStack() {
		undoStack = [snapshotEditorState()];
		syncUndoButton();
	}

	function readEditor() {
		function val(id) {
			return el(id) ? el(id).value : '';
		}
		function intVal(id, def) {
			return el(id) ? parseInt(el(id).value, 10) || def : def;
		}
		function checked(id) {
			return el(id) ? el(id).checked : false;
		}

		return {
			vars: {
				bgColor: val('te-bgColor'),
				textColor: val('te-textColor'),
				panelBg: val('te-panelBg'),
				overlayBg: val('te-overlayBg'),
				borderColor: val('te-borderColor'),
				buttonBg: val('te-buttonBg'),
				accentColor: val('te-accentColor'),
				pointsColor: val('te-pointsColor'),
				achievementBg: val('te-achievementBg'),
				achievementBorder: val('te-achievementBorder'),
				gauntletEasy: val('te-gauntletEasy'),
				gauntletMedium: val('te-gauntletMedium'),
				gauntletHard: val('te-gauntletHard'),
				gauntletInsane: val('te-gauntletInsane'),
				gauntletGodlike: val('te-gauntletGodlike'),
				wellResultAmount: val('te-wellResultAmount'),
				notifBadge: val('te-notifBadge'),
			},
			settings: {
				radius: intVal('te-radius', 2),
				borderWidth: intVal('te-borderWidth', 1),
				textSize: intVal('te-textSize', 16),
				font: val('te-font') || 'default',
				inventoryStyle: val('te-inventoryStyle') || 'compact',
				spinnerStyle: val('te-spinnerStyle') || 'slot',
				rollBtnSize: val('te-rollBtnSize') || 'normal',
				customRollText: val('te-customRollText'),
				bgPattern: val('te-bgPattern') || 'none',
				season: val('te-season') || 'none',
				particleDensity: val('te-particleDensity') || 'medium',
				blurPanels: checked('te-blurPanels'),
				blurIntensity: intVal('te-blurIntensity', 10),
				blurSaturate: intVal('te-blurSaturate', 140),
				blurPanelOpacity: intVal('te-blurPanelOpacity', 55),
				blurBorderOpacity: intVal('te-blurBorderOpacity', 8),
				compactMode: checked('te-compactMode'),
				hideCursor: checked('te-hideCursor'),
				hideLuckBreakdown: checked('te-hideLuckBreakdown'),
				reduceMotion: checked('te-reduceMotion'),
				highContrast: checked('te-highContrast'),
				largeTargets: checked('te-largeTargets'),
				rgb: checked('te-rgbBg'),
				wacky: checked('te-wackyText'),
				chaos: checked('te-chaosMode'),
				confettiThreshold: intVal('te-confettiThreshold', 0),
				rareThreshold: intVal('te-rareThreshold', 1000),
				cutsceneThreshold: intVal('te-cutsceneThreshold', 0),
				bgType: val('te-bgType') || 'color',
				bgGradientFrom: val('te-bgGradientFrom') || '#0e0e0e',
				bgGradientTo: val('te-bgGradientTo') || '#1a1a2e',
				bgGradientAngle: intVal('te-bgGradientAngle', 135),
				bgGradientType: val('te-bgGradientType') || 'linear',
				glowEnabled: checked('te-glowEnabled'),
				glowColor: val('te-glowColor'),
				iconPack: val('te-iconPack') || 'default',
				potionPack: val('te-potionPack') || 'default',
				iconOverrides: {
					notifBell: val('te-icon-notifBell'),
					friendsBtn: val('te-icon-friendsBtn'),
					messagesBtn: val('te-icon-messagesBtn'),
					wellVisual: val('te-icon-wellVisual'),
					seasonWinter: val('te-icon-seasonWinter'),
					seasonSpring: val('te-icon-seasonSpring'),
					seasonSummer: val('te-icon-seasonSummer'),
					seasonFall: val('te-icon-seasonFall'),
				},
				glowCount: intVal('te-glowCount', 3),
				glowSize: intVal('te-glowSize', 300),
				glowOpacity: intVal('te-glowOpacity', 20),
				glowSpeed: intVal('te-glowSpeed', 20),
				gauntletEasy: val('te-gauntletEasy'),
				gauntletMedium: val('te-gauntletMedium'),
				gauntletHard: val('te-gauntletHard'),
				gauntletInsane: val('te-gauntletInsane'),
				gauntletGodlike: val('te-gauntletGodlike'),
				wellResultAmount: val('te-wellResultAmount'),
				notifBadge: val('te-notifBadge'),
				spacingScale: parseFloat(el('te-spacingScale') ? el('te-spacingScale').value : 1),
				headerScale: parseFloat(el('te-headerScale') ? el('te-headerScale').value : 1),
				bodyScale: parseFloat(el('te-bodyScale') ? el('te-bodyScale').value : 1),
				headerLetterSpacing: parseFloat(
					el('te-headerLetterSpacing') ? el('te-headerLetterSpacing').value : 0.06
				),
				headerWeight: intVal('te-headerWeight', 400),
				headerCase: val('te-headerCase') || 'none',
				colorMode: {
					bgColor: val('te-colorMode-bgColor') || 'solid',
					panelBg: val('te-colorMode-panelBg') || 'solid',
					buttonBg: val('te-colorMode-buttonBg') || 'solid',
					achievementBg: val('te-colorMode-achievementBg') || 'solid',
				},
				gradientOverrides: {
					bgColor: {
						from: val('te-gradFrom-bgColor') || '#0e0e0e',
						to: val('te-gradTo-bgColor') || '#1a1a2e',
						angle: intVal('te-gradAngle-bgColor', 135),
					},
					panelBg: {
						from: val('te-gradFrom-panelBg') || '#111111',
						to: val('te-gradTo-panelBg') || '#1a1a1a',
						angle: intVal('te-gradAngle-panelBg', 135),
					},
					buttonBg: {
						from: val('te-gradFrom-buttonBg') || '#1a1a1a',
						to: val('te-gradTo-buttonBg') || '#242424',
						angle: intVal('te-gradAngle-buttonBg', 135),
					},
					achievementBg: {
						from: val('te-gradFrom-achievementBg') || '#1a2a1a',
						to: val('te-gradTo-achievementBg') || '#2a4a2a',
						angle: intVal('te-gradAngle-achievementBg', 135),
					},
				},
				buttonCase: val('te-buttonCase') || 'lowercase',
				radiusIndependent: checked('te-radiusIndependent'),
				radiusTopLeft: intVal('te-radiusTopLeft', 2),
				radiusTopRight: intVal('te-radiusTopRight', 2),
				radiusBottomLeft: intVal('te-radiusBottomLeft', 2),
				radiusBottomRight: intVal('te-radiusBottomRight', 2),
				buttonRadius: intVal('te-buttonRadius', 2),
				rollBtnRadius: intVal('te-rollBtnRadius', 2),
				borderStyle: val('te-borderStyle') || 'solid',
				shadowDepth: intVal('te-shadowDepth', 0),
				easing: val('te-easing') || 'default',
				perElementMotion: {
					hoverGlow: checked('te-motionHoverGlow'),
					rainbowShimmer: checked('te-motionRainbowShimmer'),
					pageTransition: checked('te-motionPageTransition'),
					achievementPulse: checked('te-motionAchievementPulse'),
				},
				noiseEnabled: checked('te-noiseEnabled'),
				noiseIntensity: intVal('te-noiseIntensity', 5),
				vignetteEnabled: checked('te-vignetteEnabled'),
				vignetteIntensity: intVal('te-vignetteIntensity', 30),
				bgPatternSize: intVal('te-bgPatternSize', 20),
				bgPatternOpacity: intVal('te-bgPatternOpacity', 5),
				startAnim: {
					enabled: el('te-sa-enabled') ? el('te-sa-enabled').checked : true,
					preset: el('te-sa-preset') ? el('te-sa-preset').value : 'default',
					bgColor: el('te-sa-bgColor') ? el('te-sa-bgColor').value : 'theme',
					fgColor: el('te-sa-fgColor') ? el('te-sa-fgColor').value : 'theme',
					customBg: el('te-sa-customBg') ? el('te-sa-customBg').value : '#0e0e0e',
					customFg: el('te-sa-customFg') ? el('te-sa-customFg').value : '#dcdcdc',
					wakeText: el('te-sa-wakeText') ? el('te-sa-wakeText').value : 'click/tap to wake up...',
					speed: el('te-sa-speed') ? el('te-sa-speed').value : 'normal',
					skipOnReturn: el('te-sa-skipOnReturn') ? el('te-sa-skipOnReturn').checked : false,
					customCode: el('te-sa-customCode') ? el('te-sa-customCode').value : '',
					customCodeApproved: _lastCustomCodeApproved,
				},
			},
		};
	}

	function writeEditor(preset) {
		const v = preset.vars || {};
		const s = preset.settings || {};
		const ex = preset.extra || {};

		const colorMap = {
			'te-bgColor': v.bgColor,
			'te-textColor': v.textColor,
			'te-panelBg': v.panelBg,
			'te-overlayBg': v.overlayBg,
			'te-borderColor': v.borderColor,
			'te-buttonBg': v.buttonBg,
			'te-accentColor': v.accentColor,
			'te-pointsColor': v.pointsColor,
			'te-achievementBg': v.achievementBg,
			'te-achievementBorder': v.achievementBorder,
		};
		for (const [id, val] of Object.entries(colorMap)) {
			if (el(id) && val) el(id).value = val;
		}

		if (el('te-radius')) {
			el('te-radius').value = s.radius ?? 2;
			el('te-radiusVal').textContent = s.radius ?? 2;
		}
		if (el('te-borderWidth')) {
			el('te-borderWidth').value = s.borderWidth ?? 1;
			el('te-borderWidthVal').textContent = s.borderWidth ?? 1;
		}
		if (el('te-textSize')) {
			el('te-textSize').value = s.textSize ?? 16;
			el('te-textSizeVal').textContent = s.textSize ?? 16;
		}
		if (el('te-font')) el('te-font').value = s.font || 'default';
		if (el('te-inventoryStyle')) el('te-inventoryStyle').value = s.inventoryStyle || 'compact';
		if (el('te-spinnerStyle')) el('te-spinnerStyle').value = s.spinnerStyle || 'slot';
		if (el('te-rollBtnSize')) el('te-rollBtnSize').value = s.rollBtnSize || 'normal';
		if (el('te-customRollText')) el('te-customRollText').value = s.customRollText || '';
		if (el('te-bgPattern')) el('te-bgPattern').value = s.bgPattern || 'none';
		if (el('te-season')) el('te-season').value = s.season || 'none';
		if (el('te-particleDensity')) el('te-particleDensity').value = s.particleDensity || 'medium';
		if (el('te-glowEnabled')) el('te-glowEnabled').checked = !!s.glowEnabled;
		if (el('te-glowColor')) el('te-glowColor').value = s.glowColor || '#dcdcdc';
		if (el('te-glowCount')) {
			el('te-glowCount').value = s.glowCount ?? 3;
			el('te-glowCountVal').textContent = s.glowCount ?? 3;
		}
		if (el('te-glowSize')) {
			el('te-glowSize').value = s.glowSize ?? 300;
			el('te-glowSizeVal').textContent = s.glowSize ?? 300;
		}
		if (el('te-glowOpacity')) {
			el('te-glowOpacity').value = s.glowOpacity ?? 20;
			el('te-glowOpacityVal').textContent = s.glowOpacity ?? 20;
		}
		if (el('te-glowSpeed')) {
			el('te-glowSpeed').value = s.glowSpeed ?? 20;
			el('te-glowSpeedVal').textContent = s.glowSpeed ?? 20;
		}
		if (el('te-bgType')) el('te-bgType').value = s.bgType || 'color';
		if (el('te-bgGradientFrom')) el('te-bgGradientFrom').value = s.bgGradientFrom || '#0e0e0e';
		if (el('te-bgGradientTo')) el('te-bgGradientTo').value = s.bgGradientTo || '#1a1a2e';
		if (el('te-bgGradientAngle')) {
			el('te-bgGradientAngle').value = s.bgGradientAngle ?? 135;
			el('te-bgGradientAngleVal').textContent = s.bgGradientAngle ?? 135;
		}
		if (el('te-bgGradientType')) el('te-bgGradientType').value = s.bgGradientType || 'linear';
		syncBgTypeUI();

		const checks = {
			'te-compactMode': s.compactMode,
			'te-hideCursor': s.hideCursor,
			'te-hideLuckBreakdown': s.hideLuckBreakdown,
			'te-reduceMotion': s.reduceMotion,
			'te-highContrast': s.highContrast,
			'te-largeTargets': s.largeTargets,
			'te-rgbBg': s.rgb,
			'te-wackyText': s.wacky,
			'te-chaosMode': s.chaos,
		};
		const colorModeMap = s.colorMode || {};
		['bgColor', 'panelBg', 'buttonBg', 'achievementBg'].forEach((key) => {
			if (el('te-colorMode-' + key)) el('te-colorMode-' + key).value = colorModeMap[key] || 'solid';
			const g = (s.gradientOverrides && s.gradientOverrides[key]) || {};
			if (el('te-gradFrom-' + key)) el('te-gradFrom-' + key).value = g.from || v[key] || '#0e0e0e';
			if (el('te-gradTo-' + key)) el('te-gradTo-' + key).value = g.to || '#1a1a2e';
			if (el('te-gradAngle-' + key)) {
				el('te-gradAngle-' + key).value = g.angle ?? 135;
				el('te-gradAngleVal-' + key).textContent = g.angle ?? 135;
			}
		});
		syncAllColorModeUI();
		for (const [id, val] of Object.entries(checks)) {
			if (el(id)) el(id).checked = !!val;
		}
		if (el('te-iconPack')) el('te-iconPack').value = s.iconPack || 'default';
		if (el('te-potionPack')) el('te-potionPack').value = s.potionPack || 'default';
		const iconOv = s.iconOverrides || {};
		[
			'notifBell',
			'friendsBtn',
			'messagesBtn',
			'wellVisual',
			'seasonWinter',
			'seasonSpring',
			'seasonSummer',
			'seasonFall',
		].forEach((k) => {
			if (el('te-icon-' + k)) el('te-icon-' + k).value = iconOv[k] || '';
		});

		if (el('te-confettiThreshold')) el('te-confettiThreshold').value = s.confettiThreshold ?? 0;
		if (el('te-rareThreshold')) el('te-rareThreshold').value = s.rareThreshold ?? 1000;
		if (el('te-cutsceneThreshold')) el('te-cutsceneThreshold').value = s.cutsceneThreshold ?? 0;
		if (el('te-blurPanels')) el('te-blurPanels').checked = !!(s.blurPanels || ex.blurPanels);
		if (el('te-blurIntensity')) {
			el('te-blurIntensity').value = s.blurIntensity ?? 10;
			el('te-blurIntensityVal').textContent = s.blurIntensity ?? 10;
		}
		if (el('te-blurSaturate')) {
			el('te-blurSaturate').value = s.blurSaturate ?? 140;
			el('te-blurSaturateVal').textContent = s.blurSaturate ?? 140;
		}
		syncGlowUI();
		if (el('te-blurPanelOpacity')) {
			el('te-blurPanelOpacity').value = s.blurPanelOpacity ?? 55;
			el('te-blurPanelOpacityVal').textContent = s.blurPanelOpacity ?? 55;
		}
		if (el('te-sa-enabled')) el('te-sa-enabled').checked = s.startAnim?.enabled ?? true;
		if (el('te-sa-preset')) el('te-sa-preset').value = s.startAnim?.preset ?? 'default';
		if (el('te-sa-bgColor')) el('te-sa-bgColor').value = s.startAnim?.bgColor ?? 'theme';
		if (el('te-sa-fgColor')) el('te-sa-fgColor').value = s.startAnim?.fgColor ?? 'theme';
		if (el('te-sa-customBg')) el('te-sa-customBg').value = s.startAnim?.customBg ?? '#0e0e0e';
		if (el('te-sa-customFg')) el('te-sa-customFg').value = s.startAnim?.customFg ?? '#dcdcdc';
		if (el('te-sa-wakeText'))
			el('te-sa-wakeText').value = s.startAnim?.wakeText ?? 'click/tap to wake up...';
		if (el('te-sa-speed')) el('te-sa-speed').value = s.startAnim?.speed ?? 'normal';
		if (el('te-sa-skipOnReturn'))
			el('te-sa-skipOnReturn').checked = s.startAnim?.skipOnReturn ?? false;
		if (el('te-sa-customCode')) el('te-sa-customCode').value = s.startAnim?.customCode ?? '';
		_lastCustomCodeApproved = !!s.startAnim?.customCodeApproved;
		syncStartAnimUI();
		if (el('te-blurBorderOpacity')) {
			el('te-blurBorderOpacity').value = s.blurBorderOpacity ?? 8;
			el('te-blurBorderOpacityVal').textContent = s.blurBorderOpacity ?? 8;
		}
		if (el('te-gauntletEasy') && v.gauntletEasy) el('te-gauntletEasy').value = v.gauntletEasy;
		if (el('te-gauntletMedium') && v.gauntletMedium)
			el('te-gauntletMedium').value = v.gauntletMedium;
		if (el('te-gauntletHard') && v.gauntletHard) el('te-gauntletHard').value = v.gauntletHard;
		if (el('te-gauntletInsane') && v.gauntletInsane)
			el('te-gauntletInsane').value = v.gauntletInsane;
		if (el('te-gauntletGodlike') && v.gauntletGodlike)
			el('te-gauntletGodlike').value = v.gauntletGodlike;
		if (el('te-wellResultAmount') && v.wellResultAmount)
			el('te-wellResultAmount').value = v.wellResultAmount;
		if (el('te-notifBadge') && v.notifBadge) el('te-notifBadge').value = v.notifBadge;

		if (el('te-spacingScale')) {
			el('te-spacingScale').value = s.spacingScale ?? 1;
			el('te-spacingScaleVal').textContent = (s.spacingScale ?? 1).toFixed(2);
		}
		if (el('te-headerScale')) {
			el('te-headerScale').value = s.headerScale ?? 1;
			el('te-headerScaleVal').textContent = (s.headerScale ?? 1).toFixed(2);
		}
		if (el('te-bodyScale')) {
			el('te-bodyScale').value = s.bodyScale ?? 1;
			el('te-bodyScaleVal').textContent = (s.bodyScale ?? 1).toFixed(2);
		}
		if (el('te-headerLetterSpacing')) {
			el('te-headerLetterSpacing').value = s.headerLetterSpacing ?? 0.06;
			el('te-headerLetterSpacingVal').textContent = (s.headerLetterSpacing ?? 0.06).toFixed(2);
		}
		if (el('te-headerWeight')) el('te-headerWeight').value = s.headerWeight ?? 400;
		if (el('te-headerCase')) el('te-headerCase').value = s.headerCase || 'none';
		if (el('te-buttonCase')) el('te-buttonCase').value = s.buttonCase || 'lowercase';

		if (el('te-radiusIndependent')) el('te-radiusIndependent').checked = !!s.radiusIndependent;
		if (el('te-radiusTopLeft')) {
			el('te-radiusTopLeft').value = s.radiusTopLeft ?? 2;
			el('te-radiusTopLeftVal').textContent = s.radiusTopLeft ?? 2;
		}
		if (el('te-radiusTopRight')) {
			el('te-radiusTopRight').value = s.radiusTopRight ?? 2;
			el('te-radiusTopRightVal').textContent = s.radiusTopRight ?? 2;
		}
		if (el('te-radiusBottomLeft')) {
			el('te-radiusBottomLeft').value = s.radiusBottomLeft ?? 2;
			el('te-radiusBottomLeftVal').textContent = s.radiusBottomLeft ?? 2;
		}
		if (el('te-radiusBottomRight')) {
			el('te-radiusBottomRight').value = s.radiusBottomRight ?? 2;
			el('te-radiusBottomRightVal').textContent = s.radiusBottomRight ?? 2;
		}
		if (el('te-buttonRadius')) {
			el('te-buttonRadius').value = s.buttonRadius ?? 2;
			el('te-buttonRadiusVal').textContent = s.buttonRadius ?? 2;
		}
		if (el('te-rollBtnRadius')) {
			el('te-rollBtnRadius').value = s.rollBtnRadius ?? 2;
			el('te-rollBtnRadiusVal').textContent = s.rollBtnRadius ?? 2;
		}
		if (el('te-borderStyle')) el('te-borderStyle').value = s.borderStyle || 'solid';
		if (el('te-shadowDepth')) {
			el('te-shadowDepth').value = s.shadowDepth ?? 0;
			el('te-shadowDepthVal').textContent = s.shadowDepth ?? 0;
		}
		if (el('te-easing')) el('te-easing').value = s.easing || 'default';

		const motion = s.perElementMotion || {};
		if (el('te-motionHoverGlow')) el('te-motionHoverGlow').checked = motion.hoverGlow ?? true;
		if (el('te-motionRainbowShimmer'))
			el('te-motionRainbowShimmer').checked = motion.rainbowShimmer ?? true;
		if (el('te-motionPageTransition'))
			el('te-motionPageTransition').checked = motion.pageTransition ?? true;
		if (el('te-motionAchievementPulse'))
			el('te-motionAchievementPulse').checked = motion.achievementPulse ?? true;

		if (el('te-noiseEnabled')) el('te-noiseEnabled').checked = !!s.noiseEnabled;
		if (el('te-noiseIntensity')) {
			el('te-noiseIntensity').value = s.noiseIntensity ?? 5;
			el('te-noiseIntensityVal').textContent = s.noiseIntensity ?? 5;
		}
		if (el('te-vignetteEnabled')) el('te-vignetteEnabled').checked = !!s.vignetteEnabled;
		if (el('te-vignetteIntensity')) {
			el('te-vignetteIntensity').value = s.vignetteIntensity ?? 30;
			el('te-vignetteIntensityVal').textContent = s.vignetteIntensity ?? 30;
		}
		if (el('te-bgPatternSize')) {
			el('te-bgPatternSize').value = s.bgPatternSize ?? 20;
			el('te-bgPatternSizeVal').textContent = s.bgPatternSize ?? 20;
		}
		if (el('te-bgPatternOpacity')) {
			el('te-bgPatternOpacity').value = s.bgPatternOpacity ?? 5;
			el('te-bgPatternOpacityVal').textContent = s.bgPatternOpacity ?? 5;
		}

		syncRadiusIndependentUI();
		updateContrastBadges();
	}

	function resolveColorVar(key, vars, settings) {
		const mode = settings.colorMode && settings.colorMode[key];
		if (mode === 'gradient' && settings.gradientOverrides && settings.gradientOverrides[key]) {
			const g = settings.gradientOverrides[key];
			return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
		}
		return vars[key];
	}

	function syncRadiusIndependentUI() {
		const enabled = el('te-radiusIndependent')?.checked;
		const controls = el('te-independentRadiusControls');
		if (controls) controls.style.display = enabled ? 'block' : 'none';
	}

	function applyCSSVars(vars, borderWidth, settings) {
		const root = document.documentElement;
		const bw = (borderWidth ?? 1) + 'px';

		const flatMap = {
			'--text-color': vars.textColor,
			'--overlay-bg': vars.overlayBg,
			'--border-color': vars.borderColor,
			'--button-text': vars.textColor,
			'--input-bg': vars.buttonBg,
			'--link-border': vars.borderColor,
			'--accent-color': vars.accentColor,
			'--achievement-border': vars.achievementBorder,
			'--gauntlet-easy': vars.gauntletEasy,
			'--gauntlet-medium': vars.gauntletMedium,
			'--gauntlet-hard': vars.gauntletHard,
			'--gauntlet-insane': vars.gauntletInsane,
			'--gauntlet-godlike': vars.gauntletGodlike,
			'--gauntlet-inferno': vars.gauntletInferno,
			'--gauntlet-void': vars.gauntletVoid,
			'--gauntlet-abyss': vars.gauntletAbyss,
			'--gauntlet-eclipse': vars.gauntletEclipseGate,
			'--well-result-amount': vars.wellResultAmount,
			'--notif-badge': vars.notifBadge,
			'--active-potion-timer': vars.activePotionTimer,
		};
		for (const [k, v] of Object.entries(flatMap)) {
			if (v) root.style.setProperty(k, v);
		}

		if (settings) {
			const bgImg = resolveColorVar('bgColor', vars, settings);
			const panelImg = resolveColorVar('panelBg', vars, settings);
			const buttonImg = resolveColorVar('buttonBg', vars, settings);
			const achImg = resolveColorVar('achievementBg', vars, settings);

			root.style.setProperty('--bg-color', bgImg);
			root.style.setProperty('--panel-bg', panelImg);
			root.style.setProperty('--button-bg', buttonImg);
			root.style.setProperty('--button-hover', buttonImg);
			root.style.setProperty('--achievement-bg', achImg);
		} else {
			if (vars.bgColor) root.style.setProperty('--bg-color', vars.bgColor);
			if (vars.panelBg) root.style.setProperty('--panel-bg', vars.panelBg);
			if (vars.buttonBg) {
				root.style.setProperty('--button-bg', vars.buttonBg);
				root.style.setProperty('--button-hover', vars.buttonBg);
			}
			if (vars.achievementBg) root.style.setProperty('--achievement-bg', vars.achievementBg);
		}

		if (vars.pointsColor) root.style.setProperty('--points-color', vars.pointsColor);

		document
			.querySelectorAll(
				'button, .shop-item, #inventoryList, .page-dots, #notifPanel, .well-container'
			)
			.forEach((n) => {
				n.style.borderWidth = bw;
			});

		if (vars.panelBg) {
			const rgb = hexToRgb(vars.panelBg);
			if (rgb) root.style.setProperty('--panel-bg-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
		}

		if (settings) {
			root.style.setProperty('--blur-intensity', (settings.blurIntensity ?? 10) + 'px');
			root.style.setProperty('--blur-saturate', (settings.blurSaturate ?? 140) + '%');
			root.style.setProperty(
				'--blur-panel-opacity',
				((settings.blurPanelOpacity ?? 55) / 100).toFixed(2)
			);
			root.style.setProperty(
				'--blur-border-opacity',
				((settings.blurBorderOpacity ?? 8) / 100).toFixed(2)
			);

			root.style.setProperty('--border-style', settings.borderStyle || 'solid');
			root.style.setProperty('--shadow-depth', shadowDepthToCss(settings.shadowDepth ?? 0));

			root.style.setProperty('--spacing-scale', settings.spacingScale ?? 1);
			root.style.setProperty('--header-scale', settings.headerScale ?? 1);
			root.style.setProperty('--body-scale', settings.bodyScale ?? 1);
			root.style.setProperty('--small-scale', settings.smallScale ?? 1);
			root.style.setProperty('--roll-btn-text-scale', settings.rollBtnTextScale ?? 1);
			root.style.setProperty(
				'--header-letter-spacing',
				(settings.headerLetterSpacing ?? 0.06) + 'em'
			);
			root.style.setProperty('--header-weight', settings.headerWeight ?? 400);
			root.style.setProperty('--header-case', settings.headerCase || 'none');
			root.style.setProperty('--button-case', settings.buttonCase || 'lowercase');

			root.style.setProperty('--ease-curve', easingToCss(settings.easing));

			if (settings.radiusIndependent) {
				root.style.setProperty(
					'--radius-tl',
					(settings.radiusTopLeft ?? settings.radius ?? 2) + 'px'
				);
				root.style.setProperty(
					'--radius-tr',
					(settings.radiusTopRight ?? settings.radius ?? 2) + 'px'
				);
				root.style.setProperty(
					'--radius-bl',
					(settings.radiusBottomLeft ?? settings.radius ?? 2) + 'px'
				);
				root.style.setProperty(
					'--radius-br',
					(settings.radiusBottomRight ?? settings.radius ?? 2) + 'px'
				);
			} else {
				const r = (settings.radius ?? 2) + 'px';
				root.style.setProperty('--radius-tl', r);
				root.style.setProperty('--radius-tr', r);
				root.style.setProperty('--radius-bl', r);
				root.style.setProperty('--radius-br', r);
			}
			root.style.setProperty(
				'--button-radius',
				(settings.buttonRadius ?? settings.radius ?? 2) + 'px'
			);
			root.style.setProperty(
				'--roll-btn-radius',
				(settings.rollBtnRadius ?? settings.radius ?? 2) + 'px'
			);

			applyNoiseOverlay(settings);
			applyVignetteOverlay(settings);
			applyPatternSettings(settings, vars.bgColor);
			applyBgStyle(settings, vars.bgColor);

			if (settings.font === 'custom') {
				applyCustomFont('custom');
			} else {
				root.style.removeProperty('--font-body');
			}
			if (settings && window.applyIconSettings) {
				window.applyIconSettings(settings);
			}
		}
	}

	function shadowDepthToCss(depth) {
		const d = Math.max(0, Math.min(10, depth));
		if (d === 0) return 'none';
		return `0 ${d * 0.6}px ${d * 1.8}px rgb(0 0 0 / ${Math.min(0.5, d * 0.05)})`;
	}

	function easingToCss(name) {
		const map = {
			default: 'cubic-bezier(0.4, 0, 0.2, 1)',
			linear: 'linear',
			ease: 'ease',
			bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			snap: 'cubic-bezier(0.9, 0, 0.1, 1)',
		};
		return map[name] || map.default;
	}

	async function applyBgStyle(settings, fallbackColor) {
		const type = settings.bgType || 'color';
		const body = document.body;
		body.style.backgroundImage = '';
		body.style.backgroundSize = '';
		body.style.backgroundPosition = '';
		body.style.backgroundRepeat = '';
		body.style.backgroundAttachment = '';

		if (type === 'gradient') {
			const from = settings.bgGradientFrom || fallbackColor || '#0e0e0e';
			const to = settings.bgGradientTo || '#1a1a2e';
			const angle = settings.bgGradientAngle ?? 135;
			const gtype = settings.bgGradientType || 'linear';
			if (gtype === 'radial') {
				body.style.backgroundImage = `radial-gradient(ellipse at center, ${from}, ${to})`;
			} else {
				body.style.backgroundImage = `linear-gradient(${angle}deg, ${from}, ${to})`;
			}
		} else if (type === 'image') {
			try {
				const blob = await idbGet('bg-image');
				if (blob) {
					const url = URL.createObjectURL(blob);
					body.style.backgroundImage = `url(${url})`;
					body.style.backgroundSize = 'cover';
					body.style.backgroundPosition = 'center';
					body.style.backgroundRepeat = 'no-repeat';
					body.style.backgroundAttachment = 'fixed';
				}
			} catch (_) {}
		}
	}

	function applyPatternSettings(settings, fallbackColor) {
		const root = document.documentElement;
		const size = settings.bgPatternSize ?? 20;
		root.style.setProperty('--bg-pattern-size', size + 'px');
		root.style.setProperty('--bg-pattern-size2', size + 'px');
		root.style.setProperty(
			'--bg-pattern-opacity',
			((settings.bgPatternOpacity ?? 5) / 100).toFixed(3)
		);
		const color =
			settings.bgPatternColor === 'auto' || !settings.bgPatternColor
				? fallbackColor || '#dcdcdc'
				: settings.bgPatternColor;
		const rgb = hexToRgb(color);
		if (rgb) root.style.setProperty('--bg-pattern-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
	}

	function applyNoiseOverlay(settings) {
		let el = document.getElementById('noiseOverlay');
		if (!settings.noiseEnabled) {
			if (el) el.remove();
			return;
		}
		if (!el) {
			el = document.createElement('div');
			el.id = 'noiseOverlay';
			document.body.appendChild(el);
		}
		el.style.opacity = ((settings.noiseIntensity ?? 5) / 100).toFixed(3);
	}

	function applyVignetteOverlay(settings) {
		let el = document.getElementById('vignetteOverlay');
		if (!settings.vignetteEnabled) {
			if (el) el.remove();
			return;
		}
		if (!el) {
			el = document.createElement('div');
			el.id = 'vignetteOverlay';
			document.body.appendChild(el);
		}
		el.style.setProperty(
			'--vignette-intensity',
			((settings.vignetteIntensity ?? 30) / 100).toFixed(3)
		);
	}

	function buildSettingsPatch(editorData) {
		const s = editorData.settings;
		const v = editorData.vars;
		return {
			theme: 'custom',
			customHex: v.bgColor,
			customTextHex: v.textColor,
			textSize: s.textSize,
			font: s.font,
			inventoryStyle: s.inventoryStyle,
			spinnerStyle: s.spinnerStyle,
			rollBtnSize: s.rollBtnSize,
			customRollText: s.customRollText,
			bgPattern: s.bgPattern,
			season: s.season,
			particleDensity: s.particleDensity,
			blurPanels: s.blurPanels,
			blurIntensity: s.blurIntensity,
			blurSaturate: s.blurSaturate,
			blurPanelOpacity: s.blurPanelOpacity,
			blurBorderOpacity: s.blurBorderOpacity,
			compactMode: s.compactMode,
			hideCursor: s.hideCursor,
			hideLuckBreakdown: s.hideLuckBreakdown,
			reduceMotion: s.reduceMotion,
			highContrast: s.highContrast,
			largeTargets: s.largeTargets,
			rgb: s.rgb,
			wacky: s.wacky,
			chaos: s.chaos,
			accentColor: v.accentColor,
			confettiThreshold: s.confettiThreshold,
			rareThreshold: s.rareThreshold,
			cutsceneThreshold: s.cutsceneThreshold,
			bgType: s.bgType,
			bgGradientFrom: s.bgGradientFrom,
			bgGradientTo: s.bgGradientTo,
			bgGradientAngle: s.bgGradientAngle,
			bgGradientType: s.bgGradientType,
			glowEnabled: s.glowEnabled,
			glowColor: s.glowColor,
			glowCount: s.glowCount,
			glowSize: s.glowSize,
			glowOpacity: s.glowOpacity,
			glowSpeed: s.glowSpeed,
		};
	}

	function applyAndSave(editorData, presetName) {
		const v = editorData.vars;
		const s = editorData.settings;

		applyCSSVars(v, s.borderWidth, s);

		const patch = buildSettingsPatch(editorData);
		if (window.applySettings) {
			window.applySettings(patch);
		}

		try {
			localStorage.setItem(
				ACTIVE_KEY,
				JSON.stringify({ name: presetName || 'custom', editorData })
			);
		} catch (_) {}

		if (editorData.settings.startAnim) {
			try {
				localStorage.setItem('startAnimConfig', JSON.stringify(editorData.settings.startAnim));
			} catch (_) {}
		}

		const label = el('activeThemeName');
		if (label) label.textContent = 'current: ' + (presetName || 'custom');
		const edLabel = el('themeEditorActiveLabel');
		if (edLabel) edLabel.textContent = presetName || 'custom';
	}

	function syncStartAnimUI() {
		const enabled = el('te-sa-enabled')?.checked;
		const preset = el('te-sa-preset')?.value;
		const bgMode = el('te-sa-bgColor')?.value;
		const fgMode = el('te-sa-fgColor')?.value;
		const controls = el('te-sa-controls');
		const customBgRow = el('te-sa-customBg-row');
		const customFgRow = el('te-sa-customFg-row');

		if (controls) controls.style.opacity = enabled ? '1' : '0.35';
		if (controls) controls.style.pointerEvents = enabled ? '' : 'none';
		if (customBgRow) customBgRow.style.display = bgMode === 'custom' ? 'block' : 'none';
		if (customFgRow) customFgRow.style.display = fgMode === 'custom' ? 'block' : 'none';

		const presetDesc = el('te-sa-preset-desc');
		if (presetDesc) {
			const DESCS = {
				none: 'no animation > game loads instantly.',
				default: 'a line expands horizontally then vertically and fades out.',
				fade: 'plain fullscreen fade. click to dismiss.',
				glitch: 'title text with rgb glitch effect.',
				scan: 'scanline sweeps the screen with a "system ready" label.',
				typewriter: 'title types out character by character.',
				curtain: 'two panels wipe away from center.',
				pixelate: 'screen fills with random tiles.',
				ripple: 'concentric rings burst outward on click.',
				custom: 'write your own animation! receives container, bg, fg, wakeText, speedMs, dismiss.',
			};
			presetDesc.textContent = DESCS[preset] || '';
			const customRow = el('te-sa-customCode-row');
			if (customRow) customRow.style.display = preset === 'custom' ? 'block' : 'none';
		}
	}

	function previewStartAnim() {
		document.querySelector('.sa-container')?.remove();
		document.getElementById('startanim-style')?.remove();

		if (!el('te-sa-enabled')?.checked) {
			showStartAnimError('animation is disabled — nothing to preview.');
			return;
		}
		const preset = el('te-sa-preset')?.value;
		if (!preset || preset === 'none') {
			showStartAnimError('preset is set to "none" — nothing to preview.');
			return;
		}
		if (!window._saRunPreview) {
			showStartAnimError('startanim.js not ready.');
			return;
		}

		const d = readEditor();
		const cfg = d.settings.startAnim;
		const bg = cfg.bgColor === 'theme' ? d.vars.bgColor : cfg.customBg;
		const fg = cfg.fgColor === 'theme' ? d.vars.textColor : cfg.customFg;

		el('themeEditorOverlay').style.display = 'none';

		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			document.removeEventListener('keydown', escHandler);
			setTimeout(() => {
				el('themeEditorOverlay').style.display = 'block';
			}, 200);
		};

		const escHandler = (e) => {
			if (e.key !== 'Escape') return;
			document.querySelector('.sa-container')?.remove();
			document.getElementById('startanim-style')?.remove();
			finish();
		};

		window._saRunPreview(cfg, bg, fg, finish);
		document.addEventListener('keydown', escHandler);
	}

	function showStartAnimError(msg) {
		const existing = el('te-sa-error');
		if (existing) existing.remove();

		const err = document.createElement('div');
		err.id = 'te-sa-error';
		Object.assign(err.style, {
			marginTop: '8px',
			padding: '8px 10px',
			background: 'rgba(180,40,40,0.15)',
			border: '1px solid rgba(200,60,60,0.4)',
			borderRadius: '3px',
			fontSize: '0.8em',
			color: '#e08080',
			fontFamily: 'monospace',
		});
		err.textContent = msg;

		const btn = el('te-sa-preview-btn');
		btn?.parentNode?.insertBefore(err, btn.nextSibling);
		setTimeout(() => err.remove(), 4000);
	}

	function livePreview() {
		const d = readEditor();
		applyCSSVars(d.vars, d.settings.borderWidth, d.settings);
	}

	function autoAdaptFromBackground() {
		const bgHex = el('te-bgColor').value;
		const rgb = hexToRgb(bgHex);
		if (!rgb) return;

		// Perceived luminance (0–255)
		const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
		const isDark = lum < 128;

		// Lighten or darken the bg by a fixed offset to derive panel/overlay colors
		function shiftHex(r, g, b, amount) {
			const clamp = (v) => Math.min(255, Math.max(0, v));
			return (
				'#' +
				clamp(r + amount)
					.toString(16)
					.padStart(2, '0') +
				clamp(g + amount)
					.toString(16)
					.padStart(2, '0') +
				clamp(b + amount)
					.toString(16)
					.padStart(2, '0')
			);
		}

		const shift = isDark ? 12 : -12;

		if (el('te-textColor')) el('te-textColor').value = isDark ? '#dcdcdc' : '#1a1a1a';
		if (el('te-panelBg')) el('te-panelBg').value = shiftHex(rgb.r, rgb.g, rgb.b, shift);
		if (el('te-overlayBg'))
			el('te-overlayBg').value = shiftHex(rgb.r, rgb.g, rgb.b, isDark ? -4 : 4);
		if (el('te-borderColor')) el('te-borderColor').value = shiftHex(rgb.r, rgb.g, rgb.b, shift * 2);
		if (el('te-buttonBg')) el('te-buttonBg').value = shiftHex(rgb.r, rgb.g, rgb.b, shift * 1.5);
		if (el('te-accentColor')) el('te-accentColor').value = isDark ? '#dcdcdc' : '#1a1a1a';
		if (el('te-achievementBg'))
			el('te-achievementBg').value = shiftHex(rgb.r, Math.min(255, rgb.g + 20), rgb.b, shift);
		if (el('te-achievementBorder'))
			el('te-achievementBorder').value = shiftHex(
				rgb.r,
				Math.min(255, rgb.g + 40),
				rgb.b,
				shift * 2
			);

		livePreview();
		updateContrastBadges();
	}

	function bindEditorInputs() {
		const ids = [
			'te-bgColor',
			'te-textColor',
			'te-panelBg',
			'te-overlayBg',
			'te-borderColor',
			'te-buttonBg',
			'te-accentColor',
			'te-pointsColor',
			'te-achievementBg',
			'te-achievementBorder',
			'te-gauntletEasy',
			'te-gauntletMedium',
			'te-gauntletHard',
			'te-gauntletInsane',
			'te-gauntletGodlike',
			'te-wellResultAmount',
			'te-notifBadge',
			'te-radius',
			'te-radiusIndependent',
			'te-radiusTopLeft',
			'te-radiusTopRight',
			'te-radiusBottomLeft',
			'te-radiusBottomRight',
			'te-buttonRadius',
			'te-rollBtnRadius',
			'te-borderWidth',
			'te-borderStyle',
			'te-shadowDepth',
			'te-textSize',
			'te-font',
			'te-headerScale',
			'te-bodyScale',
			'te-headerLetterSpacing',
			'te-headerWeight',
			'te-headerCase',
			'te-buttonCase',
			'te-spacingScale',
			'te-easing',
			'te-motionHoverGlow',
			'te-motionRainbowShimmer',
			'te-motionPageTransition',
			'te-motionAchievementPulse',
			'te-noiseEnabled',
			'te-noiseIntensity',
			'te-vignetteEnabled',
			'te-vignetteIntensity',
			'te-bgPatternSize',
			'te-bgPatternOpacity',
			'te-inventoryStyle',
			'te-spinnerStyle',
			'te-rollBtnSize',
			'te-customRollText',
			'te-bgPattern',
			'te-season',
			'te-particleDensity',
			'te-blurPanels',
			'te-blurIntensity',
			'te-blurSaturate',
			'te-blurPanelOpacity',
			'te-blurBorderOpacity',
			'te-compactMode',
			'te-hideCursor',
			'te-hideLuckBreakdown',
			'te-reduceMotion',
			'te-highContrast',
			'te-largeTargets',
			'te-rgbBg',
			'te-wackyText',
			'te-chaosMode',
			'te-confettiThreshold',
			'te-rareThreshold',
			'te-cutsceneThreshold',
			'te-bgType',
			'te-bgGradientFrom',
			'te-bgGradientTo',
			'te-bgGradientAngle',
			'te-bgGradientType',
			'te-sa-enabled',
			'te-sa-preset',
			'te-sa-bgColor',
			'te-sa-fgColor',
			'te-sa-customBg',
			'te-sa-customFg',
			'te-sa-wakeText',
			'te-sa-speed',
			'te-sa-skipOnReturn',
			'te-sa-customCode',
			'te-glowEnabled',
			'te-glowColor',
			'te-glowCount',
			'te-glowSize',
			'te-glowOpacity',
			'te-glowSpeed',
			'te-colorMode-bgColor',
			'te-colorMode-panelBg',
			'te-colorMode-buttonBg',
			'te-colorMode-achievementBg',
			'te-gradFrom-bgColor',
			'te-gradTo-bgColor',
			'te-gradAngle-bgColor',
			'te-gradFrom-panelBg',
			'te-gradTo-panelBg',
			'te-gradAngle-panelBg',
			'te-gradFrom-buttonBg',
			'te-gradTo-buttonBg',
			'te-gradAngle-buttonBg',
			'te-gradFrom-achievementBg',
			'te-gradTo-achievementBg',
			'te-gradAngle-achievementBg',
			'te-iconPack',
			'te-potionPack',
			'te-icon-notifBell',
			'te-icon-friendsBtn',
			'te-icon-messagesBtn',
			'te-icon-wellVisual',
			'te-icon-seasonWinter',
			'te-icon-seasonSpring',
			'te-icon-seasonSummer',
			'te-icon-seasonFall',
		];
		ids.forEach((id) => {
			const n = el(id);
			if (!n) return;
			n.addEventListener('input', () => {
				if (id === 'te-radius') el('te-radiusVal').textContent = n.value;
				if (id === 'te-sa-customCode') _lastCustomCodeApproved = true;
				if (id.startsWith('te-sa-')) syncStartAnimUI();
				if (id === 'te-borderWidth') el('te-borderWidthVal').textContent = n.value;
				if (id === 'te-textSize') el('te-textSizeVal').textContent = n.value;
				if (id === 'te-blurIntensity') el('te-blurIntensityVal').textContent = n.value;
				if (id === 'te-blurSaturate') el('te-blurSaturateVal').textContent = n.value;
				if (id === 'te-blurPanelOpacity') el('te-blurPanelOpacityVal').textContent = n.value;
				if (id === 'te-blurBorderOpacity') el('te-blurBorderOpacityVal').textContent = n.value;
				if (id === 'te-bgGradientAngle') el('te-bgGradientAngleVal').textContent = n.value;
				if (id === 'te-glowCount') el('te-glowCountVal').textContent = n.value;
				if (id === 'te-glowSize') el('te-glowSizeVal').textContent = n.value;
				if (id === 'te-glowOpacity') el('te-glowOpacityVal').textContent = n.value;
				if (id === 'te-glowSpeed') el('te-glowSpeedVal').textContent = n.value;
				if (id === 'te-glowEnabled') syncGlowUI();
				if (id === 'te-radiusIndependent') syncRadiusIndependentUI();
				if (id === 'te-spacingScale')
					el('te-spacingScaleVal').textContent = parseFloat(n.value).toFixed(2);
				if (id === 'te-headerScale')
					el('te-headerScaleVal').textContent = parseFloat(n.value).toFixed(2);
				if (id === 'te-bodyScale')
					el('te-bodyScaleVal').textContent = parseFloat(n.value).toFixed(2);
				if (id === 'te-headerLetterSpacing')
					el('te-headerLetterSpacingVal').textContent = parseFloat(n.value).toFixed(2);
				if (id === 'te-radiusTopLeft') el('te-radiusTopLeftVal').textContent = n.value;
				if (id === 'te-radiusTopRight') el('te-radiusTopRightVal').textContent = n.value;
				if (id === 'te-radiusBottomLeft') el('te-radiusBottomLeftVal').textContent = n.value;
				if (id === 'te-radiusBottomRight') el('te-radiusBottomRightVal').textContent = n.value;
				if (id === 'te-buttonRadius') el('te-buttonRadiusVal').textContent = n.value;
				if (id === 'te-rollBtnRadius') el('te-rollBtnRadiusVal').textContent = n.value;
				if (id === 'te-shadowDepth') el('te-shadowDepthVal').textContent = n.value;
				if (id === 'te-noiseIntensity') el('te-noiseIntensityVal').textContent = n.value;
				if (id === 'te-vignetteIntensity') el('te-vignetteIntensityVal').textContent = n.value;
				if (id === 'te-bgPatternSize') el('te-bgPatternSizeVal').textContent = n.value;
				if (id === 'te-bgPatternOpacity') el('te-bgPatternOpacityVal').textContent = n.value;
				if (id === 'te-radiusIndependent') syncRadiusIndependentUI();
				if (id.endsWith('Color') || id.endsWith('Bg')) updateContrastBadges();
				if (id.startsWith('te-colorMode-')) syncColorModeUI(id.replace('te-colorMode-', ''));
				if (id.startsWith('te-gradAngle-')) {
					const key = id.replace('te-gradAngle-', '');
					const valEl = el('te-gradAngleVal-' + key);
					if (valEl) valEl.textContent = n.value;
				}
				livePreview();
				pushUndoSnapshotDebounced();
			});
			n.addEventListener('change', () => {
				livePreview();
				pushUndoSnapshot();
			});
		});

		const bgTypeEl = el('te-bgType');
		if (bgTypeEl) bgTypeEl.addEventListener('change', syncBgTypeUI);
	}

	function syncBgTypeUI() {
		const type = el('te-bgType') ? el('te-bgType').value : 'color';
		const gradientControls = el('te-gradientControls');
		const imageControls = el('te-imageControls');
		if (gradientControls) gradientControls.style.display = type === 'gradient' ? 'block' : 'none';
		if (imageControls) imageControls.style.display = type === 'image' ? 'block' : 'none';
	}

	function syncColorModeUI(key) {
		const select = el('te-colorMode-' + key);
		const gradientRow = el('te-gradientRow-' + key);
		if (!select || !gradientRow) return;
		gradientRow.style.display = select.value === 'gradient' ? 'block' : 'none';
	}

	function syncAllColorModeUI() {
		['bgColor', 'panelBg', 'buttonBg', 'achievementBg'].forEach(syncColorModeUI);
	}

	function syncGlowUI() {
		const enabled = el('te-glowEnabled')?.checked;
		const controls = el('te-glowControls');
		if (controls) controls.style.display = enabled ? 'block' : 'none';
	}

	async function refreshBgImagePreview() {
		const preview = el('te-bgImagePreview');
		const removeBtn = el('te-bgImageRemove');
		if (!preview) return;
		try {
			const blob = await idbGet('bg-image');
			if (blob) {
				const url = URL.createObjectURL(blob);
				preview.src = url;
				preview.style.display = 'block';
				if (removeBtn) removeBtn.style.display = 'inline-block';
			} else {
				preview.style.display = 'none';
				if (removeBtn) removeBtn.style.display = 'none';
			}
		} catch (_) {
			preview.style.display = 'none';
		}
	}

	function renderPresets() {
		const container = el('presetGrid');
		if (!container) return;

		const all = getAllPresets();
		const userPresets = getUserPresets();
		container.innerHTML = '';

		all.forEach((preset) => {
			const isBuiltIn = BUILT_IN_PRESETS.some((p) => p.name === preset.name);
			const btn = document.createElement('button');
			btn.textContent = preset.name;
			btn.addEventListener('click', () => {
				writeEditor(preset);
				livePreview();
				resetUndoStack();
			});

			if (!isBuiltIn) {
				const del = document.createElement('button');
				del.textContent = '✕';
				del.title = 'delete preset';
				del.addEventListener('click', (e) => {
					e.stopPropagation();
					const updated = userPresets.filter((p) => p.name !== preset.name);
					saveUserPresets(updated);
					renderPresets();
				});

				const wrap = document.createElement('div');
				wrap.appendChild(btn);
				wrap.appendChild(del);
				container.appendChild(wrap);
			} else {
				container.appendChild(btn);
			}
		});
	}

	function init() {
		const openBtn = el('openThemeEditorBtn');
		const overlay = el('themeEditorOverlay');
		const closeBtn = el('themeEditorClose');
		const applyBtn = el('te-apply');
		const undoBtn = el('te-undo');
		const discardBtn = el('te-discard');
		const savePresetBtn = el('saveThemeBtn');
		const importBtn = el('importThemeBtn');
		const exportBtn = el('exportThemeBtn');
		const autoAdaptBtn = el('te-autoAdapt');
		const previewAnimBtn = el('te-sa-preview-btn');
		if (previewAnimBtn) previewAnimBtn.addEventListener('click', previewStartAnim);
		if (autoAdaptBtn) autoAdaptBtn.addEventListener('click', autoAdaptFromBackground);

		syncGlowUI();
		syncAllColorModeUI();

		if (!openBtn || !overlay) return;

		let snapshotBeforeOpen = null;

		openBtn.addEventListener('click', () => {
			snapshotBeforeOpen = {
				style: document.documentElement.getAttribute('style') || '',
				bodyStyle: document.body.getAttribute('style') || '',
			};

			let activeData;
			try {
				activeData = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
			} catch (_) {
				activeData = null;
			}
			if (activeData && activeData.editorData) {
				writeEditor(activeData.editorData);
			} else {
				writeEditor(BUILT_IN_PRESETS[0]);
			}

			syncBgTypeUI();
			refreshBgImagePreview();

			renderPresets();
			resetUndoStack();
			overlay.style.display = 'block';
			document.body.style.overflow = 'hidden';
		});

		const fontUpload = el('te-fontUpload');
		if (fontUpload) {
			fontUpload.addEventListener('change', async () => {
				const file = fontUpload.files[0];
				if (!file) return;
				if (file.size > 5 * 1024 * 1024) {
					await window.showAlert('font too large (max 5MB)');
					return;
				}
				const buf = await file.arrayBuffer();
				await idbSetFont('custom', buf);
				if (el('te-customFontName')) el('te-customFontName').value = file.name;
				if (el('te-font')) el('te-font').value = 'custom';
				await applyCustomFont('custom');
				livePreview();
			});
		}

		function closeEditor() {
			overlay.style.display = 'none';
			document.body.style.overflow = '';
		}

		closeBtn.addEventListener('click', closeEditor);

		discardBtn.addEventListener('click', () => {
			if (snapshotBeforeOpen) {
				document.documentElement.setAttribute('style', snapshotBeforeOpen.style);
				document.body.setAttribute('style', snapshotBeforeOpen.bodyStyle);
			}
			if (window.applySettings && window.savedSettings) {
				window.applySettings(window.savedSettings);
			}
			closeEditor();
		});

		if (undoBtn) {
			undoBtn.addEventListener('click', () => {
				const prev = popUndoSnapshot();
				if (!prev) return;
				suppressUndoCapture = true;
				try {
					writeEditor(JSON.parse(prev));
					livePreview();
				} finally {
					suppressUndoCapture = false;
				}
				syncUndoButton();
			});
		}

		applyBtn.addEventListener('click', () => {
			const d = readEditor();
			applyAndSave(d, null);
			closeEditor();
		});

		savePresetBtn.addEventListener('click', async () => {
			const name = await window.showPrompt('preset name:');
			if (!name || !name.trim()) return;
			const trimmed = name.trim().toLowerCase();
			if (BUILT_IN_PRESETS.some((p) => p.name === trimmed)) {
				await window.showAlert('that name is reserved!');
				return;
			}
			const arr = getUserPresets().filter((p) => p.name !== trimmed);
			arr.push({ name: trimmed, __v: PRESET_SCHEMA_VERSION, ...readEditor() });
			saveUserPresets(arr);
			renderPresets();
		});

		exportBtn.addEventListener('click', () => {
			const d = readEditor();
			const json = JSON.stringify({ name: 'exported', ...d }, null, 2);
			navigator.clipboard
				.writeText(json)
				.then(() => window.showAlert('theme json copied!'))
				.catch(() => {
					const a = document.createElement('a');
					a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
					a.download = 'authsrng-theme.json';
					a.click();
				});
		});

		importBtn.addEventListener('click', async () => {
			const raw = await window.showPrompt('paste theme json:');
			if (!raw) return;
			try {
				const parsed = JSON.parse(raw.trim());
				if (!parsed.vars) {
					window.showAlert('invalid theme json');
					return;
				}
				// Generated code starts here on 2026-09-19T09:45:00Z:
				const migrated = migratePreset(parsed);
				const sa = migrated.settings?.startAnim;
				if (sa?.preset === 'custom' && sa?.customCode?.trim()) {
					const snippet = sa.customCode.slice(0, 150) + (sa.customCode.length > 150 ? '...' : '');
					const ok = await window.showConfirm(
						'WARNING: this imported theme contains a custom start animation script:\n\n' +
							snippet +
							'\n\ndo you trust and allow this custom script to run??',
						'warning: custom script'
					);
					if (ok) {
						migrated.settings.startAnim.customCodeApproved = true;
					} else {
						migrated.settings.startAnim.customCodeApproved = false;
					}
				}
				// Generated code ends here on 2026-09-19T09:45:00Z:
				writeEditor(migrated);
				livePreview();
				resetUndoStack();
			} catch (_) {
				window.showAlert('invalid json');
			}
		});

		bindEditorInputs();

		const bgUpload = el('te-bgImageUpload');
		if (bgUpload) {
			bgUpload.addEventListener('change', async () => {
				const file = bgUpload.files[0];
				if (!file) return;
				if (file.size > 10 * 1024 * 1024) {
					alert('image too large (max 10MB)');
					return;
				}
				await idbSet('bg-image', file);
				bgUpload.value = '';
				await refreshBgImagePreview();
				livePreview();
			});
		}

		const bgRemove = el('te-bgImageRemove');
		if (bgRemove) {
			bgRemove.addEventListener('click', async () => {
				await idbDel('bg-image');
				await refreshBgImagePreview();
				livePreview();
			});
		}

		let activeData;
		try {
			activeData = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
		} catch (_) {
			activeData = null;
		}
		if (activeData) {
			applyAndSave(activeData.editorData, activeData.name);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
