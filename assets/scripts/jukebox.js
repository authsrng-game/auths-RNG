(function () {
  'use strict';

  // ── Inject styles >:DDDDDDDDDDDDDD ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #jukebox {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 10001;
      display: flex;
      align-items: center;
      pointer-events: none;
    }

    #jb-disc {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: conic-gradient(
        #1c1c1c 0deg, #2e2e2e 45deg, #0f0f0f 100deg,
        #252525 160deg, #0a0a0a 210deg, #2a2a2a 270deg,
        #141414 320deg, #1c1c1c 360deg
      );
      border: 1.5px solid #3a3a3a;
      position: relative;
      cursor: pointer;
      pointer-events: auto;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      opacity: 0.22;
      transition: opacity 0.4s ease, box-shadow 0.2s;
    }

    /* iridescent shimmer ring */
    #jb-disc::before {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: conic-gradient(
        rgba(255,255,255,0.07) 0deg,
        rgba(255,255,255,0.01) 90deg,
        rgba(255,255,255,0.09) 180deg,
        rgba(255,255,255,0.02) 270deg,
        rgba(255,255,255,0.07) 360deg
      );
      pointer-events: none;
    }

    /* center hole */
    #jb-disc::after {
      content: '';
      position: absolute;
      top: 50%; left: 50%;
      width: 8px; height: 8px;
      background: var(--bg-color, #0e0e0e);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      border: 1.5px solid #484848;
    }

    #jb-disc.jb-active {
      opacity: 1;
      box-shadow: 0 2px 14px rgba(0,0,0,0.6);
    }

    #jb-disc.jb-spinning {
      animation: jb-spin 2.8s linear infinite;
    }

    @keyframes jb-spin { to { transform: rotate(360deg); } }

    #jb-disc:hover {
      box-shadow: 0 2px 18px rgba(220,220,220,0.1);
    }

    /* eq bars — sibling overlay, doesn't rotate with disc */
    #jb-eq {
      position: absolute;
      left: 0; top: 0;
      width: 38px; height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      padding-bottom: 7px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1;
    }

    #jb-disc.jb-spinning + #jb-eq {
      opacity: 0.6;
    }

    .jb-bar {
      width: 2px;
      background: var(--text-color, #dcdcdc);
      border-radius: 1px;
    }

    .jb-bar:nth-child(1) { animation: jb-eq1 0.55s ease infinite alternate; }
    .jb-bar:nth-child(2) { animation: jb-eq1 0.38s ease 0.08s infinite alternate; }
    .jb-bar:nth-child(3) { animation: jb-eq1 0.65s ease 0.03s infinite alternate; }

    @keyframes jb-eq1 {
      from { height: 2px; opacity: 0.5; }
      to   { height: 8px; opacity: 1; }
    }

    /* panel */
    #jb-panel {
      background: var(--panel-bg, #111);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: 5px;
      padding: 5px 10px 5px 8px;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-left: 7px;
      white-space: nowrap;
      opacity: 0;
      transform: translateX(-6px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    #jb-panel.jb-open {
      opacity: 1;
      transform: translateX(0) scale(1);
      pointer-events: auto;
    }

    #jb-name {
      font-family: monospace;
      font-size: 0.7em;
      color: var(--text-color, #dcdcdc);
      opacity: 0.6;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jb-btn {
      background: none;
      border: 1px solid var(--border-color, #333);
      color: var(--text-color, #dcdcdc);
      width: 22px;
      height: 22px;
      padding: 0;
      border-radius: 3px;
      font-size: 8px;
      line-height: 1;
      cursor: pointer !important;
      opacity: 0.5;
      transition: opacity 0.12s, background 0.12s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jb-btn:hover {
      opacity: 1 !important;
      background: var(--button-hover, #222);
    }

    /* don't show over legacy mode buttons */
    body.legacy-mode #jukebox {
      top: 52px;
    }
  `;
  document.head.appendChild(style);

  // ── DOM ────────────────────────────────────────────────────────────────
  // Using a sibling div for eq bars so they don't rotate with the disc
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div id="jukebox">
      <div id="jb-disc"></div>
      <div id="jb-eq">
        <div class="jb-bar"></div>
        <div class="jb-bar"></div>
        <div class="jb-bar"></div>
      </div>
      <div id="jb-panel">
        <button class="jb-btn" id="jb-prev" title="previous">&#9664;&#9664;</button>
        <button class="jb-btn" id="jb-play" title="pause/play">&#9646;&#9646;</button>
        <button class="jb-btn" id="jb-next" title="next">&#9654;&#9654;</button>
        <span id="jb-name">—</span>
      </div>
    </div>
  `,
  );

  // Re-parent #jb-eq so it's absolutely positioned over the disc
  // (inserted as a sibling of disc inside #jukebox, sits on top via z-index)
  const eq = document.getElementById('jb-eq');
  const jukebox = document.getElementById('jukebox');
  jukebox.style.position = 'fixed'; // already handled by CSS, just ensure
  eq.style.position = 'absolute';
  eq.style.left = '14px';
  eq.style.top = '14px';
  // Actually cleaner to just wrap disc+eq together:
  const discWrap = document.createElement('div');
  discWrap.style.cssText =
    'position:relative;width:38px;height:38px;flex-shrink:0;';
  const disc = document.getElementById('jb-disc');
  disc.parentNode.insertBefore(discWrap, disc);
  discWrap.appendChild(disc);
  discWrap.appendChild(eq);
  eq.style.position = 'absolute';
  eq.style.left = '0';
  eq.style.top = '0';
  eq.style.width = '38px';
  eq.style.height = '38px';

  const panel = document.getElementById('jb-panel');
  const nameEl = document.getElementById('jb-name');
  const btnPlay = document.getElementById('jb-play');
  const btnPrev = document.getElementById('jb-prev');
  const btnNext = document.getElementById('jb-next');

  // ── State helpers ──────────────────────────────────────────────────────
  function isPlaying() {
    const a = window.backgroundMusic;
    if (a && !a.paused && a.readyState > 0) return true;
    if (window.customAudioSource) return true;
    return false;
  }

  function isMuted() {
    const n = document.getElementById('muteMusic');
    return n ? n.checked : false;
  }

  function trackName() {
    const sel = document.getElementById('musicSelect');
    if (!sel || sel.selectedIndex < 0) return '—';
    let t = sel.options[sel.selectedIndex].textContent;
    // strip the fucking noise from built-in labels
    t = t.replace(/\s*\(custom\)/gi, '').replace(/\s*\(default\)/gi, '');
    // "Artist - Title" → just Title when long.
    const d = t.indexOf(' - ');
    if (d > -1 && t.length > 28) t = t.slice(d + 3);
    return t.trim() || '—';
  }

  // ── Controls ───────────────────────────────────────────────────────────
  function saveSettings() {
    if (window.applySettings && window.getCurrentSettings)
      window.applySettings(window.getCurrentSettings());
  }

  function skip(delta) {
    const sel = document.getElementById('musicSelect');
    if (!sel || !sel.options.length) return;
    sel.selectedIndex =
      (sel.selectedIndex + delta + sel.options.length) % sel.options.length;
    saveSettings();
  }

  function togglePlay() {
    const m = document.getElementById('muteMusic');
    if (!m) return;
    m.checked = !m.checked;
    saveSettings();
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    const active = !isMuted();
    const playing = isPlaying() && active;

    disc.classList.toggle('jb-active', active);
    disc.classList.toggle('jb-spinning', playing);

    btnPlay.innerHTML = isMuted() ? '&#9654;' : '&#9646;&#9646;';
    btnPlay.title = isMuted() ? 'play' : 'pause';
    nameEl.textContent = trackName();
  }

  // ── Panel open / close ─────────────────────────────────────────────────
  let closeTimer;
  const openPanel = () => {
    clearTimeout(closeTimer);
    panel.classList.add('jb-open');
  };
  const closePanel = () => {
    closeTimer = setTimeout(() => panel.classList.remove('jb-open'), 900);
  };

  discWrap.addEventListener('mouseenter', openPanel);
  discWrap.addEventListener('mouseleave', closePanel);
  panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
  panel.addEventListener('mouseleave', closePanel);

  // tap to toggle on touch
  disc.addEventListener('click', () =>
    panel.classList.contains('jb-open') ? closePanel() : openPanel(),
  );

  // ── Button wiring ──────────────────────────────────────────────────────
  btnPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
    render();
  });
  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    skip(-1);
    render();
  });
  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    skip(1);
    render();
  });

  // ── Poll for external state changes ────────────────────────────────────
  // (e.g. user mutes from settings panel, or a track finishes. i mean this is pretty self explainatory)
  setInterval(render, 700);
  window.addEventListener('load', () => setTimeout(render, 800));
})();
