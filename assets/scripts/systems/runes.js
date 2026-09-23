(function () {
	'use strict';

	console.log(performance.now());

	const RUNES_KEY = 'runesUnlocked';
	const RUNES_DATA_KEY = 'runesData';
	const BLOCKS_KEY = 'runeBlocks';
	const GIFT_KEY = 'runeGift';
	const UPGRADES_KEY = 'runeUpgrades';
	const ELEMENTS = ['water', 'fire', 'earth', 'wizardry'];
	const ELEMENT_EMOJI = {
		water: '💧',
		fire: '🔥',
		earth: '🌍',
		wizardry: '🔮',
	};
	const RUNE_DROP_CHANCES = [
		{ weight: 1, label: 'rare' },
		{ weight: (1 / 70) * 30, label: 'mid-rare' },
		{ weight: (1 / 140) * 30, label: 'common' },
	];

	let runesData = { counts: {}, elementals: {}, totalDropped: 0 };
	let blocks = 0;
	let gift = null;
	let upgrades = {
		tripleLuck: false,
		moreBlocks: false,
		anomalyMachine: false,
		dopamineAttack: false,
		doubleClover: false,
	};

	let anomalyMachineInterval = null;
	let dopamineAttackInterval = null;
	let giftWealthInterval = null;
	let linkAnimationActive = false;

	function isUnlocked() {
		return localStorage.getItem(RUNES_KEY) === '1';
	}

	function loadData() {
		try {
			const d = JSON.parse(localStorage.getItem(RUNES_DATA_KEY) || '{}');
			runesData = {
				counts: d.counts || {},
				elementals: d.elementals || {},
				totalDropped: d.totalDropped || 0,
			};
		} catch (_) {}
		blocks = parseFloat(localStorage.getItem(BLOCKS_KEY) || '0');
		gift = localStorage.getItem(GIFT_KEY) || null;
		try {
			const u = JSON.parse(localStorage.getItem(UPGRADES_KEY) || '{}');
			upgrades = Object.assign(
				{
					tripleLuck: false,
					moreBlocks: false,
					anomalyMachine: false,
					dopamineAttack: false,
					doubleClover: false,
				},
				u
			);
		} catch (_) {}
	}

	function saveData() {
		localStorage.setItem(RUNES_DATA_KEY, JSON.stringify(runesData));
		localStorage.setItem(BLOCKS_KEY, String(blocks));
		if (gift) localStorage.setItem(GIFT_KEY, gift);
		localStorage.setItem(UPGRADES_KEY, JSON.stringify(upgrades));
	}

	function getRarityTier(rarityObj) {
		const denom = Math.round(1 / rarityObj.chance);
		if (denom >= 1000) return 'rare';
		if (denom >= 70) return 'mid-rare';
		return 'common';
	}

	function getDropChance(tier) {
		if (tier === 'rare') return 1 / 30;
		if (tier === 'mid-rare') return 1 / 70;
		return 1 / 140;
	}

	function rng() {
		return typeof Beacon !== 'undefined' ? Beacon.float() : Math.random();
	}

	function tryDropRune(rarityObj) {
		if (!isUnlocked()) return;
		const tier = getRarityTier(rarityObj);
		const chance = getDropChance(tier);
		if (rng() > chance) return;

		const isElemental = rng() < 1 / 20;

		if (isElemental) {
			const el = ELEMENTS[Math.floor(rng() * ELEMENTS.length)];
			runesData.elementals[el] = (runesData.elementals[el] || 0) + 1;
			runesData.totalDropped++;
			saveData();
			if (typeof showAnomalyPopup === 'function')
				showAnomalyPopup(`${ELEMENT_EMOJI[el]} elemental rune: ${el}!`);
			checkElementalCompletion();
		} else {
			runesData.counts[tier] = (runesData.counts[tier] || 0) + 1;
			runesData.totalDropped++;
			saveData();
			if (typeof showAnomalyPopup === 'function') showAnomalyPopup(`🔷 ${tier} rune dropped!`);
		}

		renderRunes();
	}

	function checkElementalCompletion() {
		const collected = ELEMENTS.filter((el) => (runesData.elementals[el] || 0) > 0);
		if (collected.length < 4 || gift || linkAnimationActive) return;
		linkAnimationActive = true;
		playLinkAnimation();
	}

	function playLinkAnimation() {
		const overlay = document.createElement('div');
		overlay.id = 'runeLinkOverlay';
		overlay.style.cssText =
			'position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;';

		const title = document.createElement('div');
		title.style.cssText =
			'font-family:monospace;font-size:1.4em;color:#fff;opacity:0;transition:opacity 1s;';
		title.textContent = 'the elements converge...';
		overlay.appendChild(title);

		const runeRow = document.createElement('div');
		runeRow.style.cssText = 'display:flex;gap:32px;font-size:3em;';
		overlay.appendChild(runeRow);

		document.body.appendChild(overlay);

		setTimeout(() => {
			title.style.opacity = '1';
		}, 200);

		let i = 0;
		const interval = setInterval(() => {
			const el = ELEMENTS[i];
			const span = document.createElement('span');
			span.textContent = ELEMENT_EMOJI[el];
			span.style.cssText = 'opacity:0;transition:opacity 0.6s,transform 0.6s;transform:scale(0.5);';
			runeRow.appendChild(span);
			setTimeout(() => {
				span.style.opacity = '1';
				span.style.transform = 'scale(1)';
			}, 50);
			i++;
			if (i >= 4) {
				clearInterval(interval);
				setTimeout(() => {
					overlay.style.transition = 'background 1.5s';
					overlay.style.background = '#fff';
					setTimeout(() => {
						document.body.removeChild(overlay);
						linkAnimationActive = false;
						showGiftChoice();
					}, 1800);
				}, 1200);
			}
		}, 800);
	}

	function generateConfirmString() {
		const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
		let s = '';
		for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
		return s;
	}

	function showGiftChoice() {
		const modal = document.createElement('div');
		modal.style.cssText =
			'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;';

		const panel = document.createElement('div');
		panel.style.cssText =
			'background:var(--panel-bg);border:1px solid var(--border-color);padding:32px;border-radius:4px;max-width:480px;width:90%;font-family:monospace;color:var(--text-color);text-align:center;';

		const confirmStr = generateConfirmString();

		panel.innerHTML = `
      <div style="font-size:1.3em;margin-bottom:8px;">choose your gift</div>
      <div style="font-size:0.8em;opacity:0.5;margin-bottom:24px;">this decision is permanent. it defines your run until SUMMER.</div>
      <div id="giftOptions" style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
        <button class="gift-opt" data-gift="luck" style="background:var(--button-bg);border:1px solid var(--border-color);color:var(--text-color);padding:16px;font-family:monospace;font-size:0.95em;border-radius:2px;cursor:pointer;">
          <div style="font-size:1.1em;margin-bottom:4px;">⚡ gift of luck</div>
          <div style="font-size:0.75em;opacity:0.6;">2x your existing luck multiplier — permanently</div>
        </button>
        <button class="gift-opt" data-gift="wealth" style="background:var(--button-bg);border:1px solid var(--border-color);color:var(--text-color);padding:16px;font-family:monospace;font-size:0.95em;border-radius:2px;cursor:pointer;">
          <div style="font-size:1.1em;margin-bottom:4px;">💰 gift of wealth</div>
          <div style="font-size:0.75em;opacity:0.6;">200,000 points per second — permanently</div>
        </button>
      </div>
      <div id="giftConfirmArea" style="display:none;">
        <div style="font-size:0.8em;opacity:0.6;margin-bottom:8px;">type <strong id="confirmStrDisplay"></strong> to confirm</div>
        <input id="giftConfirmInput" type="text" autocomplete="off" spellcheck="false" style="width:100%;padding:8px;font-family:monospace;background:var(--input-bg);border:1px solid var(--border-color);color:var(--text-color);border-radius:2px;margin-bottom:10px;box-sizing:border-box;">
        <button id="giftConfirmBtn" style="background:var(--button-bg);border:1px solid var(--border-color);color:var(--text-color);padding:8px 20px;font-family:monospace;cursor:pointer;border-radius:2px;opacity:0.5;" disabled>confirm</button>
        <button id="giftCancelBtn" style="background:transparent;border:none;color:var(--text-color);padding:8px 16px;font-family:monospace;cursor:pointer;opacity:0.4;margin-left:8px;">cancel</button>
      </div>
    `;

		modal.appendChild(panel);
		document.body.appendChild(modal);

		let selectedGift = null;
		const confirmArea = panel.querySelector('#giftConfirmArea');
		const confirmStrEl = panel.querySelector('#confirmStrDisplay');
		const confirmInput = panel.querySelector('#giftConfirmInput');
		const confirmBtn = panel.querySelector('#giftConfirmBtn');
		const cancelBtn = panel.querySelector('#giftCancelBtn');

		panel.querySelectorAll('.gift-opt').forEach((btn) => {
			btn.addEventListener('click', () => {
				selectedGift = btn.dataset.gift;
				panel.querySelectorAll('.gift-opt').forEach((b) => (b.style.opacity = '0.4'));
				btn.style.opacity = '1';
				btn.style.borderColor = 'var(--text-color)';
				confirmStrEl.textContent = confirmStr;
				confirmArea.style.display = 'block';
				confirmInput.value = '';
				confirmBtn.disabled = true;
				confirmBtn.style.opacity = '0.5';
				confirmInput.focus();
			});
		});

		confirmInput.addEventListener('input', () => {
			const match = confirmInput.value === confirmStr;
			confirmBtn.disabled = !match;
			confirmBtn.style.opacity = match ? '1' : '0.5';
		});

		confirmBtn.addEventListener('click', () => {
			if (!selectedGift) return;
			gift = selectedGift;
			saveData();
			document.body.removeChild(modal);
			applyGift();
			renderRunes();
		});

		cancelBtn.addEventListener('click', () => {
			selectedGift = null;
			confirmArea.style.display = 'none';
			panel.querySelectorAll('.gift-opt').forEach((b) => {
				b.style.opacity = '1';
				b.style.borderColor = 'var(--border-color)';
			});
		});
	}

	function applyGift() {
		if (gift === 'luck') {
			if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
			if (typeof showAnomalyPopup === 'function')
				showAnomalyPopup('⚡ gift of luck active: 2x permanent luck!');
		}
		if (gift === 'wealth') {
			startWealthGift();
			if (typeof showAnomalyPopup === 'function')
				showAnomalyPopup('💰 gift of wealth active: 200k pts/sec!');
		}
	}

	function startWealthGift() {
		if (giftWealthInterval) clearInterval(giftWealthInterval);
		if (gift !== 'wealth') return;
		giftWealthInterval = setInterval(() => {
			if (typeof points !== 'undefined' && typeof updatePointsDisplay === 'function') {
				points += 200000;
				updatePointsDisplay();
				if (typeof saveAllData === 'function') saveAllData();
			}
		}, 1000);
	}

	function getGiftLuckMultiplier() {
		return gift === 'luck' ? 2 : 1;
	}
	window.getRuneGiftLuckMultiplier = getGiftLuckMultiplier;

	function totalRunes() {
		return (
			(runesData.counts.rare || 0) +
			(runesData.counts['mid-rare'] || 0) +
			(runesData.counts.common || 0)
		);
	}

	function totalElementalRunes() {
		return ELEMENTS.reduce((s, el) => s + (runesData.elementals[el] || 0), 0);
	}

	function getExchangeRate() {
		return upgrades.moreBlocks ? 10 : 1.25;
	}

	function exchangeRunesToBlocks(count) {
		if (totalRunes() < count) return;
		const total =
			(runesData.counts.rare || 0) +
			(runesData.counts['mid-rare'] || 0) +
			(runesData.counts.common || 0);
		let remaining = count;
		for (const tier of ['common', 'mid-rare', 'rare']) {
			const use = Math.min(runesData.counts[tier] || 0, remaining);
			runesData.counts[tier] = (runesData.counts[tier] || 0) - use;
			remaining -= use;
			if (remaining <= 0) break;
		}
		blocks += count * getExchangeRate();
		saveData();
		renderRunes();
	}

	function exchangeBlocksToRunes(count) {
		const cost = Math.ceil(count / 0.85);
		if (blocks < cost) return;
		blocks -= cost;
		runesData.counts.common = (runesData.counts.common || 0) + count;
		saveData();
		renderRunes();
	}

	function buyUpgrade(key) {
		if (upgrades[key]) return;
		const costs = {
			tripleLuck: 9000,
			moreBlocks: 15000,
			anomalyMachine: 17000,
			dopamineAttack: 20000,
			doubleClover: 50000,
		};
		const cost = costs[key];
		if (blocks < cost) {
			if (typeof window.showAlert === 'function')
				window.showAlert(`need ${formatNum(cost)} blocks!`);
			return;
		}
		blocks -= cost;
		upgrades[key] = true;
		saveData();
		activateUpgrade(key);
		renderRunes();
	}

	function activateUpgrade(key) {
		if (key === 'tripleLuck') {
			if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
			if (typeof showAnomalyPopup === 'function') showAnomalyPopup('🔺 triple luck active!');
		}
		if (key === 'anomalyMachine') {
			startAnomalyMachine();
		}
		if (key === 'dopamineAttack') {
			startDopamineAttack();
		}
		if (key === 'doubleClover') {
			if (typeof anomalies !== 'undefined') {
				window.anomalies = (window.anomalies || 0) + 50000000;
				if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
			}
			if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
			if (typeof showAnomalyPopup === 'function')
				showAnomalyPopup('🍀 double clover: 50M anomalies + 4x luck!');
		}
	}

	function startAnomalyMachine() {
		if (anomalyMachineInterval) clearInterval(anomalyMachineInterval);
		anomalyMachineInterval = setInterval(() => {
			if (typeof anomalies !== 'undefined') {
				anomalies += 50;
				if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
				if (typeof saveAllData === 'function') saveAllData();
			}
		}, 2000);
	}

	function startDopamineAttack() {
		if (dopamineAttackInterval) clearInterval(dopamineAttackInterval);
		const rollEvery = Math.round(1000 / 3);
		dopamineAttackInterval = setInterval(() => {
			const btn = document.getElementById('rollBtn');
			if (btn && !btn.disabled && typeof isCutscenePlaying !== 'undefined' && !isCutscenePlaying) {
				btn.click();
			}
		}, rollEvery);
	}

	function getTripleLuckMultiplier() {
		return upgrades.tripleLuck ? 3 : 1;
	}
	window.getRuneTripleLuckMultiplier = getTripleLuckMultiplier;

	function getDoubleCloverLuckMultiplier() {
		return upgrades.doubleClover ? 4 : 1;
	}
	window.getRuneDoubleCloverLuckMultiplier = getDoubleCloverLuckMultiplier;

	function formatBlocks(n) {
		if (typeof formatNum === 'function') return formatNum(n);
		return Math.round(n).toLocaleString();
	}

	function renderRunes() {
		const container = document.getElementById('runesContainer');
		if (!container) return;

		if (!isUnlocked()) {
			container.innerHTML = `
        <div style="text-align:center;opacity:0.4;margin-top:48px;">
          <div style="font-size:2.2em;margin-bottom:14px;">🔷</div>
          <div style="font-size:0.9em;">complete the abyss gauntlet to unlock runes</div>
        </div>`;
			return;
		}

		const allElementsCollected = ELEMENTS.every((el) => (runesData.elementals[el] || 0) > 0);
		const exchangeRate = getExchangeRate();

		const upgradeList = [
			{
				key: 'tripleLuck',
				name: 'always triple your luck',
				cost: 9000,
				desc: 'permanent 3x luck multiplier',
				emoji: '🔺',
			},
			{
				// yay more f-ing blocks! fufk fuck fuck fuck ruck
				key: 'moreBlocks',
				name: 'more blocks!',
				cost: 15000,
				desc: 'exchange rate becomes 1 rune = 10 blocks',
				emoji: '📦',
			},
			{
				key: 'anomalyMachine',
				name: 'anomaly anomaly anomaly',
				cost: 17000,
				desc: '+50 anomalies every 2 seconds',
				emoji: '⚗️',
			},
			{
				key: 'dopamineAttack',
				name: 'dopamine attack',
				cost: 20000,
				desc: 'auto-roll 3 times per second',
				emoji: '⚡',
			},
			{
				key: 'doubleClover',
				name: 'double clover',
				cost: 50000,
				desc: '50M anomalies + 4x permanent luck',
				emoji: '🍀',
			},
		];

		container.innerHTML = `
      <div class="runes-panel">
        <div style="font-size:1.1em;margin-bottom:4px;">🔷 runes</div>
        <div style="font-size:0.8em;opacity:0.5;margin-bottom:20px;">runes drop while rolling. collect all 4 elementals for a gift.</div>

        ${
					gift
						? `<div class="rune-gift-banner">
          <span>${gift === 'luck' ? '⚡' : '💰'} gift of ${gift} active</span>
        </div>`
						: ''
				}

        <div class="rune-stat-grid">
          <div class="rune-stat-card">
            <div class="rune-stat-label">rare runes</div>
            <div class="rune-stat-value">${runesData.counts.rare || 0}</div>
          </div>
          <div class="rune-stat-card">
            <div class="rune-stat-label">mid-rare runes</div>
            <div class="rune-stat-value">${runesData.counts['mid-rare'] || 0}</div>
          </div>
          <div class="rune-stat-card">
            <div class="rune-stat-label">common runes</div>
            <div class="rune-stat-value">${runesData.counts.common || 0}</div>
          </div>
          <div class="rune-stat-card">
            <div class="rune-stat-label">total dropped</div>
            <div class="rune-stat-value">${runesData.totalDropped}</div>
          </div>
        </div>

        <div class="rune-section-label">elementals</div>
        <div class="rune-elemental-grid">
          ${ELEMENTS.map((el) => {
						const count = runesData.elementals[el] || 0;
						const hasOne = count > 0;
						return `<div class="rune-elemental-card ${hasOne ? 'rune-el-collected' : ''}">
              <div class="rune-el-emoji">${ELEMENT_EMOJI[el]}</div>
              <div class="rune-el-name">${el}</div>
              <div class="rune-el-count">${count}</div>
            </div>`;
					}).join('')}
        </div>
        ${allElementsCollected && !gift ? '<div style="font-size:0.8em;opacity:0.6;text-align:center;margin-bottom:16px;">all elements collected — gift already granted</div>' : ''}

        <div class="rune-section-label">blocks — ${formatBlocks(Math.floor(blocks))}</div>
        <div class="rune-utm-panel">
          <div style="font-size:0.8em;opacity:0.5;margin-bottom:12px;">UTM — universal transaction machine</div>
          <div class="rune-utm-row">
            <div style="flex:1;">
              <div style="font-size:0.75em;opacity:0.6;margin-bottom:4px;">runes → blocks (rate: 1 = ${exchangeRate})</div>
              <div style="display:flex;gap:6px;align-items:center;">
                <input id="runeToBlockInput" type="number" min="1" placeholder="runes" style="width:80px;padding:4px 6px;background:var(--input-bg);border:1px solid var(--border-color);color:var(--text-color);font-family:monospace;border-radius:2px;">
                <button id="runeToBlockBtn" class="small">exchange →</button>
              </div>
            </div>
            <div style="flex:1;">
              <div style="font-size:0.75em;opacity:0.6;margin-bottom:4px;">blocks → runes (rate: 1 = 0.85, lossy)</div>
              <div style="display:flex;gap:6px;align-items:center;">
                <input id="blockToRuneInput" type="number" min="1" placeholder="runes out" style="width:80px;padding:4px 6px;background:var(--input-bg);border:1px solid var(--border-color);color:var(--text-color);font-family:monospace;border-radius:2px;">
                <button id="blockToRuneBtn" class="small">← exchange</button>
              </div>
            </div>
          </div>
        </div>

        <div class="rune-section-label" style="margin-top:20px;">block upgrades</div>
        <div class="rune-upgrades-list">
          ${upgradeList
						.map(
							(u) => `
            <div class="rune-upgrade-item ${upgrades[u.key] ? 'rune-upgrade-owned' : ''}">
              <div class="rune-upgrade-left">
                <div class="rune-upgrade-name">${u.emoji} ${u.name}</div>
                <div class="rune-upgrade-desc">${u.desc}</div>
              </div>
              <div class="rune-upgrade-right">
                ${
									upgrades[u.key]
										? '<span style="font-size:0.8em;color:#4a4;">owned</span>'
										: `<div style="font-size:0.75em;color:#ffb86b;margin-bottom:4px;">${formatBlocks(u.cost)} blocks</div>
                     <button class="small rune-buy-btn" data-key="${u.key}">buy</button>`
								}
              </div>
            </div>
          `
						)
						.join('')}
        </div>
      </div>
    `;

		const r2b = container.querySelector('#runeToBlockBtn');
		if (r2b)
			r2b.addEventListener('click', () => {
				const val = parseInt(container.querySelector('#runeToBlockInput').value) || 0;
				if (val > 0) exchangeRunesToBlocks(val);
			});

		const b2r = container.querySelector('#blockToRuneBtn');
		if (b2r)
			b2r.addEventListener('click', () => {
				const val = parseInt(container.querySelector('#blockToRuneInput').value) || 0;
				if (val > 0) exchangeBlocksToRunes(val);
			});

		container.querySelectorAll('.rune-buy-btn').forEach((btn) => {
			btn.addEventListener('click', () => buyUpgrade(btn.dataset.key));
		});
	}

	function injectStyles() {
		if (document.getElementById('runesStyles')) return;
		const style = document.createElement('style');
		style.id = 'runesStyles'; // oh CSS my beloved my ass
		style.textContent = `
.runes-panel {
  max-width: 540px;
  width: 100%;
  font-family: monospace;
  color: var(--text-color);
}
.rune-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}
.rune-stat-card {
  background: var(--overlay-bg);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 10px 12px;
  text-align: center;
}
.rune-stat-label {
  font-size: 0.72em;
  opacity: 0.45;
  margin-bottom: 4px;
}
.rune-stat-value {
  font-size: 1.1em;
}
.rune-section-label {
  font-size: 0.72em;
  opacity: 0.38;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 10px;
}
.rune-elemental-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.rune-elemental-card {
  background: var(--overlay-bg);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 10px 6px;
  text-align: center;
  opacity: 0.4;
  transition: opacity 0.3s, border-color 0.3s;
}
.rune-elemental-card.rune-el-collected {
  opacity: 1;
  border-color: #5a8a5a;
  background: rgba(40, 90, 40, 0.1);
}
.rune-el-emoji {
  font-size: 1.6em;
  margin-bottom: 4px;
}
.rune-el-name {
  font-size: 0.72em;
  opacity: 0.7;
  margin-bottom: 2px;
}
.rune-el-count {
  font-size: 0.9em;
}
.rune-utm-panel {
  background: var(--overlay-bg);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 14px;
}
.rune-utm-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.rune-upgrades-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rune-upgrade-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--overlay-bg);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 12px;
  gap: 12px;
}
.rune-upgrade-item.rune-upgrade-owned {
  border-color: #3a5a3a;
  background: rgba(40, 90, 40, 0.08);
}
.rune-upgrade-left {
  flex: 1;
  min-width: 0;
}
.rune-upgrade-name {
  font-size: 0.88em;
  margin-bottom: 2px;
}
.rune-upgrade-desc {
  font-size: 0.75em;
  opacity: 0.5;
}
.rune-upgrade-right {
  flex-shrink: 0;
  text-align: right;
}
.rune-gift-banner {
  background: rgba(40, 90, 40, 0.12);
  border: 1px solid #3a5a3a;
  border-radius: 2px;
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 0.85em;
  text-align: center;
  color: #88cc88;
}
    `;
		document.head.appendChild(style);
	}

	function init() {
		injectStyles();
		loadData();

		if (gift === 'wealth') startWealthGift();
		if (upgrades.anomalyMachine) startAnomalyMachine();
		if (upgrades.dopamineAttack) startDopamineAttack();

		renderRunes();

		document.addEventListener('click', (e) => {
			const dot = e.target.closest('.page-dot');
			const next = e.target.closest('#nextPage');
			const prev = e.target.closest('#prevPage');
			if (dot || next || prev) setTimeout(renderRunes, 80);
		});
	}

	window.tryDropRune = tryDropRune;
	window.renderRunes = renderRunes;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		setTimeout(init, 0);
	}
})();
