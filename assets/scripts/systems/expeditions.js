// hm
(function () {
	'use strict';
	console.log(performance.now());

	const EXPED_KEY = 'expeditionData';
	const MAX_SIM_ROLLS = 4000;

	const LENGTHS = [
		{ id: 'short', name: 'short', emoji: ':)', durationMs: 5 * 60000, unlockRolls: 0 },
		{ id: 'long', name: 'long', emoji: ':o', durationMs: 30 * 60000, unlockRolls: 2000 },
		{ id: 'extended', name: 'extended', emoji: '🐢', durationMs: 120 * 60000, unlockRolls: 8000 },
	];

	function isUnlocked() {
		return localStorage.getItem('expeditionsUnlocked') === '1';
	}

	// Generated code starts here on 2026-09-22T00:00:00Z:
	// In-memory cache for expedition state to eliminate redundant synchronous localStorage reads and JSON parses during UI render loops.
	let _cachedExpedData = null;

	function loadData(force = false) {
		if (_cachedExpedData && !force) return _cachedExpedData;
		try {
			_cachedExpedData = Object.assign(
				{ active: null, cooldownUntil: 0 },
				JSON.parse(localStorage.getItem(EXPED_KEY) || '{}')
			);
		} catch {
			_cachedExpedData = { active: null, cooldownUntil: 0 };
		}
		return _cachedExpedData;
	}

	function saveData(d) {
		_cachedExpedData = d;
		localStorage.setItem(EXPED_KEY, JSON.stringify(d));
	}

	window.reloadExpeditionsCache = function () {
		_cachedExpedData = null;
		return loadData(true);
	};
	// Generated code ends here on 2026-09-22T00:00:00Z:

	function fmtTime(ms) {
		return typeof window.formatWellTime === 'function'
			? window.formatWellTime(ms)
			: Math.ceil(ms / 1000) + 's';
	}

	function startExpedition(lengthId, riskMode) {
		const len = LENGTHS.find((l) => l.id === lengthId);
		if (!len) return;
		const d = loadData();
		if (d.active) return;
		if (Date.now() < d.cooldownUntil) return;

		d.active = {
			lengthId,
			startTime: Date.now(),
			duration: len.durationMs,
			riskMode: !!riskMode,
			lockedLuck: typeof globalLuckMultiplier !== 'undefined' ? globalLuckMultiplier : 1,
		};
		saveData(d);
		showAnomalyPopup?.(`⏳ ${len.name} expedition launched!`);
		renderExpeditions();
	}
	window.startExpedition = startExpedition;

	function resolveExpedition(d) {
		const exp = d.active;
		const len = LENGTHS.find((l) => l.id === exp.lengthId);
		const rSpeed = typeof rollSpeed !== 'undefined' ? rollSpeed : 1;
		let numRolls = Math.floor(exp.duration / 1000 / Math.max(0.25, rSpeed));
		if (exp.riskMode) numRolls = Math.floor(numRolls * 0.5);
		numRolls = Math.max(1, Math.min(numRolls, MAX_SIM_ROLLS));

		const effLuck = exp.lockedLuck * (exp.riskMode ? 2 : 1);
		let best = null;
		let anomalyGain = 0;

		for (let i = 0; i < numRolls; i++) {
			const result = Plush.roll(rarities, effLuck, inventoryData, shopUpgrades, false);
			const rarity = result.rarity;
			if (inventoryData.has(rarity.name)) {
				inventoryData.get(rarity.name).count++;
			} else {
				const li = document.createElement('li');
				inventoryData.set(rarity.name, { rarityObj: rarity, count: 1, liElement: li });
			}
			window.rarityTimestamps.set(rarity.name, Date.now());
			if (Plush.denomOf(rarity) > 10000) anomalyGain++;
			if (!best || rarity.chance < best.chance) best = rarity;
		}

		totalRolls += numRolls;
		anomalies += anomalyGain;
		updateTotalRolls();
		updateAnomalyUI();

		inventoryList.innerHTML = '';
		inventoryData.forEach((entry) => {
			updateItem(entry);
			inventoryList.appendChild(entry.liElement);
		});
		updateCollectedCounter();
		if (best) checkAchievements(best);
		saveAllData();

		d.active = null;
		d.cooldownUntil = Date.now() + len.durationMs * 0.5;
		saveData(d);

		showExpeditionSummary(numRolls, best, anomalyGain, len);
	}

	function showExpeditionSummary(numRolls, best, anomalyGain, len) {
		const modal = document.createElement('div');
		modal.style.cssText =
			'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;';
		const denom = best ? Math.round(1 / best.chance).toLocaleString() : '—';
		modal.innerHTML = `
      <div class="modal-content" style="max-width:380px;">
        <h3 style="margin-top:0;">${len.emoji} ${len.name} expedition complete</h3>
        <p style="margin-bottom:0.4em;">rolls gained: <strong>${numRolls.toLocaleString()}</strong></p>
        <p style="margin-bottom:0.4em;">rarest found: <strong>${best ? best.name : 'none'}</strong> ${best ? `(1/${denom})` : ''}</p>
        <p style="margin-bottom:1.2em;">anomalies gained: <strong>${anomalyGain}</strong></p>
        <button class="small" id="expedSummaryClose">nice</button>
      </div>`;
		document.body.appendChild(modal);
		modal.querySelector('#expedSummaryClose').addEventListener('click', () => {
			modal.remove();
			renderExpeditions();
		});
	}

	function renderExpeditions() {
		const container = document.getElementById('expeditionsContainer');
		if (!container) return;

		if (!isUnlocked()) {
			container.innerHTML = `
        <div class="starmap-locked">
          <div class="starmap-locked-icon">⏳</div>
          <div class="starmap-locked-text">expeditions are locked</div>
          <div class="starmap-locked-sub">complete the hard gauntlet to unlock</div>
        </div>`;
			return;
		}

		const d = loadData();
		const rolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;

		if (d.active && Date.now() >= d.active.startTime + d.active.duration) {
			resolveExpedition(d);
			return;
		}

		container.innerHTML = '';

		if (d.active) {
			const remaining = d.active.startTime + d.active.duration - Date.now();
			const len = LENGTHS.find((l) => l.id === d.active.lengthId);
			const pct = Math.min(100, 100 - (remaining / d.active.duration) * 100);
			const box = document.createElement('div');
			box.className = 'expedition-active-box';
			box.innerHTML = `
        <div class="expedition-active-title">${len.emoji} ${len.name} expedition in progress${d.active.riskMode ? ' <span class="expedition-risk-tag">risky</span>' : ''}</div>
        <div class="gauntlet-bar-wrap" style="margin:10px 0;"><div class="gauntlet-bar" style="width:${pct}%;background:#8af;"></div></div>
        <div class="expedition-active-timer">returns in ${fmtTime(Math.max(0, remaining))}</div>
      `;
			container.appendChild(box);
			return;
		}

		if (Date.now() < d.cooldownUntil) {
			const cd = document.createElement('div');
			cd.className = 'expedition-cooldown-box';
			cd.textContent = `expeditions recovering... available in ${fmtTime(d.cooldownUntil - Date.now())}`;
			container.appendChild(cd);
		}

		const onCooldown = Date.now() < d.cooldownUntil;

		LENGTHS.forEach((len) => {
			const locked = rolls < len.unlockRolls;
			const card = document.createElement('div');
			card.className = 'expedition-card' + (locked ? ' expedition-locked' : '');
			card.innerHTML = `
        <div class="expedition-card-header">
          <span class="expedition-card-name">${len.emoji} ${len.name}</span>
          <span class="expedition-card-dur">${fmtTime(len.durationMs)}</span>
        </div>
        ${
					locked
						? `<div class="expedition-card-locked">🔒 unlocks at ${len.unlockRolls.toLocaleString()} rolls</div>`
						: `<div class="expedition-card-desc">sends your current luck (${(typeof globalLuckMultiplier !== 'undefined' ? globalLuckMultiplier : 1).toFixed(1)}x) out rolling. can't roll manually while active.</div>
           <div class="expedition-card-actions">
             <button class="small" data-len="${len.id}" data-risk="0" ${onCooldown ? 'disabled' : ''}>launch</button>
             <button class="small expedition-risk-btn" data-len="${len.id}" data-risk="1" ${onCooldown ? 'disabled' : ''}>risky launch (2x luck, 0.5x rolls)</button>
           </div>`
				}
      `;
			if (!locked) {
				card.querySelectorAll('button[data-len]').forEach((btn) => {
					btn.addEventListener('click', () => {
						const risk = btn.dataset.risk === '1';
						showConfirmModal(
							`${len.emoji} launch ${len.name} expedition?`,
							risk
								? 'risky mode: 2x luck but half the roll count. cannot cancel once started.'
								: 'cannot cancel once started.',
							() => startExpedition(len.id, risk)
						);
					});
				});
			}
			container.appendChild(card);
		});
	}

	window.renderExpeditions = renderExpeditions;
	setInterval(renderExpeditions, 3000);

	function tryInit(n) {
		if (document.getElementById('expeditionsContainer')) renderExpeditions();
		else if (n > 0) setTimeout(() => tryInit(n - 1), 200);
	}
	tryInit(25);
})();
