(function () {
  'use strict';

  const MUTATIONS_KEY = 'mutationsUnlocked';
  const MUTATION_HISTORY_KEY = 'mutationHistory';
  const MUTATION_HISTORY_MAX = 50;

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(MUTATION_HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }
  function saveHistory(h) {
    try {
      localStorage.setItem(MUTATION_HISTORY_KEY, JSON.stringify(h));
    } catch {}
  }
  function addToHistory(nameA, nameB, result, wasGood) {
    const h = loadHistory();
    h.unshift({
      a: nameA,
      b: nameB,
      result: result.name,
      good: wasGood,
      ts: Date.now(),
    });
    if (h.length > MUTATION_HISTORY_MAX) h.pop();
    saveHistory(h);
  }
  function renderHistory() {
    const el = document.getElementById('mutationHistory');
    if (!el) return;
    const h = loadHistory();
    if (h.length === 0) {
      el.innerHTML =
        '<div style="opacity:0.35;text-align:center;padding:16px;font-size:0.8em;">no mutations yet</div>';
      return;
    }
    el.innerHTML = h
      .map((e) => {
        const d = new Date(e.ts);
        const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `<div class="mutation-history-entry ${e.good ? 'mh-good' : 'mh-bad'}">
      <div class="mh-formula">${e.a} + ${e.b}</div>
      <div class="mh-result">${e.good ? '✨' : '💀'} ${e.result}</div>
      <div class="mh-time">${time}</div>
    </div>`;
      })
      .join('');
  }
  const MUTATION_COOLDOWN = 30000;

  const EXCLUDED_NAMES = new Set([
    'SUMMER',
    'finished.',
    'pseudopseudohypoparathyroidism',
    '...',
    'the world',
    'Antimatter',
  ]);
  const EXCLUDED_COUNT = 6;

  let lastMutationTime = 0;

  function isUnlocked() {
    return localStorage.getItem(MUTATIONS_KEY) === '1';
  }

  function getInventoryRarities() {
    if (typeof inventoryData === 'undefined') return [];
    return Array.from(inventoryData.values())
      .map((d) => d.rarityObj)
      .filter((r) => !EXCLUDED_NAMES.has(r.name));
  }

  function getRarityIndex(name) {
    if (typeof rarities === 'undefined') return -1;
    return rarities.findIndex((r) => r.name === name);
  }

  // deterministic pair bias — same two rarities always skew the same way
  function hashPair(nameA, nameB) {
    const s = [nameA, nameB].sort().join('|');
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return ((h >>> 0) % 100) / 100; // 0–1 unique per pair
  }

  function rng() {
    return typeof Beacon !== 'undefined' ? Beacon.float() : Math.random();
  }

  function mutate(nameA, nameB) {
    if (typeof rarities === 'undefined') return null;
    const idxA = getRarityIndex(nameA);
    const idxB = getRarityIndex(nameB);
    if (idxA === -1 || idxB === -1) return null;

    const betterIdx = Math.min(idxA, idxB);
    const worseIdx = Math.max(idxA, idxB);

    // base 65% bad / 35% good; rarer inputs improve odds; pair bias ±8%
    const rarityBonus = Math.max(0, (400 - worseIdx) / 400) * 0.25;
    const pairBias = (hashPair(nameA, nameB) - 0.5) * 0.16; // ±8%
    const goodChance = Math.min(0.75, 0.35 + rarityBonus + pairBias);

    let targetIdx;

    if (rng() >= goodChance) {
      // bad: more common than worse input
      const minBad = worseIdx + 1;
      const maxBad = Math.min(rarities.length - 1, worseIdx + 45);
      targetIdx =
        minBad > rarities.length - 1
          ? rarities.length - 1
          : minBad + Math.floor(rng() * (maxBad - minBad + 1));
    } else {
      // good: rarer than better input, capped above excluded tier
      const maxGood = Math.max(EXCLUDED_COUNT, betterIdx - 1);
      if (maxGood <= EXCLUDED_COUNT) {
        // inputs are already near the ceiling — still give something near top
        targetIdx = EXCLUDED_COUNT + Math.floor(rng() * 15);
      } else {
        // power curve: biased toward less extreme (not always jackpot)
        const t = Math.pow(rng(), 2.0);
        targetIdx = Math.floor(EXCLUDED_COUNT + t * (maxGood - EXCLUDED_COUNT));
      }
    }

    targetIdx = Math.max(
      EXCLUDED_COUNT,
      Math.min(rarities.length - 1, targetIdx),
    );
    return rarities[targetIdx];
  }

  function renderMutations() {
    const container = document.getElementById('mutationsContainer');
    if (!container) return;

    if (!isUnlocked()) {
      container.innerHTML = `
        <div style="text-align:center;opacity:0.4;margin-top:48px;">
          <div style="font-size:2.2em;margin-bottom:14px;">🧬</div>
          <div style="font-size:0.9em;">complete the eon gauntlet to unlock mutations</div>
        </div>`;
      return;
    }

    const invRarities = getInventoryRarities();
    if (invRarities.length < 2) {
      container.innerHTML = `<div style="text-align:center;opacity:0.5;margin-top:40px;">you need at least 2 non-excluded rarities to mutate!</div>`;
      return;
    }

    const options = invRarities
      .map((r) => {
        const d = Math.round(1 / r.chance);
        return `<option value="${r.name}">${r.name} (1/${d.toLocaleString()})</option>`;
      })
      .join('');

    container.innerHTML = `
      <div class="mutation-panel">
        <div class="mutation-subtitle">combine two rarities for an unpredictable result</div>
        <div class="mutation-odds">≈65% worse · ≈35% better &nbsp;|&nbsp; rarer inputs improve odds</div>

        <div class="mutation-selectors">
          <div class="mutation-slot">
            <div class="mutation-slot-label">rarity A</div>
            <select id="mutateSelectA" class="mutation-select">${options}</select>
          </div>
          <div class="mutation-plus">🧬</div>
          <div class="mutation-slot">
            <div class="mutation-slot-label">rarity B</div>
            <select id="mutateSelectB" class="mutation-select">${options}</select>
          </div>
        </div>

        <button id="mutateBtn" class="mutation-btn">mutate</button>
        <div id="mutationCooldown" class="mutation-cooldown"></div>
        <div id="mutationResult"></div>
      </div>`;

    const selB = document.getElementById('mutateSelectB');
    if (selB && selB.options.length > 1) selB.selectedIndex = 1;

    document.getElementById('mutateBtn').addEventListener('click', doMutation);

    // history notebook
    const histSection = document.createElement('div');
    histSection.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;margin-bottom:8px;">
        <div style="font-size:0.8em;opacity:0.5;">mutation log</div>
        <button class="small" id="clearMutationHistory" style="opacity:0.4;font-size:0.72em;">clear</button>
      </div>
      <div id="mutationHistory" class="mutation-history"></div>`;
    container.appendChild(histSection);
    document.getElementById('clearMutationHistory').onclick = () => {
      saveHistory([]);
      renderHistory();
    };
    renderHistory();
    updateCooldownDisplay();
  }

  function updateCooldownDisplay() {
    const cdEl = document.getElementById('mutationCooldown');
    const btn = document.getElementById('mutateBtn');
    if (!cdEl || !btn) return;
    const rem = MUTATION_COOLDOWN - (Date.now() - lastMutationTime);
    if (rem > 0) {
      btn.disabled = true;
      cdEl.textContent = `cooldown: ${Math.ceil(rem / 1000)}s`;
      setTimeout(updateCooldownDisplay, 1000);
    } else {
      btn.disabled = false;
      cdEl.textContent = '';
    }
  }

  function doMutation() {
    const selA = document.getElementById('mutateSelectA');
    const selB = document.getElementById('mutateSelectB');
    if (!selA || !selB) return;

    const nameA = selA.value;
    const nameB = selB.value;

    if (nameA === nameB) {
      if (typeof showAnomalyPopup === 'function')
        showAnomalyPopup('pick two different rarities!');
      return;
    }

    const result = mutate(nameA, nameB);
    if (!result) return;

    lastMutationTime = Date.now();

    const idxA = getRarityIndex(nameA);
    const idxB = getRarityIndex(nameB);
    const resultIdx = getRarityIndex(result.name);
    const wasGood = resultIdx < Math.min(idxA, idxB);

    const onDone = () => {
      addToHistory(nameA, nameB, result, wasGood);
      renderHistory();
      updateCooldownDisplay();
      if (typeof saveAllData === 'function') saveAllData();
    };

    if (typeof showRollChoice === 'function') {
      showRollChoice(result, onDone);
    } else {
      if (typeof addToInventory === 'function') addToInventory(result);
      onDone();
    }

    const denom = Math.round(1 / result.chance);
    const resultEl = document.getElementById('mutationResult');
    if (resultEl) {
      resultEl.innerHTML = `
      <div class="mutation-result ${wasGood ? 'result-good' : 'result-bad'}">
        <div class="mutation-result-quality">${wasGood ? '✨ better!' : '💀 worse...'}</div>
        <div class="mutation-result-name">${result.name}</div>
        <div class="mutation-result-chance">1/${denom.toLocaleString()}</div>
      </div>`;
    }
  }

  window.renderMutations = renderMutations;

  function tryInit(n) {
    if (typeof inventoryData !== 'undefined' && inventoryData instanceof Map)
      renderMutations();
    else if (n > 0) setTimeout(() => tryInit(n - 1), 100);
  }
  tryInit(30);
})();
