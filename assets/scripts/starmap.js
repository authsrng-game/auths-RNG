// IMAGINE USING THE STARMAP FEATURE LMAO
(function () {
  'use strict';

  const STARMAP_KEY = 'starmapData';

  const VOID_MARKET = [
    {
      id: 'perm_luck_1',
      name: '+0.25x permanent luck',
      type: 'permanent_luck',
      cost: 150,
      desc: 'permanently adds 0.25x to your luck multiplier. stacks up to 20 times.',
      maxStack: 20,
    },
    {
      id: 'crystallized_unlock',
      name: 'Crystallized',
      type: 'rarity_unlock',
      cost: 500,
      desc: 'unlocks the exclusive Crystallized rarity. only obtainable here.',
      oneTime: true,
    },
    {
      id: 'shattered_unlock',
      name: 'Shattered',
      type: 'rarity_unlock',
      cost: 2000,
      desc: 'unlocks the exclusive Shattered rarity. only obtainable here.',
      oneTime: true,
    },
    {
      id: 'star_trail',
      name: 'star trail cursor',
      type: 'cosmetic',
      cost: 300,
      desc: 'your cursor leaves a fading trail of stars.',
      oneTime: true,
    },
    {
      id: 'anomaly_cache',
      name: 'anomaly cache',
      type: 'anomalies',
      cost: 1000,
      desc: 'instantly grants 500 anomalies.',
      oneTime: false,
    },
  ];

  // ── data helpers ─────────────────────────────────────────────────────
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STARMAP_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveData(d) {
    localStorage.setItem(STARMAP_KEY, JSON.stringify(d));
  }
  function getData() {
    return Object.assign(
      {
        constellations: [],
        voidShards: 0,
        lastShardCalc: Date.now(),
        shopPurchases: {},
        permanentLuckStacks: 0,
        voidMarketLuck: 0,
      },
      loadData(),
    );
  }

  // ── shard generation ─────────────────────────────────────────────────
  function shardsPerHourForStar(chance) {
    return Math.max(0.05, Math.log10(Math.round(1 / chance)));
  }

  function totalShardsPerHour(constellations) {
    let total = 0;
    constellations.forEach((c) =>
      c.stars.forEach((s) => {
        total += shardsPerHourForStar(s.chance);
      }),
    );
    return total;
  }

  function accrueShards(d) {
    if (!d.constellations?.length) return d;
    const now = Date.now();
    // use 0 explicitly — if lastShardCalc was never set, full elapsed since epoch
    // would be wrong, so cap to a sane max of 24h to avoid absurd catch-up grants
    const last = d.lastShardCalc > 0 ? d.lastShardCalc : now;
    const elapsed = Math.min((now - last) / 3600000, 24); // cap at 24h
    d.voidShards =
      (d.voidShards || 0) + totalShardsPerHour(d.constellations) * elapsed;
    d.lastShardCalc = now;
    return d;
  }
  // ── star positioning (seeded from rarity name) fuck ────────────────────────
  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++)
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function seededPos(name, index) {
    const h = hashStr(name + '_' + index);
    const x = ((h * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    const y = ((h * 22695477 + 1) >>> 0) / 0xffffffff;
    return { x, y };
  }

  // ── draw constellation on canvas ─────────────────────────────────────
  function drawConstellation(canvas, stars) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);

    if (!stars?.length) return;

    const positions = stars.map((s, i) => {
      const p = seededPos(s.name, i);
      return { x: 12 + p.x * (W - 24), y: 10 + p.y * (H - 20), star: s };
    });

    // connection lines
    ctx.strokeStyle = 'rgba(150,150,255,0.12)';
    ctx.lineWidth = 0.6;
    positions.forEach((p, i) => {
      const nearest = positions
        .map((q, j) => ({ j, dist: Math.hypot(q.x - p.x, q.y - p.y) }))
        .filter((e) => e.j !== i)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);
      nearest.forEach(({ j, dist }) => {
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.stroke();
        }
      });
    });

    // stars
    positions.forEach(({ x, y, star }) => {
      const denom = Math.round(1 / star.chance);
      const mag = Math.log10(Math.max(1, denom));
      const r = Math.min(4.5, 0.7 + mag * 0.38);
      const alpha = Math.min(0.95, 0.25 + mag * 0.068);

      if (mag > 3) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
        grd.addColorStop(0, `rgba(190,190,255,${alpha * 0.35})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(225,225,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── exposed globally ─────────────────────────────────────────────────
  window.getStarmapLuckBonus = function () {
    const d = getData();
    return 1 + (d.permanentLuckStacks || 0) * 0.25 + (d.voidMarketLuck || 0);
  };

  // Called by gauntlets.js applyReward or the crystallize buttonnnnnnnnnnnnnnnnnnnn
  window.crystallize = function () {
    if (inventoryData.size === 0) {
      window.showAlert?.(
        'nothing to crystallize! collect some rarities first.',
      );
      return null;
    }
    const rolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
    if (rolls < 100) {
      window.showAlert?.('need at least 100 rolls to crystallize!');
      return null;
    }

    const stars = [];
    for (const [name, { rarityObj }] of inventoryData.entries()) {
      stars.push({ name, chance: rarityObj.chance });
    }
    stars.sort((a, b) => a.chance - b.chance);

    const d = getData();
    accrueShards(d);

    const idx = d.constellations.length + 1;
    const c = {
      id: 'c_' + Date.now(),
      index: idx,
      createdAt: Date.now(),
      totalRolls: rolls,
      playtime: typeof totalSeconds !== 'undefined' ? totalSeconds : 0,
      stars,
      shardsPerHour: stars.reduce(
        (s, st) => s + shardsPerHourForStar(st.chance),
        0,
      ),
    };

    d.constellations.push(c);
    d.permanentLuckStacks = (d.permanentLuckStacks || 0) + 1;
    saveData(d);

    window.applyStarmapLuck?.();
    return c;
  };

  // ── render ────────────────────────────────────────────────────────────
  function renderStarmap() {
    const container = document.getElementById('starmapContainer');
    if (!container) return;

    const unlocked = localStorage.getItem('starmapUnlocked') === '1';

    if (!unlocked) {
      container.innerHTML = `
        <div class="starmap-locked">
          <div class="starmap-locked-icon">✦</div>
          <div class="starmap-locked-text">starmap is locked</div>
          <div class="starmap-locked-sub">complete the oblivion gauntlet to unlock</div>
        </div>`;
      return;
    }

    const d = getData();
    accrueShards(d);
    saveData(d);

    const shards = Math.floor(d.voidShards || 0);
    const rate = totalShardsPerHour(d.constellations);
    const rolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
    const canCrystallize =
      rolls >= 100 &&
      typeof inventoryData !== 'undefined' &&
      inventoryData.size > 0;

    container.innerHTML = '';

    // ── stats bar ──
    const stats = document.createElement('div');
    stats.className = 'starmap-stats';
    stats.innerHTML = `
      <div class="starmap-stat">
        <div class="starmap-stat-label">void shards</div>
        <div class="starmap-stat-value" id="starmapShardCount">${fmt(shards)} ✦</div>
      </div>
      <div class="starmap-stat">
        <div class="starmap-stat-label">rate</div>
        <div class="starmap-stat-value">${rate.toFixed(2)}/hr</div>
      </div>
      <div class="starmap-stat">
        <div class="starmap-stat-label">constellations</div>
        <div class="starmap-stat-value">${d.constellations.length}</div>
      </div>
      <div class="starmap-stat">
        <div class="starmap-stat-label">prestige luck</div>
        <div class="starmap-stat-value">+${(window.getStarmapLuckBonus() - 1).toFixed(2)}x</div>
      </div>
    `;
    container.appendChild(stats);

    // ── crystallize section ──
    const section = document.createElement('div');
    section.className = 'starmap-crystallize-section';
    section.innerHTML = `
      <div class="starmap-crystallize-desc">
        freeze your current inventory into a permanent constellation that generates void shards forever.
        <span class="starmap-crystallize-note">inventory clears. rolls, points and upgrades are kept.</span>
      </div>
      <button id="crystallizeBtn" class="starmap-crystallize-btn" ${canCrystallize ? '' : 'disabled'}>
        ✦ crystallize run
      </button>
      ${!canCrystallize ? '<div class="starmap-crystallize-hint">need 100+ rolls and at least 1 rarity</div>' : ''}
    `;
    container.appendChild(section);

    document.getElementById('crystallizeBtn')?.addEventListener('click', () => {
      if (typeof showConfirmModal === 'function') {
        showConfirmModal(
          '✦ crystallize run',
          'your inventory will be cleared and crystallized. rolls, points, and upgrades are kept.',
          () => {
            const c = window.crystallize();
            if (!c) return;
            window.doCrystallizeReset?.();
            renderStarmap();
            if (typeof showAnomalyPopup === 'function')
              showAnomalyPopup(
                `✦ constellation #${c.index} created! +0.25x luck`,
              );
          },
        );
      }
    });

    // ── constellations ──
    const constSection = document.createElement('div');
    constSection.className = 'starmap-section';

    const constLabel = document.createElement('div');
    constLabel.className = 'starmap-section-label';
    constLabel.textContent = d.constellations.length
      ? 'your constellations'
      : 'no constellations yet';
    constSection.appendChild(constLabel);

    if (d.constellations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'starmap-empty';
      empty.textContent = 'crystallize your first run to begin.';
      constSection.appendChild(empty);
    } else {
      [...d.constellations].reverse().forEach((c) => {
        constSection.appendChild(buildConstellationCard(c));
      });
    }
    container.appendChild(constSection);

    // ── void market ──
    const market = document.createElement('div');
    market.className = 'starmap-section';

    const marketLabel = document.createElement('div');
    marketLabel.className = 'starmap-section-label';
    marketLabel.textContent = '✦ void market';
    market.appendChild(marketLabel);

    VOID_MARKET.forEach((item) =>
      market.appendChild(buildMarketItem(item, d, shards)),
    );
    container.appendChild(market);
  }

  function buildConstellationCard(c) {
    const card = document.createElement('div');
    card.className = 'starmap-constellation-card';

    const date = new Date(c.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const rarest = c.stars[0];
    const rarestDenom = rarest ? Math.round(1 / rarest.chance) : 0;

    card.innerHTML = `
      <div class="constellation-header">
        <span class="constellation-name">constellation #${c.index}</span>
        <span class="constellation-date">${date}</span>
      </div>
    `;

    const canvas = document.createElement('canvas');
    canvas.className = 'constellation-canvas';
    canvas.width = 300;
    canvas.height = 110;
    card.appendChild(canvas);
    setTimeout(() => drawConstellation(canvas, c.stars), 0);

    const statsEl = document.createElement('div');
    statsEl.className = 'constellation-stats';
    statsEl.innerHTML = `
      <span>${c.stars.length} stars</span>
      <span>rarest: 1/${fmt(rarestDenom)}</span>
      <span>${c.shardsPerHour.toFixed(2)} ✦/hr</span>
      <span>${fmt(c.totalRolls)} rolls</span>
    `;
    card.appendChild(statsEl);
    return card;
  }

  function buildMarketItem(item, d, shards) {
    const el = document.createElement('div');
    el.className = 'starmap-market-item';

    const bought = d.shopPurchases?.[item.id] || 0;
    const maxed =
      (item.oneTime && bought > 0) ||
      (item.maxStack && bought >= item.maxStack);
    const canAfford = shards >= item.cost;
    const disabled = maxed || !canAfford;

    el.innerHTML = `
      <div class="market-item-info">
        <div class="market-item-name">${item.name}</div>
        <div class="market-item-desc">${item.desc}</div>
        ${item.maxStack ? `<div class="market-item-stack">${bought}/${item.maxStack}</div>` : ''}
      </div>
      <div class="market-item-right">
        <div class="market-item-cost">${fmt(item.cost)} ✦</div>
        <button class="small market-buy-btn" ${disabled ? 'disabled' : ''}>${maxed ? 'owned' : 'buy'}</button>
      </div>
    `;

    if (!disabled) {
      el.querySelector('.market-buy-btn').addEventListener('click', () =>
        buyItem(item),
      );
    }
    return el;
  }

  function buyItem(item) {
    const d = getData();
    accrueShards(d);
    if (Math.floor(d.voidShards) < item.cost) {
      window.showAlert?.(`need ${fmt(item.cost)} void shards!`);
      return;
    }
    d.voidShards -= item.cost;
    d.shopPurchases = d.shopPurchases || {};
    d.shopPurchases[item.id] = (d.shopPurchases[item.id] || 0) + 1;

    if (item.type === 'permanent_luck') {
      d.voidMarketLuck = (d.voidMarketLuck || 0) + 0.25;
      window.applyStarmapLuck?.();
      showAnomalyPopup?.('✦ +0.25x permanent luck!');
    } else if (item.type === 'rarity_unlock') {
      localStorage.setItem('voidUnlock_' + item.id, '1');
      showAnomalyPopup?.(`✦ ${item.name} unlocked!`);
    } else if (item.type === 'cosmetic') {
      localStorage.setItem('cosmeticUnlock_' + item.id, '1');
      showAnomalyPopup?.(`✦ ${item.name} unlocked!`);
      if (item.id === 'star_trail') initStarTrail();
    } else if (item.type === 'anomalies') {
      if (typeof anomalies !== 'undefined') {
        anomalies += 500;
        if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
        if (typeof saveAllData === 'function') saveAllData();
        showAnomalyPopup?.('✦ +500 anomalies!');
      }
    }

    saveData(d);
    renderStarmap();
  }

  function initStarTrail() {
    if (window._starTrailActive) return;
    window._starTrailActive = true;
    document.addEventListener('mousemove', (e) => {
      if (!localStorage.getItem('cosmeticUnlock_star_trail')) return;
      const dot = document.createElement('div');
      dot.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:3px;height:3px;
        background:rgba(200,200,255,0.75);border-radius:50%;pointer-events:none;z-index:2147483640;
        transform:translate(-50%,-50%);transition:opacity 0.5s,transform 0.5s;`;
      document.body.appendChild(dot);
      setTimeout(() => {
        dot.style.opacity = '0';
        dot.style.transform = 'translate(-50%,-50%) scale(0)';
      }, 30);
      setTimeout(() => dot.remove(), 560);
    });
  }

  function fmt(n) {
    return typeof window.formatNum === 'function'
      ? window.formatNum(n)
      : String(Math.round(n));
  }

  // Shard tick every 60s
  setInterval(() => {
    const d = getData();
    if (!d.constellations?.length) return;
    accrueShards(d);
    saveData(d);
    const el = document.getElementById('starmapShardCount');
    if (el) el.textContent = fmt(Math.floor(d.voidShards)) + ' ✦';
  }, 60000);

  window.renderStarmap = renderStarmap;

  // init star trail if already owned
  if (localStorage.getItem('cosmeticUnlock_star_trail')) initStarTrail();

  // wait for DOM
  function tryInit(n) {
    if (document.getElementById('starmapContainer')) renderStarmap();
    else if (n > 0) setTimeout(() => tryInit(n - 1), 200);
  }
  tryInit(25);
})();
