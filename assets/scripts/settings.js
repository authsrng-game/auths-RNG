// settings.js
(function () {
  'use strict';

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

  async function getAllTracks() {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('tracks', 'readonly')
        .objectStore('tracks')
        .getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllTracksMeta() {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const results = [];
      const req = db
        .transaction('tracks', 'readonly')
        .objectStore('tracks')
        .openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const { id, name, type, size } = cursor.value;
          results.push({ id, name, type, size });
          cursor.continue();
        } else resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getTrack(id) {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('tracks', 'readonly')
        .objectStore('tracks')
        .get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function addTrack(name, buffer, type) {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('tracks', 'readwrite')
        .objectStore('tracks')
        .add({ name, buffer, type, size: buffer.byteLength });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteTrack(id) {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('tracks', 'readwrite')
        .objectStore('tracks')
        .delete(id);
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
    console.log(
      `[music] migrating ${old.length} track(s) from localStorage → IndexedDB`,
    );
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
    el('settingsSaveBtn').addEventListener('click', saveChanges);
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

  function saveChanges() {
    const current = getCurrentSettings();
    applyVisuals(current);
    applyMusic(current); // ← music only touches audio on explicit save
    syncUIToSettings(current);
    savedSettings = current;
    try {
      localStorage.setItem('userSettings', JSON.stringify(current));
    } catch (_) {}
    hidePendingBar();
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
      dots: [
        `radial-gradient(circle,rgba(${c},0.1) 1px,transparent 1px)`,
        '20px 20px',
      ],
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
  let devToggleBtn = el('devOverlayToggle');
  if (!devToggleBtn) {
    devToggleBtn = document.createElement('button');
    devToggleBtn.id = 'devOverlayToggle';
    devToggleBtn.textContent = 'hide dev';
    document.body.appendChild(devToggleBtn);
  }
  let devCollapsed = false;
  devToggleBtn.addEventListener('click', () => {
    const panel = el('devOverlayPanel');
    if (!panel) return;
    devCollapsed = !devCollapsed;
    panel.classList.toggle('collapsed', devCollapsed);
    devToggleBtn.textContent = devCollapsed ? 'show dev' : 'hide dev';
  });

  let frameCount = 0,
    lastFPSUpdate = performance.now(),
    currentFPS = 0;

  function startDevOverlay(settings) {
    const panel = el('devOverlayPanel');
    if (!panel) return;
    clearInterval(devInterval);
    devInterval = null;
    if (!settings.dev) {
      panel.style.display = 'none';
      devToggleBtn.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    devToggleBtn.style.display = 'block';
    (function countFrame() {
      frameCount++;
      const now = performance.now();
      if (now - lastFPSUpdate >= 1000) {
        currentFPS = Math.round((frameCount * 1000) / (now - lastFPSUpdate));
        frameCount = 0;
        lastFPSUpdate = now;
      }
      requestAnimationFrame(countFrame);
    })();
    devInterval = setInterval(() => {
      const memInfo = performance.memory
        ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          }
        : null;
      const totalEl = document.getElementsByTagName('*').length;
      const clickable = document.querySelectorAll(
        'button,a,[onclick],input,select',
      ).length;
      const navT = performance.getEntriesByType('navigation')[0];
      const loadTime = navT
        ? Math.round(navT.loadEventEnd - navT.fetchStart)
        : 0;
      let lsSize = 0,
        lsKeys = [];
      try {
        for (const key in localStorage) {
          if (!Object.prototype.hasOwnProperty.call(localStorage, key))
            continue;
          const s = localStorage[key].length + key.length;
          lsSize += s;
          lsKeys.push({ key, size: s });
        }
        lsKeys.sort((a, b) => b.size - a.size);
      } catch (_) {}
      const fps = currentFPS;
      panel.textContent = [
        `── PERFORMANCE ──`,
        `FPS: ${fps}  FrameTime: ${fps ? (1000 / fps).toFixed(1) : '?'}ms  Load: ${loadTime}ms`,
        memInfo
          ? `Memory: ${memInfo.used}MB / ${memInfo.limit}MB  (${((memInfo.used / memInfo.limit) * 100).toFixed(1)}%)`
          : '',
        `Particles: ${particles.length}  Intervals: ${[particleInterval, devInterval, rgbInterval, wackyInterval].filter(Boolean).length}`,
        ``,
        `── DOM ──`,
        `Elements: ${totalEl}  Interactive: ${clickable}`,
        ``,
        `── STORAGE ──`,
        `LocalStorage: ${(lsSize / 1024).toFixed(2)}KB (${((lsSize / (5 * 1024 * 1024)) * 100).toFixed(1)}%)  Keys: ${lsKeys.length}`,
        lsKeys
          .slice(0, 3)
          .map((i) => `  ${i.key}: ${(i.size / 1024).toFixed(2)}KB`)
          .join('  '),
        ``,
        `── SYSTEM ──`,
        `${window.innerWidth}x${window.innerHeight}  DPR:${window.devicePixelRatio}  Online:${navigator.onLine ? 'yes' : 'NO'}`,
        `Theme:${settings.theme || 'black'}  Season:${settings.season || 'none'}`,
        `Music: ${_activeMusicKey || 'none'} (pending: ${hasPendingChanges ? 'yes' : 'no'})`,
      ]
        .filter((l) => l !== undefined)
        .join('\n');
    }, 500);
  }

  // ── applyMusic ────────────────────────────────────────────────────────
  // Only called explicitly: on page load (init) and on saveChanges().
  // The _activeMusicKey guard means even if called twice with same settings,
  // it is a no-op — no more tidal waves.
  // Now async because custom tracks need an IDB fetch.
  async function applyMusic(settings) {
    const newKey = settings.muted ? '__muted__' : settings.music || 'default';
    if (newKey === _activeMusicKey) return;
    _activeMusicKey = newKey;

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
    if (musicKey.startsWith('custom_')) {
      if (window.backgroundMusic) {
        window.backgroundMusic.pause();
        window.backgroundMusic.src = '';
        window.backgroundMusic.load();
      }
      try {
        const id = parseInt(musicKey.replace('custom_', ''), 10);
        const track = await getTrack(id);
        if (track && window.playCustomAudio) {
          window
            .playCustomAudio(track.buffer, track.type, 0.3, true)
            .catch(() => {
              _activeMusicKey = null; // allow retry on next save
              if (window.stopCustomAudio) window.stopCustomAudio();
              if (window.backgroundMusic) {
                window.backgroundMusic.src = musicLinks.default;
                window.backgroundMusic.volume = 0.3;
                window.backgroundMusic.loop = true;
                window.backgroundMusic.play().catch(() => {});
              }
            });
        }
      } catch (e) {
        console.error('custom music error:', e);
      }
    } else {
      if (window.stopCustomAudio) window.stopCustomAudio();
      if (window.backgroundMusic) {
        window.backgroundMusic.src = musicLinks[musicKey] || musicLinks.default;
        window.backgroundMusic.volume = 0.3;
        window.backgroundMusic.loop = true;
        window.backgroundMusic.play().catch(() => {});
      }
    }
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

    if (!localStorage.getItem('themeEditorActive')) {
      if (settings.theme === 'white') {
        document.body.setAttribute('data-theme', 'white');
        document.body.style.removeProperty('--bg-color');
      } else if (settings.theme === 'custom') {
        document.body.removeAttribute('data-theme');
        document.body.style.setProperty(
          '--bg-color',
          settings.customHex || '#0e0e0e',
        );
        document.body.style.setProperty(
          '--text-color',
          settings.customTextHex || '#dcdcdc',
        );
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
      document.documentElement.style.setProperty(
        'font-size',
        settings.textSize + 'px',
      );
    }

    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        '--accent-color',
        settings.accentColor,
      );
    }

    document.body.setAttribute(
      'data-inv-style',
      settings.inventoryStyle || 'compact',
    );

    window.spinnerStyleSetting = settings.spinnerStyle || 'slot';
    window.confettiThreshold = settings.confettiThreshold || 0;
    window.cutsceneThreshold = settings.cutsceneThreshold || 0;
    window.rawNumbers = !!settings.rawNumbers;
    window.rollSoundSetting = settings.rollSound || 'none';
    window.rareThreshold = settings.rareThreshold ?? 1000;
    window.autoSellThreshold = settings.autoSellThreshold || 0;

    const luckBreak = el('luckBreakdown');
    if (luckBreak)
      luckBreak.style.display = settings.hideLuckBreakdown ? 'none' : '';

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

    if (settings.bgPattern !== undefined)
      applyBackgroundPattern(settings.bgPattern);
    if (settings.season !== undefined)
      startSeasonalParticles(
        settings.season,
        settings.particleDensity || 'medium',
      );

    startDevOverlay(settings);

    if (window.refreshAllDisplays) window.refreshAllDisplays();
  }

  // ── syncUIToSettings ──────────────────────────────────────────────────
  function syncUIToSettings(settings) {
    if (el('musicSelect'))
      el('musicSelect').value = settings.music || 'default';
    if (el('muteMusic')) el('muteMusic').checked = !!settings.muted;
    if (el('devOverlay')) el('devOverlay').checked = !!settings.dev;
    if (el('legacyMode')) el('legacyMode').checked = !!settings.legacyMode;
    if (el('rawNumbers')) el('rawNumbers').checked = !!settings.rawNumbers;
    if (el('rollSound')) el('rollSound').value = settings.rollSound || 'none';
    if (el('rareThreshold'))
      el('rareThreshold').value = settings.rareThreshold || 1000;
    if (el('autoSellThreshold'))
      el('autoSellThreshold').value = settings.autoSellThreshold || 0;
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
      autoSellThreshold: parseInt(
        (el('autoSellThreshold') || {}).value || 0,
        10,
      ),
    };
  }
  // ── onChange — fires on every UI interaction ──────────────────────────
  // Only applies visuals (safe). Music is NOT touched until save. We will not make the stupid fucking bug once again.
  function onChange() {
    applyVisuals(getCurrentSettings());
    showPendingBar();
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
          window.audioContext = new (
            window.AudioContext || window.webkitAudioContext
          )();

        // IDB hands us the same ArrayBuffer every time — slice a copy so
        // decodeAudioData can detach it safely without corrupting the stored record.
        const bufferCopy = arrayBuffer.slice(0);

        window.audioContext.decodeAudioData(
          bufferCopy,
          (decoded) => {
            const src = window.audioContext.createBufferSource();
            src.buffer = decoded;
            src.loop = loop;
            if (!window.customAudioGain) {
              window.customAudioGain = window.audioContext.createGain();
              window.customAudioGain.connect(window.audioContext.destination);
            }
            window.customAudioGain.gain.value = volume;
            src.connect(window.customAudioGain);
            src.start(0);
            window.customAudioSource = src;
            resolve();
          },
          reject,
        );
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
      if (listWrapper)
        listWrapper.style.display = tracks.length ? 'block' : 'none';
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
        'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:4px;background:var(--overlay-bg);border:1px solid var(--border-color);border-radius:2px;';

      // Size badge
      const sizeMB = track.size ? (track.size / 1024 / 1024).toFixed(1) : '?';
      const name = document.createElement('span');
      name.style.fontSize = '0.85em';
      name.textContent = `${track.name}  (${sizeMB} MB)`;

      const del = document.createElement('button');
      del.textContent = 'delete';
      del.className = 'small';
      del.onclick = async () => {
        const deletedKey = 'custom_' + track.id;
        try {
          await deleteTrack(track.id);
        } catch (e) {
          console.error('failed to delete track:', e);
        }
        if (_activeMusicKey === deletedKey) _activeMusicKey = null;
        if (musicSel && musicSel.value === deletedKey) {
          musicSel.value = 'default';
          onChange();
        }
        loadCustomMusicUI();
      };

      row.appendChild(name);
      row.appendChild(del);
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
          const trackName = file.name.replace(/\.[^/.]+$/, '');
          await addTrack(trackName, ev.target.result, file.type);
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
    if (!envelope?.p || !envelope?.h || !envelope?.t)
      return { error: 'invalid format' };
    if (envelope.t !== expectedTag)
      return { error: 'wrong type! expected ' + expectedTag };
    if (simpleHash(envelope.p) !== envelope.h)
      return { error: 'tampered or corrupted! blocked' };
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
    codeEl.textContent = Object.keys(bundle).length
      ? encode(bundle, tag)
      : '(no data)';
    adjustHeight(codeEl);
  }

  function setupShowMore(codeElId, btnElId) {
    const codeEl = el(codeElId),
      btn = el(btnElId);
    if (!codeEl || !btn) return () => {};
    let expanded = false;
    const check = () => {
      btn.style.display =
        codeEl.scrollHeight > codeEl.clientHeight + 4 ? 'inline-block' : 'none';
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
    const checkSettings = setupShowMore(
      'settingsTransferCode',
      'showMoreSettingsBtn',
    );

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
        'settings',
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
          Object.keys(result.bundle).forEach((k) =>
            localStorage.setItem(k, result.bundle[k]),
          );
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
    const settingsPage = document.querySelector('#page-6');
    if (
      !legacyShopBtn ||
      !legacySettingsBtn ||
      !legacyShopPopup ||
      !legacySettingsPopup
    )
      return;

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
        settingsMoved = moveToPopup(
          settingsPage,
          legacySettingsPopup,
          settingsMoved,
        );
      } else {
        shopMoved = restoreFromPopup(shopPage, legacyShopPopup, shopMoved);
        settingsMoved = restoreFromPopup(
          settingsPage,
          legacySettingsPopup,
          settingsMoved,
        );
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
      if (
        !legacySettingsPopup.contains(e.target) &&
        e.target !== legacySettingsBtn
      )
        legacySettingsPopup.classList.remove('open');
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  async function init() {
    console.log('[settings] initializing...');
    createPendingBar();
    bindSettings();
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
    applyMusic(savedSettings);
    syncUIToSettings(savedSettings);
    console.log('[settings] initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globals
  window.applySettings = function (settings) {
    savedSettings = { ...savedSettings, ...settings };
    applyVisuals(savedSettings);
    applyMusic(savedSettings);
    syncUIToSettings(savedSettings);
    try {
      localStorage.setItem('userSettings', JSON.stringify(savedSettings));
    } catch (_) {}
  };
  window.getCurrentSettings = getCurrentSettings;
})();
