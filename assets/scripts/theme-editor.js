(function () {
  'use strict';

  const BUILT_IN_PRESETS = [
    {
      name: 'default',
      vars: {
        bgColor: '#0e0e0e', textColor: '#dcdcdc', panelBg: '#111111',
        overlayBg: '#0a0a0a', borderColor: '#2a2a2a', buttonBg: '#1a1a1a',
        accentColor: '#dcdcdc', pointsColor: '#ffb86b',
        achievementBg: '#1a2a1a', achievementBorder: '#2a4a2a'
      },
      settings: { radius: 2, borderWidth: 1, textSize: 16, font: 'default' }
    },
    {
      name: 'material you',
      vars: {
        bgColor: '#1c1b1f', textColor: '#e6e1e5', panelBg: '#2d2c31',
        overlayBg: '#141218', borderColor: '#49454f', buttonBg: '#4a4458',
        accentColor: '#d0bcff', pointsColor: '#ffb4ab',
        achievementBg: '#21005d', achievementBorder: '#d0bcff'
      },
      settings: { radius: 16, borderWidth: 0, textSize: 16, font: 'default' }
    },
    {
      name: 'light',
      vars: {
        bgColor: '#ffffff', textColor: '#0e0e0e', panelBg: '#fafafa',
        overlayBg: '#f5f5f5', borderColor: '#d0d0d0', buttonBg: '#f0f0f0',
        accentColor: '#0e0e0e', pointsColor: '#d97706',
        achievementBg: '#e8f5e8', achievementBorder: '#90c090'
      },
      settings: { radius: 3, borderWidth: 1, textSize: 16, font: 'default' }
    },
    {
      name: 'glassmorphism',
      vars: {
        bgColor: '#0f0e17', textColor: '#fffffe', panelBg: '#1a1a2e',
        overlayBg: '#0d0d1a', borderColor: '#ffffff22', buttonBg: '#ffffff11',
        accentColor: '#a786df', pointsColor: '#f2a65a',
        achievementBg: '#16213e', achievementBorder: '#a786df'
      },
      settings: { radius: 12, borderWidth: 1, textSize: 16, font: 'default' },
      extra: { blurPanels: true }
    },
    {
      name: 'terminal',
      vars: {
        bgColor: '#000000', textColor: '#39ff14', panelBg: '#0a0a0a',
        overlayBg: '#000000', borderColor: '#003300', buttonBg: '#001100',
        accentColor: '#39ff14', pointsColor: '#39ff14',
        achievementBg: '#001a00', achievementBorder: '#39ff14'
      },
      settings: { radius: 0, borderWidth: 1, textSize: 15, font: 'mono' }
    },
    {
      name: 'solarized',
      vars: {
        bgColor: '#fdf6e3', textColor: '#657b83', panelBg: '#eee8d5',
        overlayBg: '#fdf6e3', borderColor: '#93a1a1', buttonBg: '#eee8d5',
        accentColor: '#268bd2', pointsColor: '#cb4b16',
        achievementBg: '#d5e8d4', achievementBorder: '#82b366'
      },
      settings: { radius: 3, borderWidth: 1, textSize: 16, font: 'default' }
    }
  ];

  const STORAGE_KEY = 'themeEditorPresets';
  const ACTIVE_KEY = 'themeEditorActive';

  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
  }

  const IDB_NAME = 'authsrng-theme';
  const IDB_STORE = 'assets';

  function openIDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
      req.onsuccess = e => res(e.target.result);
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

  function el(id) { return document.getElementById(id); }

  function getUserPresets() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveUserPresets(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (_) {}
  }

  function getAllPresets() {
    return [...BUILT_IN_PRESETS, ...getUserPresets()];
  }

  function readEditor() {
    return {
        vars: {
            bgColor: el('te-bgColor').value,
            textColor: el('te-textColor').value,
            panelBg: el('te-panelBg').value,
            overlayBg: el('te-overlayBg').value,
            borderColor: el('te-borderColor').value,
            buttonBg: el('te-buttonBg').value,
            accentColor: el('te-accentColor').value,
            pointsColor: el('te-pointsColor').value,
            achievementBg: el('te-achievementBg').value,
            achievementBorder: el('te-achievementBorder').value
        },
        settings: {
            radius: parseInt(el('te-radius').value, 10),
            borderWidth: parseInt(el('te-borderWidth').value, 10),
            textSize: parseInt(el('te-textSize').value, 10),
            font: el('te-font').value,
            inventoryStyle: el('te-inventoryStyle').value,
            spinnerStyle: el('te-spinnerStyle').value,
            rollBtnSize: el('te-rollBtnSize').value,
            customRollText: el('te-customRollText').value,
            bgPattern: el('te-bgPattern').value,
            season: el('te-season').value,
            particleDensity: el('te-particleDensity').value,
            blurPanels: el('te-blurPanels').checked,
            blurIntensity: parseInt(el('te-blurIntensity').value, 10),
            blurSaturate: parseInt(el('te-blurSaturate').value, 10),
            blurPanelOpacity: parseInt(el('te-blurPanelOpacity').value, 10),
            blurBorderOpacity: parseInt(el('te-blurBorderOpacity').value, 10),
            compactMode: el('te-compactMode').checked,
            hideCursor: el('te-hideCursor').checked,
            hideLuckBreakdown: el('te-hideLuckBreakdown').checked,
            reduceMotion: el('te-reduceMotion').checked,
            highContrast: el('te-highContrast').checked,
            largeTargets: el('te-largeTargets').checked,
            rgb: el('te-rgbBg').checked,
            wacky: el('te-wackyText').checked,
            chaos: el('te-chaosMode').checked,
            confettiThreshold: parseInt(el('te-confettiThreshold').value, 10) || 0,
            rareThreshold: parseInt(el('te-rareThreshold').value, 10) || 1000,
            cutsceneThreshold: parseInt(el('te-cutsceneThreshold').value, 10) || 0,
            bgType: el('te-bgType').value,
            bgGradientFrom: el('te-bgGradientFrom').value,
            bgGradientTo: el('te-bgGradientTo').value,
            bgGradientAngle: parseInt(el('te-bgGradientAngle').value, 10),
            bgGradientType: el('te-bgGradientType').value,
        }
    };
}
  
  function writeEditor(preset) {
    const v = preset.vars || {};
    const s = preset.settings || {};
    const ex = preset.extra || {};

    const colorMap = {
      'te-bgColor': v.bgColor, 'te-textColor': v.textColor,
      'te-panelBg': v.panelBg, 'te-overlayBg': v.overlayBg,
      'te-borderColor': v.borderColor, 'te-buttonBg': v.buttonBg,
      'te-accentColor': v.accentColor, 'te-pointsColor': v.pointsColor,
      'te-achievementBg': v.achievementBg, 'te-achievementBorder': v.achievementBorder
    };
    for (const [id, val] of Object.entries(colorMap)) {
      if (el(id) && val) el(id).value = val;
    }

    if (el('te-radius')) { el('te-radius').value = s.radius ?? 2; el('te-radiusVal').textContent = s.radius ?? 2; }
    if (el('te-borderWidth')) { el('te-borderWidth').value = s.borderWidth ?? 1; el('te-borderWidthVal').textContent = s.borderWidth ?? 1; }
    if (el('te-textSize')) { el('te-textSize').value = s.textSize ?? 16; el('te-textSizeVal').textContent = s.textSize ?? 16; }
    if (el('te-font')) el('te-font').value = s.font || 'default';
    if (el('te-inventoryStyle')) el('te-inventoryStyle').value = s.inventoryStyle || 'compact';
    if (el('te-spinnerStyle')) el('te-spinnerStyle').value = s.spinnerStyle || 'slot';
    if (el('te-rollBtnSize')) el('te-rollBtnSize').value = s.rollBtnSize || 'normal';
    if (el('te-customRollText')) el('te-customRollText').value = s.customRollText || '';
    if (el('te-bgPattern')) el('te-bgPattern').value = s.bgPattern || 'none';
    if (el('te-season')) el('te-season').value = s.season || 'none';
    if (el('te-particleDensity')) el('te-particleDensity').value = s.particleDensity || 'medium';

    if (el('te-bgType')) el('te-bgType').value = s.bgType || 'color';
    if (el('te-bgGradientFrom')) el('te-bgGradientFrom').value = s.bgGradientFrom || '#0e0e0e';
    if (el('te-bgGradientTo')) el('te-bgGradientTo').value = s.bgGradientTo || '#1a1a2e';
    if (el('te-bgGradientAngle')) { el('te-bgGradientAngle').value = s.bgGradientAngle ?? 135; el('te-bgGradientAngleVal').textContent = s.bgGradientAngle ?? 135; }
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
      'te-chaosMode': s.chaos
    };
    for (const [id, val] of Object.entries(checks)) {
      if (el(id)) el(id).checked = !!val;
    }

    if (el('te-confettiThreshold')) el('te-confettiThreshold').value = s.confettiThreshold ?? 0;
    if (el('te-rareThreshold')) el('te-rareThreshold').value = s.rareThreshold ?? 1000;
    if (el('te-cutsceneThreshold')) el('te-cutsceneThreshold').value = s.cutsceneThreshold ?? 0;
    if (el('te-blurPanels')) el('te-blurPanels').checked = !!(s.blurPanels || ex.blurPanels);
    if (el('te-blurIntensity')) { el('te-blurIntensity').value = s.blurIntensity ?? 10; el('te-blurIntensityVal').textContent = s.blurIntensity ?? 10; }
    if (el('te-blurSaturate')) { el('te-blurSaturate').value = s.blurSaturate ?? 140; el('te-blurSaturateVal').textContent = s.blurSaturate ?? 140; }
    if (el('te-blurPanelOpacity')) { el('te-blurPanelOpacity').value = s.blurPanelOpacity ?? 55; el('te-blurPanelOpacityVal').textContent = s.blurPanelOpacity ?? 55; }
    if (el('te-blurBorderOpacity')) { el('te-blurBorderOpacity').value = s.blurBorderOpacity ?? 8; el('te-blurBorderOpacityVal').textContent = s.blurBorderOpacity ?? 8; }
  }

 function applyCSSVars(vars, borderWidth, settings) {
  const root = document.documentElement;
  const bw = (borderWidth ?? 1) + 'px';
  const map = {
    '--bg-color': vars.bgColor,
    '--text-color': vars.textColor,
    '--panel-bg': vars.panelBg,
    '--overlay-bg': vars.overlayBg,
    '--border-color': vars.borderColor,
    '--button-bg': vars.buttonBg,
    '--button-hover': vars.buttonBg,
    '--button-text': vars.textColor,
    '--input-bg': vars.buttonBg,
    '--link-border': vars.borderColor,
    '--accent-color': vars.accentColor,
    '--achievement-bg': vars.achievementBg,
    '--achievement-border': vars.achievementBorder
  };
  for (const [k, v] of Object.entries(map)) {
    if (v) root.style.setProperty(k, v);
  }
  document.querySelectorAll('.shop-item-cost, .potion-cost').forEach(n => {
    n.style.color = vars.pointsColor || '';
  });
  document.querySelectorAll('button, .shop-item, #inventoryList, .page-dots, #notifPanel, .well-container').forEach(n => {
    n.style.borderWidth = bw;
  });
  if (vars.panelBg) {
    const rgb = hexToRgb(vars.panelBg);
    if (rgb) root.style.setProperty('--panel-bg-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
  }
  if (settings) {
    root.style.setProperty('--blur-intensity', (settings.blurIntensity ?? 10) + 'px');
    root.style.setProperty('--blur-saturate', (settings.blurSaturate ?? 140) + '%');
    root.style.setProperty('--blur-panel-opacity', ((settings.blurPanelOpacity ?? 55) / 100).toFixed(2));
    root.style.setProperty('--blur-border-opacity', ((settings.blurBorderOpacity ?? 8) / 100).toFixed(2));
    applyBgStyle(settings, vars.bgColor);
  }
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
      cutsceneThreshold: s.cutsceneThreshold
      bgType: s.bgType,
      bgGradientFrom: s.bgGradientFrom,
      bgGradientTo: s.bgGradientTo,
      bgGradientAngle: s.bgGradientAngle,
      bgGradientType: s.bgGradientType,
    };
  }

  function applyAndSave(editorData, presetName) {
    const v = editorData.vars;
    const s = editorData.settings;

    applyCSSVars(v, s.borderWidth, s);

    const cssRadius = (s.radius ?? 2) + 'px';
    document.documentElement.style.setProperty('--border-radius', cssRadius);
    document.querySelectorAll('button, .shop-item, #inventoryList, .page-dots, #notifPanel, .modal-content, .well-container, .gauntlet-tier, .potion-item, .index-content').forEach(n => {
      n.style.borderRadius = cssRadius;
    });

    const patch = buildSettingsPatch(editorData);
    if (window.applySettings) {
      const existing = window.getCurrentSettings ? window.getCurrentSettings() : {};
      window.applySettings({ ...existing, ...patch });
    }

    try { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ name: presetName || 'custom', editorData })); } catch (_) {}

    const label = el('activeThemeName');
    if (label) label.textContent = 'current: ' + (presetName || 'custom');
    const edLabel = el('themeEditorActiveLabel');
    if (edLabel) edLabel.textContent = presetName || 'custom';
  }

  function renderPresets() {
    const grid = el('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let activeData;
    try { activeData = JSON.parse(localStorage.getItem(ACTIVE_KEY) || '{}'); } catch (_) { activeData = {}; }
    const activeName = activeData.name || 'default';

    getAllPresets().forEach(preset => {
      const isBuiltIn = BUILT_IN_PRESETS.some(p => p.name === preset.name);
      const btn = document.createElement('div');
      btn.style.cssText = 'border:1px solid var(--border-color);border-radius:4px;padding:8px;cursor:pointer;transition:border-color 0.15s;position:relative;';
      if (preset.name === activeName) btn.style.borderColor = 'var(--text-color)';

      const swatchGrid = document.createElement('div');
      swatchGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;height:32px;border-radius:3px;overflow:hidden;margin-bottom:6px;';
      const swatchColors = [
        preset.vars.bgColor, preset.vars.panelBg,
        preset.vars.textColor, preset.vars.accentColor
      ];
      swatchColors.forEach(c => {
        const s = document.createElement('span');
        s.style.cssText = 'display:block;background:' + (c || '#888') + ';';
        swatchGrid.appendChild(s);
      });

      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:0.78em;opacity:0.8;text-align:center;';
      nameEl.textContent = preset.name;

      btn.appendChild(swatchGrid);
      btn.appendChild(nameEl);

      if (!isBuiltIn) {
        const del = document.createElement('button');
        del.textContent = 'x';
        del.className = 'small';
        del.style.cssText = 'position:absolute;top:3px;right:3px;padding:1px 5px;font-size:0.7em;opacity:0.5;';
        del.onclick = (e) => {
          e.stopPropagation();
          const arr = getUserPresets().filter(p => p.name !== preset.name);
          saveUserPresets(arr);
          renderPresets();
        };
        btn.appendChild(del);
      }

      btn.addEventListener('click', () => {
        writeEditor(preset);
        renderPresets();
      });

      grid.appendChild(btn);
    });
  }

  function livePreview() {
    const d = readEditor();
    applyCSSVars(d.vars, d.settings.borderWidth, d.settings);
    const cssRadius = (d.settings.radius ?? 2) + 'px';
    document.documentElement.style.setProperty('--border-radius', cssRadius);
    document.querySelectorAll('button, .shop-item, #inventoryList, .page-dots, .modal-content, .well-container, .gauntlet-tier, .potion-item').forEach(n => {
        n.style.borderRadius = cssRadius;
    });
  }

  function bindEditorInputs() {
    const ids = [
        'te-bgColor','te-textColor','te-panelBg','te-overlayBg','te-borderColor',
        'te-buttonBg','te-accentColor','te-pointsColor','te-achievementBg','te-achievementBorder',
        'te-radius','te-borderWidth','te-textSize','te-font','te-inventoryStyle',
        'te-spinnerStyle','te-rollBtnSize','te-customRollText','te-bgPattern',
        'te-season','te-particleDensity','te-blurPanels','te-blurIntensity',
        'te-blurSaturate','te-blurPanelOpacity','te-blurBorderOpacity',
        'te-compactMode','te-hideCursor','te-hideLuckBreakdown','te-reduceMotion',
        'te-highContrast','te-largeTargets','te-rgbBg','te-wackyText','te-chaosMode',
        'te-confettiThreshold','te-rareThreshold','te-cutsceneThreshold','te-bgType',
        'te-bgGradientFrom','te-bgGradientTo','te-bgGradientAngle','te-bgGradientType'
    ];
    ids.forEach(id => {
        const n = el(id);
        if (!n) return;
        n.addEventListener('input', () => {
            if (id === 'te-radius') el('te-radiusVal').textContent = n.value;
            if (id === 'te-borderWidth') el('te-borderWidthVal').textContent = n.value;
            if (id === 'te-textSize') el('te-textSizeVal').textContent = n.value;
            if (id === 'te-blurIntensity') el('te-blurIntensityVal').textContent = n.value;
            if (id === 'te-blurSaturate') el('te-blurSaturateVal').textContent = n.value;
            if (id === 'te-blurPanelOpacity') el('te-blurPanelOpacityVal').textContent = n.value;
            if (id === 'te-blurBorderOpacity') el('te-blurBorderOpacityVal').textContent = n.value;
            if (id === 'te-bgGradientAngle') el('te-bgGradientAngleVal').textContent = n.value;
            livePreview();
        });
        n.addEventListener('change', livePreview);
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

  function init() {
    const openBtn = el('openThemeEditorBtn');
    const overlay = el('themeEditorOverlay');
    const closeBtn = el('themeEditorClose');
    const applyBtn = el('te-apply');
    const discardBtn = el('te-discard');
    const savePresetBtn = el('saveThemeBtn');
    const importBtn = el('importThemeBtn');
    const exportBtn = el('exportThemeBtn');

    if (!openBtn || !overlay) return;

    let snapshotBeforeOpen = null;

    openBtn.addEventListener('click', () => {
      snapshotBeforeOpen = {
        style: document.documentElement.getAttribute('style') || '',
        bodyStyle: document.body.getAttribute('style') || ''
      };

      let activeData;
      try { activeData = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch (_) { activeData = null; }
      if (activeData && activeData.editorData) {
        writeEditor(activeData.editorData);
      } else {
        writeEditor(BUILT_IN_PRESETS[0]);
      }

      syncBgTypeUI();
      refreshBgImagePreview();

      renderPresets();
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    });

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
      if (window.applySettings && window.getCurrentSettings) {
        const s = window.getCurrentSettings();
        window.applySettings(s);
      }
      closeEditor();
    });

    applyBtn.addEventListener('click', () => {
      const d = readEditor();
      applyAndSave(d, null);
      closeEditor();
    });

    savePresetBtn.addEventListener('click', () => {
      const name = prompt('preset name:');
      if (!name || !name.trim()) return;
      const trimmed = name.trim().toLowerCase();
      if (BUILT_IN_PRESETS.some(p => p.name === trimmed)) { alert('that name is reserved'); return; }
      const arr = getUserPresets().filter(p => p.name !== trimmed);
      arr.push({ name: trimmed, ...readEditor() });
      saveUserPresets(arr);
      renderPresets();
    });

    exportBtn.addEventListener('click', () => {
      const d = readEditor();
      const json = JSON.stringify({ name: 'exported', ...d }, null, 2);
      navigator.clipboard.writeText(json).then(() => alert('theme json copied!')).catch(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = 'authsrng-theme.json';
        a.click();
      });
    });

    importBtn.addEventListener('click', () => {
      const raw = prompt('paste theme json:');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw.trim());
        if (!parsed.vars) { alert('invalid theme json'); return; }
        writeEditor(parsed);
        livePreview();
      } catch (_) { alert('invalid json'); }
    });

    bindEditorInputs();

    const bgUpload = el('te-bgImageUpload');
      if (bgUpload) {
        bgUpload.addEventListener('change', async () => {
          const file = bgUpload.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) { alert('image too large (max 10MB)'); return; }
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
    try { activeData = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch (_) { activeData = null; }
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
