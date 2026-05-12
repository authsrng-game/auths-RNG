// Language Cheatsheet (in case my clumsy ass forgets)
// color: #HEX               -- set text color instantly
// switch color: #HEX        -- same thing (alias)
// transition color: #HEX    -- smooth 0.4s transition to color
// pulse (fi, hold, fo): #HEX  -- fade IN (fi sec) → hold → fade OUT back to previous
// wait: 1.5                 -- pause 1.5 seconds before next command
// loop { ... }              -- repeat everything inside forever
// -- this is a comment      -- ignored by parser

(function () {
  'use strict';

  // ── Comment stripping ─────────────────────────────────────────────────
  function stripComments(src) {
    return src.replace(/--[^\n]*/g, '');
  }

  // ── Parser ────────────────────────────────────────────────────────────
  // Returns an array of command objects from a style string.
  function parseCommands(src) {
    src = stripComments(src);
    let i = 0;

    function skipWS() {
      while (i < src.length && /\s/.test(src[i])) i++;
    }

    function parseBlock() {
      const block = [];
      while (i < src.length) {
        skipWS();
        if (i >= src.length || src[i] === '}') break;

        // loop { ... }
        if (/^loop\b/.test(src.slice(i))) {
          i += 4;
          skipWS();
          if (src[i] === '{') {
            i++; // consume {
            const inner = parseBlock();
            skipWS();
            if (src[i] === '}') i++; // consume }
            block.push({ type: 'loop', body: inner });
            continue;
          }
        }

        // read one line
        const ls = i;
        while (i < src.length && src[i] !== '\n') i++;
        const line = src.slice(ls, i).trim();
        if (src[i] === '\n') i++;
        if (!line) continue;

        const cmd = parseLine(line);
        if (cmd) block.push(cmd);
      }
      return block;
    }

    return parseBlock();
  }

  const HEX = '#[0-9a-fA-F]{3,8}';

  function parseLine(line) {
    let m;

    // color: #HEX
    m = line.match(new RegExp(`^color:\\s*(${HEX})\\s*$`, 'i'));
    if (m) return { type: 'color', hex: m[1] };

    // switch color: #HEX  (alias for color, kept as a semantic alias)
    m = line.match(new RegExp(`^switch\\s+color:\\s*(${HEX})\\s*$`, 'i'));
    if (m) return { type: 'color', hex: m[1] };

    // transition color: #HEX
    m = line.match(new RegExp(`^transition\\s+color:\\s*(${HEX})\\s*$`, 'i'));
    if (m) return { type: 'transition', hex: m[1] };

    // pulse (fadeIn, hold, fadeOut): #HEX
    m = line.match(
      new RegExp(
        `^pulse\\s*\\(\\s*(\\d*\\.?\\d+)\\s*,\\s*(\\d*\\.?\\d+)\\s*,\\s*(\\d*\\.?\\d+)\\s*\\):\\s*(${HEX})\\s*$`,
        'i',
      ),
    );
    if (m)
      return {
        type: 'pulse',
        fadeIn: +m[1],
        hold: +m[2],
        fadeOut: +m[3],
        hex: m[4],
      };

    // wait: N
    m = line.match(/^wait:\s*(\d*\.?\d+)\s*$/i);
    if (m) return { type: 'wait', seconds: +m[1] };

    return null; // unknown line — silently skip
  }

  // ── Runtime ────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runCommands(el, cmds, signal, state) {
    for (const cmd of cmds) {
      if (signal.aborted) return;
      await execCmd(el, cmd, signal, state);
    }
  }

  async function execCmd(el, cmd, signal, state) {
    if (signal.aborted) return;

    switch (cmd.type) {
      // ── instant color set ──────────────────────────────────────────────
      case 'color':
        state.color = cmd.hex;
        el.style.transition = '';
        el.style.color = cmd.hex;
        break;

      // ── smooth color transition ────────────────────────────────────────
      case 'transition':
        el.style.transition = 'color 0.4s ease';
        el.style.color = cmd.hex;
        state.color = cmd.hex;
        await sleep(400);
        if (!signal.aborted) el.style.transition = '';
        break;

      // ── wait ───────────────────────────────────────────────────────────
      case 'wait':
        await sleep(cmd.seconds * 1000);
        break;

      // ── pulse: fade in → hold → fade out (back to previous color) ─────
      case 'pulse': {
        const orig = state.color || '';

        // fade in
        el.style.transition = cmd.fadeIn > 0 ? `color ${cmd.fadeIn}s ease` : '';
        el.style.color = cmd.hex;
        if (cmd.fadeIn > 0) await sleep(cmd.fadeIn * 1000);
        if (signal.aborted) return;
        el.style.transition = '';

        // hold
        if (cmd.hold > 0) await sleep(cmd.hold * 1000);
        if (signal.aborted) return;

        // fade out back to original color
        el.style.transition =
          cmd.fadeOut > 0 ? `color ${cmd.fadeOut}s ease` : '';
        el.style.color = orig;
        if (cmd.fadeOut > 0) await sleep(cmd.fadeOut * 1000);
        if (!signal.aborted) el.style.transition = '';
        break;
      }

      // ── infinite loop ──────────────────────────────────────────────────
      case 'loop':
        while (!signal.aborted) {
          await runCommands(el, cmd.body, signal, state);
          // safety yield to prevent synchronous infinite loops from hanging the thread
          await sleep(10);
        }
        break;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────
  /**
   * Apply a rarity style string to a DOM element.
   *
   * Returns an AbortController. Call  .abort()  to stop the animation and
   * clean up (the caller is responsible for resetting el.style if needed).
   *
   * Usage:
   *   const ac = window.RarityStyle.apply(el, rarity.style);
   *   // later:
   *   ac.abort();
   * Yada, yada, yada.
   */
  function applyRarityStyle(el, styleStr) {
    const ac = new AbortController();
    if (!styleStr || !styleStr.trim()) return ac;

    let cmds;
    try {
      cmds = parseCommands(styleStr);
    } catch (e) {
      console.warn('[RarityStyle] parse error:', e);
      return ac;
    }

    if (cmds.length === 0) return ac;

    const state = { color: '' }; // tracks current logical color for pulse restore

    (async () => {
      try {
        await runCommands(el, cmds, ac.signal, state);
      } catch (_) {
        /* swallow AbortError and anything else */
      }
    })();

    return ac;
  }

  window.RarityStyle = {
    /** Apply a style string to an element. Returns an AbortController. */
    apply: applyRarityStyle,
    /** Parse only — returns the command AST without running it. */
    parse: parseCommands,
  };
})();
