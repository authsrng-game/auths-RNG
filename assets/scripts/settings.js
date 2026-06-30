// settings.js
(function () {
	'use strict';

	// Generated code starts here on 2026-06-18T00:35:00Z:
	if (window.__settingsLoaded) return;
	window.__settingsLoaded = true;
	// Generated code ends here on 2026-06-18T00:35:00Z:

	console.log(performance.now());

	function el(id) {
		return document.getElementById(id);
	}

	// ── State ──────────────────────────────────────────────────────────────
	let particles = [];
	let particleInterval = null;
	let devInterval = null;
	let rgbInterval = null;
	let wackyInterval = null;
	let visibilitySeasonListenerAdded = false;

	// Discord-style pending changes
	let savedSettings = {};
	let hasPendingChanges = false;

	// Music guard::::: THE fix for the tidal wave bug. This was the reason why my ears genuinely ached after when I discovered the bug. Phenomenal. fuck
	// We only ever start/change audio when the key actually changes.
	let _activeMusicKey = null; // e.g. 'default', 'custom_1', or '__muted__'

	const musicLinks = {
		default: 'assets/audio/welcomecity.mp3',
		wavelocity: 'assets/audio/wavelocity.mp3',
		nocturne: 'assets/audio/nocturne.mp3',
		fallout: 'assets/audio/fallout.mp3',
	};

	// ── IndexedDB helpers ──────────────────────────────────────────────────
	// Tracks are stored as { id (auto), name, buffer (ArrayBuffer), type (MIME) }
	// The music select uses 'custom_{id}' where id is the IDB record key.

	function openMusicDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open('authsrng_music', 1);
			req.onupgradeneeded = (e) => {
				e.target.result.createObjectStore('tracks', {
					keyPath: 'id',
					autoIncrement: true,
				});
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
	}

	function parseID3(buffer) {
		const b = new Uint8Array(buffer);
		if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;
		const ver = b[3];
		const tagEnd =
			10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f));
		const tags = {};
		let off = 10;
		while (off + 10 <= tagEnd) {
			if (b[off] === 0) break;
			const id = String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]);
			off += 4;
			const sz =
				ver >= 4
					? ((b[off] & 0x7f) << 21) |
						((b[off + 1] & 0x7f) << 14) |
						((b[off + 2] & 0x7f) << 7) |
						(b[off + 3] & 0x7f)
					: (b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3];
			off += 6;
			if (sz <= 0 || off + sz > tagEnd) break;
			if (id[0] === 'T' && sz > 1) {
				const enc = b[off];
				const chunk = buffer.slice(off + 1, off + sz);
				let text = '';
				try {
					text = new TextDecoder(
						enc === 0 ? 'iso-8859-1' : enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : 'utf-8'
					)
						.decode(chunk)
						.replace(/\0/g, '')
						.trim();
				} catch (_) {}
				tags[id] = text;
			}
			off += sz;
		}
		const meta = {
			title: tags['TIT2'] || null,
			artist: tags['TPE1'] || null,
			album: tags['TALB'] || null,
			year: tags['TDRC'] || tags['TYER'] || null,
			genre: tags['TCON'] ? tags['TCON'].replace(/^\(\d+\)/, '').trim() || tags['TCON'] : null,
		};
		return Object.values(meta).some(Boolean) ? meta : null;
	}

	async function updateTrackName(id, newName) {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction('tracks', 'readwrite');
			const store = tx.objectStore('tracks');
			const req = store.get(id);
			req.onsuccess = () => {
				const put = store.put({ ...req.result, name: newName });
				put.onsuccess = () => resolve();
				put.onerror = () => reject(put.error);
			};
			req.onerror = () => reject(req.error);
		});
	}

	async function getAllTracks() {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('tracks', 'readonly').objectStore('tracks').getAll();
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function getAllTracksMeta() {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const results = [];
			const req = db.transaction('tracks', 'readonly').objectStore('tracks').openCursor();
			req.onsuccess = (e) => {
				const cursor = e.target.result;
				if (cursor) {
					const { id, name, type, size, meta } = cursor.value;
					results.push({ id, name, type, size, meta });
					cursor.continue();
				} else resolve(results);
			};
			req.onerror = () => reject(req.error);
		});
	}

	async function getTrack(id) {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('tracks', 'readonly').objectStore('tracks').get(id);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function addTrack(name, buffer, type, meta) {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const req = db
				.transaction('tracks', 'readwrite')
				.objectStore('tracks')
				.add({ name, buffer, type, size: buffer.byteLength, meta: meta || null });
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function deleteTrack(id) {
		const db = await openMusicDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('tracks', 'readwrite').objectStore('tracks').delete(id);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}

	// ── One-time migration from old base64 localStorage format ─────────────
	async function migrateFromLocalStorage() {
		const raw = localStorage.getItem('customMusic');
		if (!raw) return;
		let old;
		try {
			old = JSON.parse(raw);
		} catch (_) {
			return;
		}
		if (!Array.isArray(old) || old.length === 0) {
			localStorage.removeItem('customMusic');
			return;
		}
		console.log(`[music] migrating ${old.length} track(s) from localStorage → IndexedDB`);
		for (const track of old) {
			try {
				// old format: { name, data: 'data:<type>;base64,...' }
				const [meta, b64] = track.data.split(',');
				const type = meta.replace('data:', '').replace(';base64', '');
				const bin = atob(b64);
				const buf = new Uint8Array(bin.length);
				for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
				await addTrack(track.name, buf.buffer, type);
			} catch (e) {
				console.warn('[music] failed to migrate track:', track.name, e);
			}
		}
		localStorage.removeItem('customMusic');
		console.log('[music] migration complete, localStorage entry removed');
	}

	// ── Pending bar ────────────────────────────────────────────────────────
	function createPendingBar() {
		if (el('settingsPendingBar')) return;
		const bar = document.createElement('div');
		bar.id = 'settingsPendingBar';
		bar.innerHTML = `
      <span class="pending-label">careful — unsaved changes</span>
      <div class="pending-bar-actions">
        <button id="settingsDiscardBtn" class="small">reset</button>
        <button id="settingsSaveBtn" class="small">save changes</button>
      </div>
    `;
		document.body.appendChild(bar);
		el('settingsSaveBtn').addEventListener('click', () => saveChanges().catch(console.error));
		el('settingsDiscardBtn').addEventListener('click', discardChanges);
	}

	function showPendingBar() {
		const bar = el('settingsPendingBar');
		if (bar) {
			bar.classList.add('show');
			hasPendingChanges = true;
		}
	}

	function hidePendingBar() {
		const bar = el('settingsPendingBar');
		if (bar) {
			bar.classList.remove('show');
			hasPendingChanges = false;
		}
	}

	function discardChanges() {
		applyVisuals(savedSettings);
		syncUIToSettings(savedSettings);
		hidePendingBar();
	}

	// ── Background pattern ────────────────────────────────────────────────
	function applyBackgroundPattern(pattern) {
		const body = document.body;
		body.style.backgroundImage = '';
		body.style.backgroundSize = '';
		if (pattern === 'none') return;
		const isLight = body.getAttribute('data-theme') === 'white';
		const c = isLight ? '0,0,0' : '220,220,220';
		const p = {
			dots: [`radial-gradient(circle,rgba(${c},0.1) 1px,transparent 1px)`, '20px 20px'],
			grid: [
				`linear-gradient(rgba(${c},0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(${c},0.05) 1px,transparent 1px)`,
				'20px 20px',
			],
			waves: [
				`repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(${c},0.03) 10px,rgba(${c},0.03) 20px)`,
				'',
			],
			diagonal: [
				`repeating-linear-gradient(45deg,transparent,transparent 15px,rgba(${c},0.05) 15px,rgba(${c},0.05) 16px)`,
				'',
			],
		};
		if (p[pattern]) {
			body.style.backgroundImage = p[pattern][0];
			if (p[pattern][1]) body.style.backgroundSize = p[pattern][1];
		}
	}

	function applyCustomRollText(text) {
		const btn = el('rollBtn');
		if (btn) btn.textContent = text.trim() || 'roll';
	}

	// ── Seasonal particles ────────────────────────────────────────────────
	function startSeasonalParticles(season, density) {
		if (particleInterval) {
			clearInterval(particleInterval);
			particleInterval = null;
		}
		particles = [];
		const canvas = el('seasonCanvas');
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (!['winter', 'spring', 'summer', 'fall'].includes(season)) return;
		const emojiMap = { winter: '❄️', spring: '🌸', summer: '☀️', fall: '🍁' };
		const emoji = emojiMap[season];
		const w = (canvas.width = window.innerWidth);
		const h = (canvas.height = window.innerHeight);
		const maxP = { low: 50, medium: 200, high: 400 }[density] || 200;

		function addParticle() {
			if (particles.length >= maxP) return;
			particles.push({
				x: Math.random() * w,
				y: -20,
				speed: 1 + Math.random() * 2,
				drift: (Math.random() - 0.5) * 1.2,
				size: 14,
				char: emoji,
				alpha: 0.4 + Math.random() * 0.3,
			});
		}
		function startInterval() {
			if (particleInterval) clearInterval(particleInterval);
			particleInterval = setInterval(addParticle, 120);
		}
		startInterval();

		if (!visibilitySeasonListenerAdded) {
			document.addEventListener('visibilitychange', () => {
				const sel = el('seasonSelect');
				if (document.hidden) {
					if (particleInterval) {
						clearInterval(particleInterval);
						particleInterval = null;
					}
				} else if (sel && sel.value !== 'none') startInterval();
			});
			visibilitySeasonListenerAdded = true;
		}

		(function loop() {
			ctx.clearRect(0, 0, w, h);
			particles.forEach((p) => {
				p.y += p.speed;
				p.x += p.drift;
				ctx.globalAlpha = p.alpha;
				ctx.font = p.size + 'px sans-serif';
				ctx.fillText(p.char, p.x, p.y);
			});
			particles = particles.filter((p) => p.y < h + 30);
			requestAnimationFrame(loop);
		})();
	}

	// ── Dev overlay ───────────────────────────────────────────────────────
	// Generated code starts here on 2026-06-18T00:35:00Z:
	function startDevOverlay(settings) {
		const panel = document.getElementById('devOverlayPanel');
		if (!panel) return;

		if (!settings.dev) {
			panel.style.display = 'none';
			if (devInterval) {
				clearInterval(devInterval);
				devInterval = null;
			}
			return;
		}

		panel.style.display = 'block';

		if (!panel._dcInit) {
			panel._dcInit = true;
			initDevConsole(panel);
		}

		if (!devInterval) {
			devInterval = setInterval(() => updateDevStats(panel, settings), 500);
		}
	}
	// Generated code ends here on 2026-06-18T00:35:00Z:

	function updateDevStats(panel, settings) {
		const fps = window._devFPS || '--';
		const fpsEl = document.getElementById('dc-fps');
		if (fpsEl) {
			fpsEl.textContent = fps;
			fpsEl.className = 'stat-v' + (fps >= 58 ? ' good' : fps >= 40 ? '' : ' warn');
		}
		const rollsEl = document.getElementById('dc-rolls');
		if (rollsEl)
			rollsEl.textContent = typeof totalRolls !== 'undefined' ? totalRolls.toLocaleString() : '--';
		const ptsEl = document.getElementById('dc-pts');
		if (ptsEl) ptsEl.textContent = typeof points !== 'undefined' ? formatNum(points) : '--';
		const luckEl = document.getElementById('dc-luck');
		if (luckEl) {
			const lv = typeof globalLuckMultiplier !== 'undefined' ? globalLuckMultiplier : 1;
			luckEl.textContent = formatMult(lv) + 'x';
			luckEl.className = 'stat-v' + (lv >= 2 ? ' warn' : '');
		}
		const anomEl = document.getElementById('dc-anom');
		if (anomEl) anomEl.textContent = typeof anomalies !== 'undefined' ? anomalies : '--';
		const memEl = document.getElementById('dc-mem');
		if (memEl)
			memEl.textContent = performance.memory
				? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB'
				: '--';
		const pageEl = document.getElementById('dc-page');
		if (pageEl)
			pageEl.textContent =
				typeof window._currentPage !== 'undefined' ? window._currentPage + 1 : '--';
	}

	function initDevConsole(panel) {
		const logEl = document.getElementById('dc-log');
		const hintEl = document.getElementById('dc-hint');
		const inputRow = document.getElementById('dc-input-row');
		const inp = document.getElementById('dc-input');
		const flagsRow = document.getElementById('dc-flags');

		let cmdHistory = [],
			histIdx = -1;
		let consoleOpen = false;

		const dcFlags = {
			godmode: false,
			autosave: true,
			'inf-pts': false,
			noclip: false,
			'quiet-log': false,
			nightly: location.hostname === 'nightly.authsrng.xyz',
		};

		function ts() {
			const d = new Date();
			return (
				String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
			);
		}

		function dcLog(msg, cls = 'info') {
			if (dcFlags['quiet-log'] && cls === 'dim') return;
			const e = document.createElement('div');
			e.className = 'entry';
			e.innerHTML = `<span class="ts">${ts()}</span><span class="msg ${cls}">${msg}</span>`;
			logEl.appendChild(e);
			logEl.scrollTop = logEl.scrollHeight;
		}

		function rebuildFlags() {
			flagsRow.innerHTML = '';
			Object.entries(dcFlags).forEach(([name, val]) => {
				const btn = document.createElement('button');
				btn.className = 'flag' + (val ? ' on' : '') + (name === 'nightly' && val ? ' red' : '');
				btn.textContent = name;
				btn.onclick = () => toggleDcFlag(name);
				btn.id = 'dcf-' + name;
				flagsRow.appendChild(btn);
			});
		}

		// ── Tabs ──────────────────────────────────────────────────────────────
		document.querySelectorAll('.dev-tab').forEach((btn) => {
			btn.addEventListener('click', () => {
				document.querySelectorAll('.dev-tab').forEach((b) => b.classList.remove('active'));
				document.querySelectorAll('.dev-tab-content').forEach((c) => (c.style.display = 'none'));
				btn.classList.add('active');
				document.getElementById('dct-' + btn.dataset.tab).style.display = 'block';
				if (btn.dataset.tab === 'storage') renderStorage();
				if (btn.dataset.tab === 'perf') {
					startPerfTab();
				} else {
					perfTabActive = false;
					clearTimeout(perfRAF);
				}
				if (btn.dataset.tab === 'network') renderNetwork();
				if (btn.dataset.tab === 'watch') renderWatchList();
			});
		});

		// ── Storage tab ────────────────────────────────────────────────────────
		let storageEditKey = null;

		function renderStorage(filter) {
			const list = document.getElementById('dc-storage-list');
			const search = document.getElementById('dc-storage-search');
			const sizeEl = document.getElementById('dc-storage-size');
			if (!list) return;
			const q = (filter ?? search?.value ?? '').toLowerCase();
			let totalBytes = 0;
			const rows = [];
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				const v = localStorage.getItem(k);
				totalBytes += k.length + v.length;
				if (q && !k.toLowerCase().includes(q)) continue;
				rows.push({ k, size: v.length });
			}
			rows.sort((a, b) => b.size - a.size);
			if (sizeEl) sizeEl.textContent = (totalBytes / 1024).toFixed(1) + 'KB total';
			list.innerHTML = '';
			rows.forEach(({ k, size }) => {
				const row = document.createElement('div');
				row.className = 'dc-stor-row';
				row.innerHTML = `<span class="dc-stor-key">${k}</span><span class="dc-stor-size">${(size / 1024).toFixed(1)}KB</span>`;
				row.addEventListener('click', () => openStorageEdit(k));
				list.appendChild(row);
			});
		}

		function openStorageEdit(key) {
			storageEditKey = key;
			const editEl = document.getElementById('dc-storage-edit');
			const keyEl = document.getElementById('dc-storage-edit-key');
			const valEl = document.getElementById('dc-storage-edit-val');
			if (!editEl || !keyEl || !valEl) return;
			keyEl.textContent = key;
			valEl.value = localStorage.getItem(key) || '';
			editEl.style.display = 'block';
		}

		document
			.getElementById('dc-storage-search')
			?.addEventListener('input', (e) => renderStorage(e.target.value));
		document.getElementById('dc-storage-refresh')?.addEventListener('click', () => renderStorage());
		document.getElementById('dc-storage-save')?.addEventListener('click', () => {
			if (!storageEditKey) return;
			localStorage.setItem(storageEditKey, document.getElementById('dc-storage-edit-val').value);
			document.getElementById('dc-storage-edit').style.display = 'none';
			renderStorage();
		});
		document.getElementById('dc-storage-delete')?.addEventListener('click', () => {
			if (!storageEditKey) return;
			localStorage.removeItem(storageEditKey);
			storageEditKey = null;
			document.getElementById('dc-storage-edit').style.display = 'none';
			renderStorage();
		});
		document.getElementById('dc-storage-cancel')?.addEventListener('click', () => {
			document.getElementById('dc-storage-edit').style.display = 'none';
			storageEditKey = null;
		});

		// ── Network tab ────────────────────────────────────────────────────────
		const netLog = [];
		const _origFetch = window.fetch;
		let netPaused = false;

		window.fetch = function (...args) {
			const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '?';
			const method = args[1]?.method || 'GET';
			const entry = { url, method, status: null, ms: null, ts: Date.now(), pending: true };
			if (!netPaused) netLog.unshift(entry);
			if (netLog.length > 200) netLog.pop();
			const start = performance.now();
			return _origFetch
				.apply(this, args)
				.then((res) => {
					entry.status = res.status;
					entry.ms = Math.round(performance.now() - start);
					entry.pending = false;
					if (!netPaused) renderNetwork();
					return res;
				})
				.catch((err) => {
					entry.status = 'ERR';
					entry.ms = Math.round(performance.now() - start);
					entry.pending = false;
					if (!netPaused) renderNetwork();
					throw err;
				});
		};

		function renderNetwork() {
			const list = document.getElementById('dc-net-list');
			if (!list) return;
			list.innerHTML = '';
			netLog.forEach((e) => {
				const row = document.createElement('div');
				row.className = 'dc-net-row';
				const statusCls = e.pending
					? 'dc-net-pending'
					: e.status >= 200 && e.status < 300
						? 'dc-net-ok'
						: 'dc-net-err';
				const shortUrl = e.url.replace(/https?:\/\/[^/]+/, '').slice(0, 60) || e.url.slice(0, 60);
				row.innerHTML = `
            <span class="${statusCls}">${e.pending ? '...' : e.status}</span>
            <span class="dc-net-method">${e.method}</span>
            <span class="dc-net-url" title="${e.url}">${shortUrl}</span>
            <span class="dc-net-time">${e.pending ? '' : e.ms + 'ms'}</span>
        `;
				list.appendChild(row);
			});
		}

		document.getElementById('dc-net-clear')?.addEventListener('click', () => {
			netLog.length = 0;
			renderNetwork();
		});
		document.getElementById('dc-net-pause')?.addEventListener('change', (e) => {
			netPaused = e.target.checked;
		});

		// ── Perf tab ───────────────────────────────────────────────────────────
		const perfSamples = { fps: [], rollMs: [] };
		let perfTabActive = false;
		let perfRAF = null;

		window._perfMarkRollStart = function () {
			window._rollPerfStart = performance.now();
		};
		window._perfMarkRollEnd = function () {
			if (window._rollPerfStart) {
				perfSamples.rollMs.push(Math.round(performance.now() - window._rollPerfStart));
				if (perfSamples.rollMs.length > 60) perfSamples.rollMs.shift();
			}
		};

		function startPerfTab() {
			perfTabActive = true;
			drawPerf();
		}

		function drawPerf() {
			if (!perfTabActive) return;
			const canvas = document.getElementById('dc-perf-canvas');
			const statsEl = document.getElementById('dc-perf-stats');
			if (!canvas) return;

			canvas.width = canvas.offsetWidth;
			const ctx = canvas.getContext('2d');
			const w = canvas.width,
				h = canvas.height;
			ctx.fillStyle = '#0a0a0a';
			ctx.fillRect(0, 0, w, h);

			// fps samples
			if (window._devFPS) {
				perfSamples.fps.push(window._devFPS);
				if (perfSamples.fps.length > w) perfSamples.fps.shift();
			}

			function drawLine(samples, color, max) {
				if (samples.length < 2) return;
				ctx.beginPath();
				ctx.strokeStyle = color;
				ctx.lineWidth = 1;
				samples.forEach((v, i) => {
					const x = (i / (samples.length - 1)) * w;
					const y = h - (v / max) * h;
					i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
				});
				ctx.stroke();
			}

			drawLine(perfSamples.fps, '#5d5', 120);
			drawLine(perfSamples.rollMs, '#fa6', 2000);

			// legend
			ctx.font = '10px monospace';
			ctx.fillStyle = '#5d5';
			ctx.fillText('fps', 4, 12);
			ctx.fillStyle = '#fa6';
			ctx.fillText('roll ms', 30, 12);

			// stats
			const avg = (arr) =>
				arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
			const max = (arr) => (arr.length ? Math.max(...arr) : 0);
			const min = (arr) => (arr.length ? Math.min(...arr) : 0);

			if (statsEl) {
				const mem = performance.memory
					? (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) + 'MB'
					: 'n/a';
				statsEl.innerHTML = `
            <span style="color:#555">fps avg</span><span style="color:#5d5">${avg(perfSamples.fps)}</span>
            <span style="color:#555">fps min</span><span style="color:#5d5">${min(perfSamples.fps)}</span>
            <span style="color:#555">roll avg</span><span style="color:#fa6">${avg(perfSamples.rollMs)}ms</span>
            <span style="color:#555">roll max</span><span style="color:#fa6">${max(perfSamples.rollMs)}ms</span>
            <span style="color:#555">heap</span><span style="color:#ccc">${mem}</span>
            <span style="color:#555">ls keys</span><span style="color:#ccc">${localStorage.length}</span>
        `;
			}

			perfRAF = setTimeout(drawPerf, 1000);
		}

		// stop FUCKING drawing when the tab is FUCKING hidden
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				perfTabActive = false;
				clearTimeout(perfRAF);
			}
		});

		// ── Watch tab ────────────────────────────────────────────────────────── why do i love em fdashessssssssss
		const watchExprs = [];

		function evalWatch(expr) {
			try {
				return String(Function(`"use strict"; return (${expr})`)());
			} catch (e) {
				return 'err';
			}
		}

		function renderWatchList() {
			const list = document.getElementById('dc-watch-list');
			if (!list) return;
			list.innerHTML = '';
			watchExprs.forEach((w, i) => {
				const val = evalWatch(w.expr);
				const changed = val !== w.last;
				if (changed) w.last = val;
				const row = document.createElement('div');
				row.className = 'dc-watch-row';
				row.innerHTML = `
            <span class="dc-watch-expr">${w.expr}</span>
            <span class="dc-watch-val ${changed ? 'dc-watch-changed' : ''}">${val}</span>
            <button class="dc-watch-del" data-i="${i}">×</button>
        `;
				list.appendChild(row);
			});
			list.querySelectorAll('.dc-watch-del').forEach((btn) => {
				btn.addEventListener('click', () => {
					watchExprs.splice(parseInt(btn.dataset.i), 1);
					renderWatchList();
				});
			});
		}

		document.getElementById('dc-watch-add')?.addEventListener('click', () => {
			const inp = document.getElementById('dc-watch-input');
			const expr = inp?.value.trim();
			if (!expr) return;
			watchExprs.push({ expr, last: null });
			inp.value = '';
			renderWatchList();
		});

		document.getElementById('dc-watch-input')?.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') document.getElementById('dc-watch-add')?.click();
		});

		setInterval(() => {
			const watchTab = document.getElementById('dct-watch');
			if (watchTab && watchTab.style.display !== 'none' && watchExprs.length) renderWatchList();
		}, 500);

		// dragging to moving
		(function () {
			const panel = document.getElementById('devOverlayPanel');
			const dragbar = document.getElementById('dc-dragbar');
			if (!panel || !dragbar) return;

			let dragging = false,
				ox = 0,
				oy = 0;

			dragbar.addEventListener('mousedown', (e) => {
				dragging = true;
				const rect = panel.getBoundingClientRect();
				ox = e.clientX - rect.left;
				oy = e.clientY - rect.top;
				panel.style.right = 'auto';
				panel.style.bottom = 'auto';
				e.preventDefault();
			});

			document.addEventListener('mousemove', (e) => {
				if (!dragging) return;
				const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - ox));
				const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - oy));
				panel.style.left = x + 'px';
				panel.style.top = y + 'px';
			});

			document.addEventListener('mouseup', () => {
				dragging = false;
			});
		})();

		function toggleDcFlag(name) {
			dcFlags[name] = !dcFlags[name];
			const btn = document.getElementById('dcf-' + name);
			if (btn) {
				btn.classList.toggle('on', dcFlags[name]);
				if (name === 'nightly') btn.classList.toggle('red', dcFlags[name]);
			}
			dcLog(
				`flag <span style="color:#aaa">${name}</span> → ${dcFlags[name] ? '<span style="color:#5d5">ON</span>' : '<span style="color:#555">off</span>'}`,
				'dim'
			);
			if (name === 'inf-pts' && dcFlags['inf-pts']) {
				if (typeof points !== 'undefined') {
					points = 999999999;
					if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
					if (typeof updateShopUI === 'function') updateShopUI();
				}
			}
		}

		function openConsole() {
			consoleOpen = true;
			inputRow.style.display = 'flex';
			hintEl.textContent = 'type a command · :help for list · :off to close';
			inp.focus();
		}

		function closeConsole() {
			consoleOpen = false;
			inputRow.style.display = 'none';
			hintEl.textContent = 'type : to open console · :help for commands';
			inp.value = '';
			histIdx = -1;
		}

		const hints = {
			set: 'set &lt;points|rolls|luck|anomalies|trust&gt; &lt;value&gt;',
			give: 'give &lt;potion|anomaly&gt; [type] [count]',
			shop: 'shop &lt;luck|speed|points|magnet|printer|dupe&gt; &lt;level&gt;',
			flag: 'flag &lt;name&gt; — toggle a flag',
			inspect: 'inspect &lt;luck|inventory|potions|save|shop|runes|starmap&gt;',
			roll: 'roll &lt;rarity name&gt; — force a specific roll result',
			goto: 'goto &lt;page 1-9&gt;',
			clear: 'clear the log',
			reset: 'reset &lt;save|luck|points|shop|potions|anomalies&gt;',
			reload: 'reload the page',
			eval: 'eval &lt;js expression&gt; — execute arbitrary js',
			ls: 'ls [prefix] — list localStorage keys',
			get: 'get &lt;key&gt; — read a localStorage key',
			del: 'del &lt;key&gt; — delete a localStorage key',
			find: 'find &lt;name&gt; — search rarities list',
			rarity: 'rarity &lt;name&gt; — show rarity info',
			boost: 'boost — trigger a 4x luck boost immediately',
			potion: 'potion &lt;type&gt; — use a potion by name',
			help: 'list all commands',
			off: 'close the console',
		};

		const commands = {
			off() {
				closeConsole();
				const panel = document.getElementById('devOverlayPanel');
				if (panel) panel.style.display = 'none';
				if (typeof saveAllData === 'function') {
					// reflect in settings
				}
				const devCb = document.getElementById('devOverlay');
				if (devCb) {
					devCb.checked = false;
					devCb.dispatchEvent(new Event('change'));
				}
			},
			help() {
				dcLog('commands:', 'info');
				Object.entries(hints).forEach(([k, v]) => dcLog(`  :${k} — ${v}`, 'dim'));
			},
			clear() {
				logEl.innerHTML = '';
				dcLog('log cleared', 'dim');
			},
			reload() {
				location.reload();
			},
			set(args) {
				const [field, ...rest] = args;
				const val = Number(rest[0]);
				if (isNaN(val)) {
					dcLog('value must be a number', 'err');
					return;
				}
				if (field === 'points' && typeof points !== 'undefined') {
					points = val;
					if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
					if (typeof updateShopUI === 'function') updateShopUI();
				} else if (field === 'rolls' && typeof totalRolls !== 'undefined') {
					totalRolls = val;
					if (typeof updateTotalRolls === 'function') updateTotalRolls();
				} else if (field === 'luck' && typeof anomaliesUsed !== 'undefined') {
					dcLog('luck is computed — use anomalies or shop to change it', 'warn');
					return;
				} else if (field === 'anomalies' && typeof anomalies !== 'undefined') {
					anomalies = val;
					if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
				} else if (field === 'trust' && typeof window.mutationTrust !== 'undefined') {
					window.mutationTrust = val;
				} else {
					dcLog(`unknown field "${field}"`, 'err');
					return;
				}
				dcLog(`set ${field} → ${rest[0]}`, 'ok');
				if (dcFlags.autosave && typeof saveAllData === 'function') saveAllData();
			},
			give(args) {
				const [type, ...rest] = args;
				if (type === 'anomaly') {
					const n = Number(rest[0]) || 1;
					if (typeof anomalies !== 'undefined') {
						anomalies += n;
						if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
					}
					dcLog(`gave ${n} anomaly${n > 1 ? 's' : ''}`, 'ok');
					if (dcFlags.autosave && typeof saveAllData === 'function') saveAllData();
					return;
				}
				if (type === 'potion') {
					const t = rest[0] || 'luck2x',
						n = Number(rest[1]) || 1;
					if (typeof playerPotions !== 'undefined' && t in playerPotions) {
						playerPotions[t] += n;
						if (typeof updatePotionUI === 'function') updatePotionUI();
						dcLog(`gave ${n}x ${t} potion`, 'ok');
						if (dcFlags.autosave && typeof saveAllData === 'function') saveAllData();
					} else {
						dcLog(`unknown potion type "${t}"`, 'err');
					}
					return;
				}
				dcLog(`unknown type "${type}"`, 'err');
			},
			shop(args) {
				const [upg, lvl] = args;
				const n = Number(lvl);
				if (!upg || isNaN(n)) {
					dcLog('usage: :shop <upgrade> <level>', 'err');
					return;
				}
				const map = {
					luck: 'luck',
					speed: 'speed',
					points: 'pointMult',
					magnet: 'magnet',
					printer: 'printer',
					dupe: 'duplicate',
				};
				const key = map[upg];
				if (!key) {
					dcLog(`unknown upgrade "${upg}"`, 'err');
					return;
				}
				if (typeof shopUpgrades !== 'undefined') {
					shopUpgrades[key] = n;
					if (typeof updateShopUI === 'function') updateShopUI();
					if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
					dcLog(`set shop.${upg} → level ${n}`, 'ok');
					if (dcFlags.autosave && typeof saveAllData === 'function') saveAllData();
				}
			},
			flag(args) {
				const f = args[0];
				if (!f) {
					dcLog('usage: :flag <name>', 'err');
					return;
				}
				if (!(f in dcFlags)) {
					dcLog(`unknown flag "${f}"`, 'err');
					return;
				}
				toggleDcFlag(f);
			},
			inspect(args) {
				const t = args[0] || 'luck';
				if (t === 'luck') {
					const breakdown =
						typeof globalLuckMultiplier !== 'undefined'
							? globalLuckMultiplier.toFixed(2) + 'x total'
							: 'unavailable';
					dcLog(
						`luck: ${breakdown} · shop lv${typeof shopUpgrades !== 'undefined' ? shopUpgrades.luck : '?'} · anomalies used: ${typeof anomaliesUsed !== 'undefined' ? anomaliesUsed : '?'}`,
						'info'
					);
				} else if (t === 'inventory') {
					const sz = typeof inventoryData !== 'undefined' ? inventoryData.size : '?';
					const total = typeof rarities !== 'undefined' ? rarities.length : '?';
					dcLog(`${sz}/${total} collected`, 'info');
				} else if (t === 'potions') {
					if (typeof playerPotions !== 'undefined')
						dcLog(
							Object.entries(playerPotions)
								.filter(([, v]) => v > 0)
								.map(([k, v]) => `${k}:${v}`)
								.join('  ') || 'none',
							'info'
						);
				} else if (t === 'save') {
					let sz = 0;
					try {
						for (const k in localStorage) {
							if (Object.prototype.hasOwnProperty.call(localStorage, k))
								sz += localStorage[k].length + k.length;
						}
					} catch (_) {}
					dcLog(
						`localStorage: ${(sz / 1024).toFixed(1)}KB · keys: ${Object.keys(localStorage).length}`,
						'info'
					);
				} else if (t === 'shop') {
					if (typeof shopUpgrades !== 'undefined')
						dcLog(
							Object.entries(shopUpgrades)
								.map(([k, v]) => `${k}:${v}`)
								.join('  '),
							'info'
						);
				} else if (t === 'runes') {
					const rd = localStorage.getItem('runesData');
					dcLog(rd ? rd.slice(0, 200) : 'no rune data', 'info');
				} else if (t === 'starmap') {
					const sd = localStorage.getItem('starmapData');
					try {
						const p = JSON.parse(sd || '{}');
						dcLog(
							`constellations: ${(p.constellations || []).length} · shards: ${p.voidShards || 0}`,
							'info'
						);
					} catch (_) {
						dcLog('no starmap data', 'dim');
					}
				} else {
					dcLog(`unknown target "${t}"`, 'err');
				}
			},
			goto(args) {
				const p = Number(args[0]);
				if (!p || p < 1 || p > 9) {
					dcLog('usage: :goto <1-9>', 'err');
					return;
				}
				if (typeof window.goToPage === 'function') window.goToPage(p - 1);
				dcLog(`navigated to page ${p}`, 'ok');
			},
			roll(args) {
				const name = args.join(' ');
				if (!name) {
					dcLog('usage: :roll <rarity name>', 'err');
					return;
				}
				if (typeof rarities === 'undefined') {
					dcLog('rarities not loaded', 'err');
					return;
				}
				const r = rarities.find((x) => x.name.toLowerCase() === name.toLowerCase());
				if (!r) {
					dcLog(`rarity "${name}" not found — try :find ${name}`, 'err');
					return;
				}
				dcLog(`forcing roll → "${r.name}"`, 'warn');
				if (typeof spinAndReveal === 'function') {
					setTimeout(() => {
						spinAndReveal(r);
						dcLog(`rolled: ${r.name} (1/${Math.round(1 / r.chance).toLocaleString()})`, 'ok');
					}, 100);
				}
			},
			find(args) {
				const q = args.join(' ').toLowerCase();
				if (!q) {
					dcLog('usage: :find <query>', 'err');
					return;
				}
				if (typeof rarities === 'undefined') {
					dcLog('rarities not loaded', 'err');
					return;
				}
				const res = rarities.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 10);
				if (!res.length) {
					dcLog('no results', 'dim');
					return;
				}
				res.forEach((r) =>
					dcLog(`${r.name} — 1/${Math.round(1 / r.chance).toLocaleString()}`, 'dim')
				);
				if (rarities.filter((r) => r.name.toLowerCase().includes(q)).length > 10)
					dcLog('...and more', 'dim');
			},
			rarity(args) {
				const name = args.join(' ');
				if (!name) {
					dcLog('usage: :rarity <name>', 'err');
					return;
				}
				if (typeof rarities === 'undefined') {
					dcLog('rarities not loaded', 'err');
					return;
				}
				const r = rarities.find((x) => x.name.toLowerCase() === name.toLowerCase());
				if (!r) {
					dcLog(`not found`, 'err');
					return;
				}
				const denom = Math.round(1 / r.chance);
				const owned = typeof inventoryData !== 'undefined' && inventoryData.has(r.name);
				dcLog(
					`${r.name} — 1/${denom.toLocaleString()} · ${owned ? `owned x${inventoryData.get(r.name).count}` : 'not owned'} · style: ${r.style ? 'yes' : 'none'}`,
					'info'
				);
			},
			boost() {
				if (typeof startLuckBoost === 'function') {
					startLuckBoost();
					dcLog('4x luck boost triggered', 'ok');
				} else dcLog('startLuckBoost not available', 'err');
			},
			potion(args) {
				const t = args[0];
				if (!t) {
					dcLog('usage: :potion <type>', 'err');
					return;
				}
				if (typeof usePotion === 'function') {
					usePotion(t);
					dcLog(`used potion: ${t}`, 'ok');
				} else dcLog('usePotion not available', 'err');
			},
			reset(args) {
				const t = args[0];
				const confirm = args[1] === '--confirm';
				const valid = ['save', 'luck', 'points', 'shop', 'potions', 'anomalies'];
				if (!valid.includes(t)) {
					dcLog(`usage: :reset <${valid.join('|')}>`, 'err');
					return;
				}
				if (!confirm) {
					dcLog(`run :reset ${t} --confirm to proceed`, 'warn');
					return;
				}
				if (t === 'points' && typeof points !== 'undefined') {
					points = 0;
					if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
					if (typeof updateShopUI === 'function') updateShopUI();
				} else if (t === 'anomalies' && typeof anomalies !== 'undefined') {
					anomalies = 0;
					anomaliesUsed = 0;
					if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
					if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
				} else if (t === 'shop' && typeof shopUpgrades !== 'undefined') {
					Object.keys(shopUpgrades).forEach((k) => (shopUpgrades[k] = 0));
					if (typeof updateShopUI === 'function') updateShopUI();
				} else if (t === 'potions' && typeof playerPotions !== 'undefined') {
					Object.keys(playerPotions).forEach((k) => (playerPotions[k] = 0));
					if (typeof updatePotionUI === 'function') updatePotionUI();
				} else if (t === 'luck') {
					if (typeof anomaliesUsed !== 'undefined') anomaliesUsed = 0;
					if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
				} else if (t === 'save') {
					if (typeof resetInventory === 'function') resetInventory();
					return;
				}
				dcLog(`reset ${t}`, 'ok');
				if (dcFlags.autosave && typeof saveAllData === 'function') saveAllData();
			},
			ls(args) {
				const prefix = args[0] || '';
				const keys = Object.keys(localStorage)
					.filter((k) => k.startsWith(prefix))
					.sort();
				if (!keys.length) {
					dcLog('no keys found', 'dim');
					return;
				}
				keys.forEach((k) => {
					const v = localStorage.getItem(k);
					dcLog(`${k} <span style="color:#444">${(v.length / 1024).toFixed(1)}KB</span>`, 'dim');
				});
			},
			get(args) {
				const k = args[0];
				if (!k) {
					dcLog('usage: :get <key>', 'err');
					return;
				}
				const v = localStorage.getItem(k);
				if (v === null) {
					dcLog(`key "${k}" not found`, 'err');
					return;
				}
				dcLog(v.slice(0, 500) + (v.length > 500 ? '...' : ''), 'info');
			},
			del(args) {
				const k = args[0];
				if (!k) {
					dcLog('usage: :del <key>', 'err');
					return;
				}
				if (args[1] !== '--confirm') {
					dcLog(`run :del ${k} --confirm to proceed`, 'warn');
					return;
				}
				localStorage.removeItem(k);
				dcLog(`deleted "${k}"`, 'ok');
			},
			eval(args) {
				if (!dcFlags.godmode) {
					dcLog('eval requires godmode flag to be on', 'err');
					return;
				}
				const expr = args.join(' ');
				try {
					const result = Function('"use strict"; return (' + expr + ')')();
					dcLog(String(result).slice(0, 300), 'ok');
				} catch (e) {
					dcLog(e.message, 'err');
				}
			},
		};

		dcLog('dev console — type : to open · :help for commands', 'info');
		dcLog(`build: ${location.hostname} · ${new Date().toLocaleTimeString()}`, 'dim');

		rebuildFlags();

		let frameCount = 0,
			lastFPSTime = performance.now();
		(function fpsLoop() {
			frameCount++;
			const now = performance.now();
			if (now - lastFPSTime >= 1000) {
				window._devFPS = Math.round((frameCount * 1000) / (now - lastFPSTime));
				frameCount = 0;
				lastFPSTime = now;
			}
			requestAnimationFrame(fpsLoop);
		})();

		document.addEventListener('keydown', (e) => {
			if (e.target.id === 'dc-input') return;
			if (e.key === ':') {
				const panel = document.getElementById('devOverlayPanel');
				if (panel && panel.style.display !== 'none') {
					e.preventDefault();
					openConsole();
				}
			}
		});

		inp.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
				inp.value = cmdHistory[histIdx] || '';
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				histIdx = Math.max(histIdx - 1, -1);
				inp.value = histIdx < 0 ? '' : cmdHistory[histIdx] || '';
				return;
			}
			if (e.key === 'Tab') {
				e.preventDefault();
				const v = inp.value.trim().replace(/^:/, '');
				const matches = Object.keys(commands).filter((k) => k.startsWith(v));
				if (matches.length === 1) {
					inp.value = ':' + matches[0] + ' ';
				} else if (matches.length > 1) {
					dcLog('completions: ' + matches.map((m) => ':' + m).join('  '), 'dim');
				}
				return;
			}
			if (e.key === 'Escape') {
				closeConsole();
				return;
			}
			if (e.key !== 'Enter') return;
			const raw = inp.value.trim();
			if (!raw) return;
			cmdHistory.unshift(raw);
			histIdx = -1;
			dcLog(':' + raw, 'cmd');
			const [cmd, ...args] = raw.replace(/^:/, '').split(/\s+/);
			if (commands[cmd]) commands[cmd](args);
			else dcLog(`unknown command "${cmd}" — try :help`, 'err');
			inp.value = '';
			hintEl.textContent = 'type a command · :help for list · :off to close';
		});

		inp.addEventListener('input', () => {
			const v = inp.value.trim().replace(/^:/, '').split(/\s+/)[0];
			hintEl.textContent = hints[v]
				? `:${v} — ${hints[v]}`
				: 'type a command · :help for list · :off to close';
		});
	}
	// ── applyMusic ─hdvsj
	let _musicApplyToken = 0;

	async function applyMusic(settings) {
		const newKey = settings.muted ? '__muted__' : settings.music || 'default';
		if (newKey === _activeMusicKey) return;
		_activeMusicKey = newKey;

		const myToken = ++_musicApplyToken;

		if (settings.muted) {
			if (window.backgroundMusic) {
				window.backgroundMusic.pause();
				window.backgroundMusic.volume = 0;
			}
			if (window.lunarMusic) {
				window.lunarMusic.pause();
				window.lunarMusic.volume = 0;
			}
			if (window.stopCustomAudio) window.stopCustomAudio();
			return;
		}

		if (window.lunarMusic) window.lunarMusic.volume = 0.6;

		const musicKey = settings.music || 'default';

		if (window.stopCustomAudio) window.stopCustomAudio();
		if (window.backgroundMusic) {
			window.backgroundMusic.pause();
		}

		if (musicKey.startsWith('custom_')) {
			if (window.backgroundMusic) {
				window.backgroundMusic.src = '';
				window.backgroundMusic.load();
			}
			try {
				const id = parseInt(musicKey.replace('custom_', ''), 10);
				const track = await getTrack(id);
				if (myToken !== _musicApplyToken) return;
				if (track && window.playCustomAudio) {
					try {
						await window.playCustomAudio(track.buffer, track.type, 0.3, true);
					} catch (_) {
						if (myToken !== _musicApplyToken) return;
						_activeMusicKey = null;
						if (window.stopCustomAudio) window.stopCustomAudio();
						if (window.backgroundMusic) {
							window.backgroundMusic.src = musicLinks.default;
							window.backgroundMusic.volume = 0.3;
							window.backgroundMusic.loop = true;
							window.backgroundMusic.play().catch(() => {});
						}
					}
				}
			} catch (e) {
				console.error('custom music error:', e);
			}
		} else {
			if (myToken !== _musicApplyToken) return;
			if (window.backgroundMusic) {
				window.backgroundMusic.src = musicLinks[musicKey] || musicLinks.default;
				window.backgroundMusic.volume = 0.3;
				window.backgroundMusic.loop = true;
				window.backgroundMusic.play().catch(() => {});
			}
		}
	}

	function applyGlowBlobs(settings) {
		let container = el('glowBlobsContainer');
		if (!settings.glowEnabled) {
			if (container) container.remove();
			return;
		}
		if (!container) {
			container = document.createElement('div');
			container.id = 'glowBlobsContainer';
			container.style.cssText =
				'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
			document.body.appendChild(container);
		}
		const count = settings.glowCount ?? 3;
		const existing = container.children.length;
		while (container.children.length > count) container.lastChild.remove();
		for (let i = existing; i < count; i++) {
			const blob = document.createElement('div');
			blob.className = 'glow-blob';
			blob.style.left = Math.random() * 100 + '%';
			blob.style.top = Math.random() * 100 + '%';
			blob.style.animationDelay = (Math.random() * -20).toFixed(2) + 's';
			container.appendChild(blob);
		}
		container.querySelectorAll('.glow-blob').forEach((blob) => {
			const size = settings.glowSize ?? 300;
			blob.style.width = size + 'px';
			blob.style.height = size + 'px';
			blob.style.background = settings.glowColor || '#dcdcdc';
			blob.style.opacity = (settings.glowOpacity ?? 20) / 100;
			blob.style.animationDuration = (settings.glowSpeed ?? 20) + 's';
		});
	}

	// ── applyVisuals ──────────────────────────────────────────────────────
	function applyVisuals(settings) {
		document.body.classList.toggle('legacy-mode', !!settings.legacyMode);
		document.body.classList.toggle('blur-panels', !!settings.blurPanels);
		document.body.classList.toggle('compact-mode', !!settings.compactMode);
		document.body.classList.toggle('hide-cursor', !!settings.hideCursor);
		document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
		document.body.classList.toggle('high-contrast', !!settings.highContrast);
		document.body.classList.toggle('large-targets', !!settings.largeTargets);
		document.body.classList.toggle('rgb-bg', !!settings.rgb);
		document.body.classList.toggle('wacky-text', !!settings.wacky);
		document.body.classList.toggle('adhd-mode', !!settings.chaos);

		if (!localStorage.getItem('themeEditorActive')) {
			if (settings.theme === 'white') {
				document.body.setAttribute('data-theme', 'white');
				document.body.style.removeProperty('--bg-color');
			} else if (settings.theme === 'custom') {
				document.body.removeAttribute('data-theme');
				document.body.style.setProperty('--bg-color', settings.customHex || '#0e0e0e');
				document.body.style.setProperty('--text-color', settings.customTextHex || '#dcdcdc');
			} else {
				document.body.removeAttribute('data-theme');
				document.body.style.removeProperty('--bg-color');
			}
		}

		if (settings.font) {
			const fontMap = {
				serif: 'serif',
				mono: 'monospace',
				dyslexic: 'OpenDyslexic, monospace',
				default: 'monospace',
			};
			document.body.style.fontFamily = fontMap[settings.font] || 'monospace';
		}

		if (settings.textSize) {
			document.documentElement.style.setProperty('font-size', settings.textSize + 'px');
		}

		if (settings.accentColor) {
			document.documentElement.style.setProperty('--accent-color', settings.accentColor);
		}

		if (settings.bgPattern !== undefined) applyBackgroundPattern(settings.bgPattern);
		applyGlowBlobs(settings);
		if (settings.season !== undefined)
			startSeasonalParticles(settings.season, settings.particleDensity || 'medium');

		document.body.setAttribute('data-inv-style', settings.inventoryStyle || 'compact');

		window.spinnerStyleSetting = settings.spinnerStyle || 'slot';
		window.confettiThreshold = settings.confettiThreshold || 0;
		window.cutsceneThreshold = settings.cutsceneThreshold || 0;
		window.rawNumbers = !!settings.rawNumbers;
		window.rollSoundSetting = settings.rollSound || 'none';
		window.rareThreshold = settings.rareThreshold ?? 1000;
		window.autoSellThreshold = settings.autoSellThreshold || 0;
		window.cutsceneThreshold = settings.cutsceneThreshold || 0;

		const luckBreak = el('luckBreakdown');
		if (luckBreak) luckBreak.style.display = settings.hideLuckBreakdown ? 'none' : '';

		const rsrEl = el('rollsSinceRare');
		if (rsrEl) rsrEl.style.display = settings.rareThreshold > 0 ? '' : 'none';

		const rollBtn = el('rollBtn');
		if (rollBtn) {
			rollBtn.textContent = (settings.customRollText || '').trim() || 'roll';
			const sizeMap = {
				small: '8px 14px',
				normal: '12px 24px',
				large: '16px 32px',
				huge: '24px 48px',
			};
			rollBtn.style.padding = sizeMap[settings.rollBtnSize || 'normal'];
		}

		if (settings.bgPattern !== undefined) applyBackgroundPattern(settings.bgPattern);
		if (settings.season !== undefined)
			startSeasonalParticles(settings.season, settings.particleDensity || 'medium');

		startDevOverlay(settings);

		if (window.refreshAllDisplays) window.refreshAllDisplays();
	}

	// ── syncUIToSettings ──────────────────────────────────────────────────
	function syncUIToSettings(settings) {
		if (el('musicSelect')) el('musicSelect').value = settings.music || 'default';
		if (el('muteMusic')) el('muteMusic').checked = !!settings.muted;
		if (el('devOverlay')) el('devOverlay').checked = !!settings.dev;
		if (el('legacyMode')) el('legacyMode').checked = !!settings.legacyMode;
		if (el('rawNumbers')) el('rawNumbers').checked = !!settings.rawNumbers;
		if (el('rollSound')) el('rollSound').value = settings.rollSound || 'none';
		if (el('rareThreshold')) el('rareThreshold').value = settings.rareThreshold || 1000;
		if (el('autoSellThreshold')) el('autoSellThreshold').value = settings.autoSellThreshold || 0;
	}
	// blah!

	// ── getCurrentSettings ────────────────────────────────────────────────
	function getCurrentSettings() {
		return {
			music: (el('musicSelect') || {}).value || 'default',
			muted: !!(el('muteMusic') || {}).checked,
			dev: !!(el('devOverlay') || {}).checked,
			legacyMode: !!(el('legacyMode') || {}).checked,
			rawNumbers: !!(el('rawNumbers') || {}).checked,
			rollSound: (el('rollSound') || {}).value || 'none',
			rareThreshold: parseInt((el('rareThreshold') || {}).value || 1000, 10),
			autoSellThreshold: parseInt((el('autoSellThreshold') || {}).value || 0, 10),
		};
	}

	function onChange() {
		applyVisuals({ ...savedSettings, ...getCurrentSettings() });
		showPendingBar();
	}

	async function saveChanges() {
		const current = { ...savedSettings, ...getCurrentSettings() };
		applyVisuals(current);
		await applyMusic(current);
		syncUIToSettings(current);
		savedSettings = current;
		try {
			localStorage.setItem('userSettings', JSON.stringify(current));
		} catch (_) {}
		hidePendingBar();
	}

	// ── Event binding ─────────────────────────────────────────────────────
	function bindSettings() {
		const ids = ['muteMusic', 'legacyMode', 'rawNumbers', 'devOverlay'];
		ids.forEach((id) => {
			const n = el(id);
			if (n) n.addEventListener('change', onChange);
		});

		['musicSelect', 'rollSound'].forEach((id) => {
			const n = el(id);
			if (n) n.addEventListener('change', onChange);
		});

		['rareThreshold', 'autoSellThreshold'].forEach((id) => {
			const n = el(id);
			if (n) n.addEventListener('input', onChange);
		});
	}

	// ── Web Audio API (custom music) ──────────────────────────────────────
	// Now takes an ArrayBuffer (from IDB) + MIME type instead of a base64 data URL.
	window.audioContext = null;
	window.customAudioSource = null;
	window.customAudioGain = null;

	// In playCustomAudio, add resume() before decoding:
	window.playCustomAudio = function (arrayBuffer, mimeType, volume, loop) {
		return new Promise((resolve, reject) => {
			try {
				if (window.customAudioSource) {
					try {
						window.customAudioSource.stop();
					} catch (_) {}
					window.customAudioSource = null;
				}
				if (!window.audioContext)
					window.audioContext = new (window.AudioContext || window.webkitAudioContext)();

				// Resume suspended context (required after browser autoplay policy kicks in)
				const ctx = window.audioContext;
				const proceed = () => {
					const bufferCopy = arrayBuffer.slice(0);
					ctx.decodeAudioData(
						bufferCopy,
						(decoded) => {
							const src = ctx.createBufferSource();
							src.buffer = decoded;
							src.loop = loop;
							if (!window.customAudioGain) {
								window.customAudioGain = ctx.createGain();
								window.customAudioGain.connect(ctx.destination);
							}
							window.customAudioGain.gain.value = volume;
							src.connect(window.customAudioGain);
							src.start(0);
							window.customAudioBuffer = decoded;
							window.customAudioStartTime = ctx.currentTime;
							window.customAudioOffset = 0;
							window.customAudioSource = src;
							resolve();
						},
						reject
					);
				};

				if (ctx.state === 'suspended') {
					ctx.resume().then(proceed).catch(reject);
				} else {
					proceed();
				}
			} catch (e) {
				reject(e);
			}
		});
	};

	window.stopCustomAudio = function () {
		if (window.customAudioSource) {
			try {
				window.customAudioSource.stop();
			} catch (_) {}
			window.customAudioSource = null;
		}
	};

	// ── Custom music upload UI ─────────────────────────────────────────────
	async function loadCustomMusicUI() {
		const musicSel = el('musicSelect');
		const listWrapper = el('customMusicList');
		const listEl = el('customTracksList');
		if (!musicSel) return;
		try {
			const tracks = await getAllTracksMeta();
			Array.from(musicSel.options).forEach((o) => {
				if (o.value.startsWith('custom_')) o.remove();
			});
			tracks.forEach((track) => {
				const opt = document.createElement('option');
				opt.value = 'custom_' + track.id;
				opt.textContent = track.name + ' (custom)';
				musicSel.appendChild(opt);
			});
			if (listWrapper) listWrapper.style.display = tracks.length ? 'block' : 'none';
			if (listEl) renderCustomTracksList(tracks, listEl, musicSel);
		} catch (e) {
			console.error('custom music UI error:', e);
		}
	}

	function renderCustomTracksList(tracks, container, musicSel) {
		container.innerHTML = '';
		tracks.forEach((track) => {
			const row = document.createElement('div');
			row.style.cssText =
				'padding:8px;margin-bottom:6px;background:var(--overlay-bg);border:1px solid var(--border-color);border-radius:2px;';

			const topRow = document.createElement('div');
			topRow.style.cssText =
				'display:flex;justify-content:space-between;align-items:center;gap:8px;';

			const nameEl = document.createElement('span');
			const sizeMB = track.size ? (track.size / 1024 / 1024).toFixed(1) : '?';
			nameEl.textContent = `${track.name}  (${sizeMB} MB)`;
			nameEl.style.cssText =
				'font-size:0.85em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

			const actions = document.createElement('div');
			actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

			const renameBtn = document.createElement('button');
			renameBtn.textContent = 'rename';
			renameBtn.className = 'small';
			renameBtn.onclick = () => {
				const input = document.createElement('input');
				input.type = 'text';
				input.value = track.name;
				input.style.cssText =
					'font-size:0.85em;padding:2px 6px;flex:1;min-width:0;box-sizing:border-box;';
				nameEl.replaceWith(input);
				input.focus();
				input.select();

				const commit = async () => {
					const newName = input.value.trim();
					if (newName && newName !== track.name) {
						await updateTrackName(track.id, newName);
						_activeMusicKey = null;
					}
					await loadCustomMusicUI();
				};

				renameBtn.textContent = 'ok';
				renameBtn.onclick = commit;
				input.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') loadCustomMusicUI();
				});
			};

			const del = document.createElement('button');
			del.textContent = 'delete';
			del.className = 'small';
			del.onclick = async () => {
				const key = 'custom_' + track.id;
				try {
					await deleteTrack(track.id);
				} catch (e) {
					console.error(e);
				}
				_activeMusicKey = null;
				if (musicSel && musicSel.value === key) {
					musicSel.value = 'default';
					onChange();
				}
				loadCustomMusicUI();
			};

			actions.appendChild(renameBtn);
			actions.appendChild(del);
			topRow.appendChild(nameEl);
			topRow.appendChild(actions);
			row.appendChild(topRow);

			if (track.meta) {
				const { title, artist, album, year, genre } = track.meta;
				const parts = [
					title && title,
					artist && `by ${artist}`,
					album && `· ${album}`,
					year && `(${year})`,
					genre && `[${genre}]`,
				].filter(Boolean);
				if (parts.length) {
					const metaEl = document.createElement('div');
					metaEl.style.cssText = 'font-size:0.75em;opacity:0.4;margin-top:5px;';
					metaEl.textContent = parts.join('  ');
					row.appendChild(metaEl);
				}
			}

			container.appendChild(row);
		});
	}

	function bindCustomMusicUpload() {
		const upload = el('customMusicUpload');
		if (!upload) return;
		upload.addEventListener('change', async (e) => {
			const file = e.target.files[0];
			if (!file) return;

			// 100 MB limit — IndexedDB can handle it, localStorage couldn't
			if (file.size > 100 * 1024 * 1024) {
				window.showAlert('file too large! max 100MB');
				upload.value = '';
				return;
			}
			if (!file.type.startsWith('audio/')) {
				window.showAlert('please upload an audio file');
				upload.value = '';
				return;
			}

			const reader = new FileReader();
			reader.onload = async (ev) => {
				try {
					const buf = ev.target.result;
					const meta = parseID3(buf);
					const defaultName = (meta && meta.title) || file.name.replace(/\.[^/.]+$/, '');
					await addTrack(defaultName, buf, file.type, meta);
					_activeMusicKey = null;
					await loadCustomMusicUI();
					upload.value = '';
					window.showAlert('track uploaded!');
				} catch (err) {
					window.showAlert('error saving track: ' + err.message);
					upload.value = '';
				}
			};
			reader.onerror = () => {
				window.showAlert('error reading file');
				upload.value = '';
			};
			reader.readAsArrayBuffer(file); // ArrayBuffer, not data URL
		});
	}

	// ── Save / settings transfer ──────────────────────────────────────────
	const SAVE_KEYS = [
		'rarityInventory',
		'totalRolls',
		'achievementsUnlocked',
		'anomalies',
		'anomaliesUsed',
		'shopPoints',
		'shopUpgrades',
		'soldOutRarities',
		'playerPotions',
		'activePotions',
		'wishingWell',
		'luckBoostState',
		'totalPlaytime',
		'daily_lastClaim',
		'daily_streak',
		'weekly_lastClaim',
		'weekly_streak',
	];

	function simpleHash(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) {
			h = (h << 5) - h + str.charCodeAt(i);
			h |= 0;
		}
		return (h >>> 0).toString(16).padStart(8, '0');
	}

	function bundleSaveKeys() {
		const obj = {};
		SAVE_KEYS.forEach((k) => {
			const v = localStorage.getItem(k);
			if (v !== null) obj[k] = v;
		});
		return obj;
	}

	function encode(bundle, tag) {
		const payload = JSON.stringify(bundle);
		const envelope = JSON.stringify({
			p: payload,
			h: simpleHash(payload),
			t: tag,
		});
		return btoa(unescape(encodeURIComponent(envelope)));
	}

	function decode(input, expectedTag) {
		let envelope;
		try {
			envelope = JSON.parse(decodeURIComponent(escape(atob(input.trim()))));
		} catch (_) {
			return { error: 'invalid or corrupted data...' };
		}
		if (!envelope?.p || !envelope?.h || !envelope?.t) return { error: 'invalid format' };
		if (envelope.t !== expectedTag) return { error: 'wrong type! expected ' + expectedTag };
		if (simpleHash(envelope.p) !== envelope.h) return { error: 'tampered or corrupted! blocked' };
		try {
			return { bundle: JSON.parse(envelope.p) };
		} catch (_) {
			return { error: 'payload not valid json' };
		}
	}

	function getCodeText(elId) {
		return (el(elId) || {}).textContent || '';
	}

	function copyText(text, label) {
		navigator.clipboard
			.writeText(text)
			.then(() => window.showAlert(label + ' copied!'))
			.catch(() => {
				const ta = Object.assign(document.createElement('textarea'), {
					value: text,
				});
				ta.style.cssText = 'position:fixed;opacity:0';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				window.showAlert(label + ' copied!');
			});
	}

	function downloadText(text, filename) {
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
			download: filename,
		});
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(a.href);
	}

	function adjustHeight(codeEl) {
		const page = codeEl?.closest('.page');
		const cont = codeEl?.closest('.page-container');
		if (page && cont) cont.style.height = page.scrollHeight + 'px';
	}

	function refreshCode(codeElId, getBundle, tag) {
		const codeEl = el(codeElId);
		if (!codeEl) return;
		const bundle = getBundle();
		codeEl.textContent = Object.keys(bundle).length ? encode(bundle, tag) : '(no data)';
		adjustHeight(codeEl);
	}

	function setupShowMore(codeElId, btnElId) {
		const codeEl = el(codeElId),
			btn = el(btnElId);
		if (!codeEl || !btn) return () => {};
		let expanded = false;
		const check = () => {
			btn.style.display = codeEl.scrollHeight > codeEl.clientHeight + 4 ? 'inline-block' : 'none';
		};
		btn.addEventListener('click', () => {
			expanded = !expanded;
			codeEl.style.maxHeight = expanded ? 'none' : '3.5em';
			btn.textContent = expanded ? 'show less' : 'show more';
			check();
		});
		return check;
	}

	function bindTransfer() {
		const checkSave = setupShowMore('saveTransferCode', 'showMoreSaveBtn');
		const checkSettings = setupShowMore('settingsTransferCode', 'showMoreSettingsBtn');

		function refreshSave() {
			refreshCode('saveTransferCode', bundleSaveKeys, 'save');
			checkSave();
		}
		function refreshSettingsCode() {
			refreshCode(
				'settingsTransferCode',
				() => {
					const r = localStorage.getItem('userSettings');
					return r ? { userSettings: r } : {};
				},
				'settings'
			);
			checkSettings();
		}

		const actions = [
			[
				'exportSaveBtn',
				() => {
					refreshSave();
					const t = getCodeText('saveTransferCode');
					if (!t.startsWith('(')) copyText(t, 'save data');
					else window.showAlert('no save data');
				},
			],
			[
				'downloadSaveBtn',
				() => {
					refreshSave();
					const t = getCodeText('saveTransferCode');
					if (!t.startsWith('(')) downloadText(t, 'authsrng_save.txt');
					else window.showAlert('no save data');
				},
			],
			['refreshSaveBtn', refreshSave],
			[
				'importSaveBtn',
				() => {
					const input = prompt('paste your save data export:');
					if (!input?.trim()) return;
					const result = decode(input, 'save');
					if (result.error) {
						window.showAlert(result.error);
						return;
					}
					Object.keys(result.bundle).forEach((k) => localStorage.setItem(k, result.bundle[k]));
					window.showAlert('save imported! reloading...');
					setTimeout(() => location.reload(), 500);
				},
			],
			[
				'exportSettingsBtn',
				() => {
					refreshSettingsCode();
					const t = getCodeText('settingsTransferCode');
					if (!t.startsWith('(')) copyText(t, 'settings');
					else window.showAlert('no settings');
				},
			],
			[
				'downloadSettingsBtn',
				() => {
					refreshSettingsCode();
					const t = getCodeText('settingsTransferCode');
					if (!t.startsWith('(')) downloadText(t, 'authsrng_settings.txt');
					else window.showAlert('no settings');
				},
			],
			['refreshSettingsBtn', refreshSettingsCode],
			[
				'importSettingsBtn',
				() => {
					const input = prompt('paste your settings export:');
					if (!input?.trim()) return;
					const result = decode(input, 'settings');
					if (result.error) {
						window.showAlert(result.error);
						return;
					}
					if (result.bundle.userSettings)
						localStorage.setItem('userSettings', result.bundle.userSettings);
					try {
						const s = JSON.parse(result.bundle.userSettings);
						applyVisuals(s);
						applyMusic(s);
						syncUIToSettings(s);
						savedSettings = s;
					} catch (_) {}
					window.showAlert('settings imported! reloading...');
					setTimeout(() => location.reload(), 500);
				},
			],
		];

		actions.forEach(([id, fn]) => {
			const n = el(id);
			if (n) n.addEventListener('click', fn);
		});
		refreshSave();
		refreshSettingsCode();
	}

	// ── Legacy mode content mover ─────────────────────────────────────────
	function bindLegacyMode() {
		const legacyShopBtn = el('legacyShopBtn');
		const legacySettingsBtn = el('legacySettingsBtn');
		const legacyShopPopup = el('legacyShopPopup');
		const legacySettingsPopup = el('legacySettingsPopup');
		const shopPage = document.querySelector('#page-2');
		const settingsPage = document.querySelector('#page-8');
		if (!legacyShopBtn || !legacySettingsBtn || !legacyShopPopup || !legacySettingsPopup) return;

		let shopMoved = false,
			settingsMoved = false;
		function moveToPopup(page, popup, flag) {
			if (!page || !popup || flag) return true;
			while (page.firstChild) popup.appendChild(page.firstChild);
			return true;
		}
		function restoreFromPopup(page, popup, flag) {
			if (!page || !popup || !flag) return false;
			while (popup.firstChild) page.appendChild(popup.firstChild);
			return false;
		}

		function syncLegacyState() {
			const isLegacy = document.body.classList.contains('legacy-mode');
			if (isLegacy) {
				shopMoved = moveToPopup(shopPage, legacyShopPopup, shopMoved);
				settingsMoved = moveToPopup(settingsPage, legacySettingsPopup, settingsMoved);
			} else {
				shopMoved = restoreFromPopup(shopPage, legacyShopPopup, shopMoved);
				settingsMoved = restoreFromPopup(settingsPage, legacySettingsPopup, settingsMoved);
				legacyShopPopup.classList.remove('open');
				legacySettingsPopup.classList.remove('open');
			}
		}

		new MutationObserver((mutations) => {
			mutations.forEach((m) => {
				if (m.attributeName === 'class') syncLegacyState();
			});
		}).observe(document.body, { attributes: true });

		if (document.body.classList.contains('legacy-mode')) syncLegacyState();

		legacyShopBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			legacyShopPopup.classList.toggle('open');
			legacySettingsPopup.classList.remove('open');
		});
		legacySettingsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			legacySettingsPopup.classList.toggle('open');
			legacyShopPopup.classList.remove('open');
		});
		document.addEventListener('click', (e) => {
			if (!legacyShopPopup.contains(e.target) && e.target !== legacyShopBtn)
				legacyShopPopup.classList.remove('open');
			if (!legacySettingsPopup.contains(e.target) && e.target !== legacySettingsBtn)
				legacySettingsPopup.classList.remove('open');
		});
	}

	// ── Init ──────────────────────────────────────────────────────────────
	async function init() {
		console.log('[settings] initializing...');
		createPendingBar();
		bindCustomMusicUpload();
		bindTransfer();
		bindLegacyMode();

		await migrateFromLocalStorage();
		await loadCustomMusicUI();

		let loaded = {};
		try {
			loaded = JSON.parse(localStorage.getItem('userSettings') || '{}');
		} catch (_) {}

		const defaults = {
			theme: 'black',
			customHex: '#0e0e0e',
			customTextHex: '#dcdcdc',
			textSize: 16,
			rgb: false,
			wacky: false,
			chaos: false,
			music: 'default',
			font: 'default',
			season: 'none',
			dev: false,
			muted: false,
			particleDensity: 'medium',
			bgPattern: 'none',
			customRollText: '',
			legacyMode: false,
			inventoryStyle: 'compact',
			spinnerStyle: 'slot',
			rollBtnSize: 'normal',
			accentColor: '#dcdcdc',
			blurPanels: false,
			hideCursor: false,
			hideLuckBreakdown: false,
			compactMode: false,
			reduceMotion: false,
			highContrast: false,
			largeTargets: false,
			rollSound: 'none',
			rareThreshold: 1000,
			confettiThreshold: 0,
			autoSellThreshold: 0,
			cutsceneThreshold: 0,
			rawNumbers: false,
		};

		savedSettings = { ...defaults, ...loaded };
		applyVisuals(savedSettings);
		await applyMusic(savedSettings);
		syncUIToSettings(savedSettings); // sync UI first
		bindSettings(); // THEN bind, so no spurious change events fireeee
		console.log('[settings] initialized.');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	Object.defineProperty(window, 'savedSettings', {
		get: () => savedSettings,
	});

	// Expose globals
	window.applySettings = async function (settings) {
		savedSettings = { ...savedSettings, ...settings };
		applyVisuals(savedSettings);
		await applyMusic(savedSettings);
		syncUIToSettings(savedSettings);
		try {
			localStorage.setItem('userSettings', JSON.stringify(savedSettings));
		} catch (_) {}
	};
	window.getCurrentSettings = getCurrentSettings;
})();
