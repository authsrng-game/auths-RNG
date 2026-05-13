// cleanup.js
// i could've just optimized some parts in existing scripts but ill do the easy way
// might bite me later

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ── spinner div soup ────────────────────────────────────────────────
  // each roll creates 51 spin-item divs. they sit there until the NEXT roll
  // clears them. under auto-roll + hidden tab they can stack hundreds deep and it WILL lag out the game overtime.
  function cleanSpinner() {
    const spinner = $('spinner');
    const rollBtn = $('rollBtn');
    if (!spinner || !rollBtn) return;
    if (rollBtn.disabled) return; // roll mid-flight, leave it alone

    const childCount = spinner.children.length;
    if (childCount > 2) {
      // more than a couple items = stale from a finished roll
      spinner.innerHTML = '';
      spinner.style.transition = 'none';
      spinner.style.transform = 'translateY(0)';
    }
  }

  // ── orphaned confetti canvases ──────────────────────────────────────
  // triggerConfetti() creates a <canvas> and removes it via rAF when done.
  // if the tab goes hidden mid-animation, rAF pauses and the canvas lingers.
  // also guards against stacking multiple confetti runs (every 100 rolls).
  function cleanOrphanedCanvases() {
    document.querySelectorAll('canvas').forEach((c) => {
      if (c.id === 'seasonCanvas') return; // seasonal particles, hands off
      if (!c.id && c.style.position === 'fixed') {
        c.remove();
      }
    });
  }

  // ── new-roll class timeout pileup ──────────────────────────────────
  // updateItem() does setTimeout(() => el.classList.remove('new-roll'), 2000)
  // on EVERY inventory update. at 500ms auto-roll with a big inventory that's
  // hundreds of pending closures all holding li element references.
  // we just strip the class directly; the timeouts still fire but do nothing.
  function cleanNewRollHighlights() {
    document.querySelectorAll('#inventoryList .new-roll').forEach((el) => {
      el.classList.remove('new-roll');
    });
  }

  // ── audio context health ────────────────────────────────────────────
  // browsers suspend AudioContext when a tab goes hidden. suspended contexts
  // prevent completed OscillatorNode/GainNode pairs from being GC'd.
  // resuming it lets the engine clean them up.
  function resumeAudioContext() {
    const ctx = window.audioContext;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state === 'closed') {
      // let playRollSound() recreate it fresh on next roll
      window.audioContext = null;
    }
  }

  // ── active potions display, skip redundant rebuilds ───────────────
  // the setInterval in main.js calls updateActivePotionsDisplay() every 1s
  // unconditionally, creating and destroying DOM nodes even when nothing changed.
  // we wrap it to bail out early when the visible state is identical.
  function patchPotionDisplay() {
    const orig = window.updateActivePotionsDisplay;
    if (typeof orig !== 'function') return; // main.js not loaded yet, retry later

    let lastSnapshot = null;

    window.updateActivePotionsDisplay = function () {
      const ap = window.activePotions || [];
      const dup = window.duplicateRollsLeft || 0;

      // snapshot: type + seconds-remaining (1s resolution is fine for display)
      const snapshot =
        ap
          .map((p) => p.type + ':' + Math.ceil((p.endTime - Date.now()) / 1000))
          .join(',') +
        '|dup:' +
        dup;

      if (snapshot === lastSnapshot) return;
      lastSnapshot = snapshot;
      orig.apply(this, arguments);
    };
  }

  // ── page container height drift ────────────────────────────────────
  // goToPage() sets .page-container height to the active page's scrollHeight.
  // as inventory grows the height goes stale and clips content. we nudge it
  // back if it's drifted more than 80px from reality.
  function fixPageContainerHeight() {
    const container = document.querySelector('.page-container');
    if (!container) return;
    const idx = parseInt(localStorage.getItem('currentPage') || '0', 10);
    const activePage = document.getElementById('page-' + (idx + 1));
    if (!activePage) return;
    const real = activePage.scrollHeight;
    const current = parseInt(container.style.height, 10) || 0;
    if (Math.abs(real - current) > 80) {
      container.style.height = real + 'px';
    }
  }

  // ── stale luck boost overlay ───────────────────────────────────────
  // if the tab was hidden when the 60s boost expired, the overlay stays on
  // because the setInterval that drives updateLuckTimer() was paused.
  // when we return, we check if the timer label is at 0 and force-hide.
  function checkLuckBoostOverlay() {
    const overlay = $('luckBoostOverlay');
    const timerEl = $('luckTimer');
    if (!overlay || overlay.style.display !== 'flex') return;
    if (
      timerEl &&
      (timerEl.textContent === '0' || timerEl.textContent === '')
    ) {
      overlay.style.display = 'none';
    }
  }

  // ── notification storage trim ──────────────────────────────────────
  // addNotification() caps at 200 but older versions may have written more.
  // also purge read notifications older than 7 days to keep LS lean.
  function trimNotifications() {
    const KEY = 'notifications';
    const MAX = 150;
    const STALE_MS = 7 * 24 * 60 * 60 * 1000;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      let arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;

      const now = Date.now();
      arr = arr.filter((n) => !(n.read && now - n.ts > STALE_MS)); // drop old read ones
      if (arr.length > MAX) arr = arr.slice(arr.length - MAX); // hard cap

      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  // ── localStorage size monitor ──────────────────────────────────────
  // inventory JSON + notifications can eat into the 5MB quota over time.
  // warn in console if we're getting close so it's obvious in devtools......
  function checkLocalStorageSize() {
    try {
      let total = 0;
      for (const key of Object.keys(localStorage)) {
        total += ((localStorage.getItem(key) || '').length + key.length) * 2; // utf-16 bytes
      }
      const kb = (total / 1024).toFixed(1);
      window._cleanupLsKB = parseFloat(kb); // expose for devOverlay or console checks
      if (total > 3.5 * 1024 * 1024) {
        console.warn(
          '[cleanup] localStorage at ' +
            kb +
            'KB — getting close to 5MB quota!',
        );
      }
    } catch (_) {}
  }

  // ── scheduler ─────────────────────────────────────────────────────────
  let tick = 0;

  function runCleanup(source) {
    tick++;

    // every 5s
    cleanSpinner();
    cleanOrphanedCanvases();
    resumeAudioContext();
    checkLuckBoostOverlay();

    // every 30s
    if (tick % 6 === 0 || source === 'manual') {
      cleanNewRollHighlights();
      fixPageContainerHeight();
    }

    // every 2min
    if (tick % 24 === 0 || source === 'manual') {
      trimNotifications();
      checkLocalStorageSize();
    }
  }

  // ── visibility-triggered pass ─────────────────────────────────────────
  // returning from a hidden tab is exactly when stale state accumulates.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    cleanSpinner();
    cleanOrphanedCanvases();
    resumeAudioContext();
    checkLuckBoostOverlay();
  });

  // ── init ──────────────────────────────────────────────────────────────
  // wait for window load so main.js (defer) has fully executed
  window.addEventListener('load', () => {
    // patch potion display — retry once if main.js exports aren't ready yet
    if (!patchPotionDisplay()) {
      setTimeout(patchPotionDisplay, 500);
    }
    setInterval(runCleanup, 5_000);
    runCleanup(); // immediate first pass
  });

  // ── manual trigger ────────────────────────────────────────────────────
  // if you're reading this, you're cool. you now have the privilege of knowing the knowledge:
  // call window.forceCleanup() from the eruda console or devOverlay to manually clean up
  window.forceCleanup = function () {
    cleanSpinner();
    cleanOrphanedCanvases();
    cleanNewRollHighlights();
    trimNotifications();
    fixPageContainerHeight();
    checkLocalStorageSize();
    console.log(
      '[cleanup] manual run done!' +
        ' LS: ' +
        (window._cleanupLsKB || '?') +
        'KB' +
        ' | spinner children: ' +
        ($('spinner')?.children.length ?? '?') +
        ' | new-roll els: 0 (just cleared)',
    );
  };
})();
