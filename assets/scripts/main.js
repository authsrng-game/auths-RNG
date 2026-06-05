console.log(performance.now());

const rollBtn = document.getElementById('rollBtn'),
	spinner = document.getElementById('spinner'),
	inventoryList = document.getElementById('inventoryList'),
	resetBtn = document.getElementById('resetBtn'),
	totalRollsEl = document.getElementById('totalRolls'),
	achievementsContainer = document.getElementById('achievementsContainer');

const POINTS_KEY = 'shopPoints';
const SHOP_UPGRADES_KEY = 'shopUpgrades';
const SOLD_OUT_KEY = 'soldOutRarities';

const RARITY_TIMESTAMPS_KEY = 'rarityTimestamps';
let rarityTimestamps = new Map();

window.formatNum = function (n) {
	if (window.rawNumbers) return String(Math.round(n));
	if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
	if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
	return String(Math.round(n));
};

window.formatMult = function (n) {
	if (window.rawNumbers) return n.toFixed(1);
	if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
	if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
	return n.toFixed(1);
};

let points = 0;
let shopUpgrades = {
	luck: 0,
	speed: 0,
	pointMult: 0,
	magnet: 0,
	printer: 0,
	duplicate: 0,
};
let soldOutRarities = new Map();
let rollSpeed = 1.0;
let shopLuckMultiplier = 1.0;
let pointDivisor = 3.0;

const STORAGE_KEY = 'rarityInventory',
	TOTAL_ROLLS_KEY = 'totalRolls',
	ACHIEVEMENTS_KEY = 'achievementsUnlocked';

const ANOMALIES_KEY = 'anomalies';
const ANOMALIES_USED_KEY = 'anomaliesUsed';
let anomalies = 0;
let anomaliesUsed = 0;

const POTIONS_KEY = 'playerPotions';

// ── Notification Center state ──────────────────────────────────────────
const NOTIF_KEY = 'notifications';
const NOTIF_MAX = 200; // cap stored; badge shows 100+ beyond 99

// load immediately so addNotification() works before initNotifCenter() runs
let notifications = (() => {
	try {
		return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
	} catch (_) {
		return [];
	}
})();
let notifPanelOpen = false;

const ACTIVE_POTIONS_KEY = 'activePotions';

let playerPotions = {
	luck2x: 0,
	luck4x: 0,
	luck10x: 0,
	luck50x: 0,
	luck100x: 0,
	luck150x: 0,
	luck250x: 0,
	luck300x: 0,
	luck800x: 0,
	luck1500x: 0,
	duplicate: 0,
};

let activePotions = [];
let potionLuckMultiplier = 1;
let duplicateRollsLeft = 0;

const potionData = {
	luck2x: {
		name: '2x luck',
		mult: 2,
		duration: 30000,
		cost: 2000,
		emoji: '✨',
	},
	luck4x: {
		name: '4x luck',
		mult: 4,
		duration: 30000,
		cost: 5000,
		emoji: '💫',
	},
	luck10x: {
		name: '10x luck',
		mult: 10,
		duration: 30000,
		cost: 15000,
		emoji: '🌟',
	},
	luck50x: {
		name: '50x luck',
		mult: 50,
		duration: 30000,
		cost: 30000,
		emoji: '⭐',
	},
	luck100x: {
		name: '100x luck',
		mult: 100,
		duration: 30000,
		cost: 45000,
		emoji: '🔥',
	},
	luck150x: {
		name: '150x luck',
		mult: 150,
		duration: 30000,
		cost: 60000,
		emoji: '💥',
	},
	luck250x: {
		name: '250x luck',
		mult: 250,
		duration: 30000,
		cost: 80000,
		emoji: '⚡',
	},
	luck300x: {
		name: 'OMEGA LUCK',
		mult: 300,
		duration: 30000,
		cost: 150000,
		emoji: '💎',
	},
	luck800x: {
		name: 'HEAVENLY LUCK',
		mult: 800,
		duration: 20000,
		cost: 500000,
		emoji: '☁️',
	},
	luck1500x: {
		name: 'RAW LUCK',
		mult: 1500,
		duration: 30000,
		cost: 1500000,
		emoji: '🍀',
	},
	duplicate: { name: 'duplicate', rolls: 10, cost: 5000, emoji: '🎭' },
};

// ── roll sound ────────────────────────────────────────────────────────────
function playRollSound() {
	const sound = window.rollSoundSetting || 'none';
	if (sound === 'none') return;
	try {
		const ctx = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
		window.audioContext = ctx;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		const t = ctx.currentTime;
		if (sound === 'click') {
			osc.frequency.setValueAtTime(600, t);
			osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
			gain.gain.setValueAtTime(0.25, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
			osc.start(t);
			osc.stop(t + 0.08);
		} else if (sound === 'whoosh') {
			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(150, t);
			osc.frequency.exponentialRampToValueAtTime(600, t + 0.25);
			gain.gain.setValueAtTime(0.15, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
			osc.start(t);
			osc.stop(t + 0.25);
		} else if (sound === 'coin') {
			osc.frequency.setValueAtTime(1400, t);
			osc.frequency.setValueAtTime(1800, t + 0.04);
			gain.gain.setValueAtTime(0.25, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
			osc.start(t);
			osc.stop(t + 0.18);
		}
	} catch (e) {}
}

// ── confetti ──────────────────────────────────────────────────────────────
function triggerConfetti() {
	if (document.body.classList.contains('reduce-motion')) return;
	const canvas = document.createElement('canvas');
	canvas.style.cssText =
		'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99998;';
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);
	const ctx = canvas.getContext('2d');
	const colors = ['#ff6666', '#66ff66', '#6666ff', '#ffff66', '#ff66ff', '#66ffff', '#ffaa66'];
	const pieces = Array.from({ length: 120 }, () => ({
		x: Math.random() * canvas.width,
		y: -10,
		w: 8 + Math.random() * 8,
		h: 4 + Math.random() * 4,
		color: colors[Math.floor(Math.random() * colors.length)],
		rot: Math.random() * Math.PI * 2,
		rotSpeed: (Math.random() - 0.5) * 0.15,
		vx: (Math.random() - 0.5) * 5,
		vy: 2 + Math.random() * 4,
		alpha: 1,
	}));
	function draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		let alive = false;
		pieces.forEach((p) => {
			p.x += p.vx;
			p.y += p.vy;
			p.rot += p.rotSpeed;
			if (p.y > canvas.height * 0.7) p.alpha -= 0.025;
			if (p.alpha > 0) {
				alive = true;
				ctx.save();
				ctx.globalAlpha = Math.max(0, p.alpha);
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
			}
		});
		if (alive) requestAnimationFrame(draw);
		else canvas.remove();
	}
	draw();
}

// ── rolls since last rare ─────────────────────────────────────────────────
let rollsSinceLastRare = 0;
function updateRollsSinceRare(rolledRarity) {
	const thresh = window.rareThreshold || 1000;
	const denom = Math.round(1 / rolledRarity.chance);
	if (denom >= thresh) {
		rollsSinceLastRare = 0;
	} else {
		rollsSinceLastRare++;
	}
	const el = document.getElementById('rollsSinceRare');
	if (!el) return;
	if (thresh > 0) {
		el.style.display = 'block';
		el.textContent = `rolls since last rare: ${rollsSinceLastRare}`;
	} else {
		el.style.display = 'none';
	}
}

function calculateRarityPoints(rarity) {
	const denom = Math.round(1 / rarity.chance);
	return Math.ceil(denom / pointDivisor);
}

function updatePointsDisplay() {
	document.getElementById('pointsValue').textContent = formatNum(points);
}

function updateShopUI() {
	document.getElementById('luckLevel').textContent = shopUpgrades.luck;
	document.getElementById('speedLevel').textContent = shopUpgrades.speed;
	document.getElementById('pointLevel').textContent = shopUpgrades.pointMult;

	const luckCost = Math.floor(25 + shopUpgrades.luck * shopUpgrades.luck * 15);
	const speedCost = Math.floor(50 + shopUpgrades.speed * shopUpgrades.speed * 55);
	const pointCost = Math.floor(100 + shopUpgrades.pointMult * shopUpgrades.pointMult * 35);

	const luckBtn = document.getElementById('buyLuckBtn');
	const speedBtn = document.getElementById('buySpeedBtn');
	const pointBtn = document.getElementById('buyPointBtn');

	if (luckBtn) luckBtn.textContent = `buy luck upgrade (${formatNum(luckCost)} pts)`;
	if (speedBtn) speedBtn.textContent = `buy speed upgrade (${formatNum(speedCost)} pts)`;
	if (pointBtn) pointBtn.textContent = `buy points upgrade (${formatNum(pointCost)} pts)`;

	const luckCostEl = document.getElementById('luckCost');
	const speedCostEl = document.getElementById('speedCost');
	const pointCostEl = document.getElementById('pointCost');
	if (luckCostEl) luckCostEl.textContent = formatNum(luckCost);
	if (speedCostEl) speedCostEl.textContent = formatNum(speedCost);
	if (pointCostEl) pointCostEl.textContent = formatNum(pointCost);

	if (luckBtn) luckBtn.disabled = points < luckCost || shopUpgrades.luck >= 100;
	if (speedBtn) speedBtn.disabled = points < speedCost || shopUpgrades.speed >= 3;
	if (pointBtn) pointBtn.disabled = points < pointCost || shopUpgrades.pointMult >= 10;

	const magnetLevelEl = document.getElementById('magnetLevel');
	const printerLevelEl = document.getElementById('printerLevel');
	const dupeLevelEl = document.getElementById('dupeLevel');

	if (magnetLevelEl) magnetLevelEl.textContent = shopUpgrades.magnet || 0;
	if (printerLevelEl) printerLevelEl.textContent = shopUpgrades.printer || 0;
	if (dupeLevelEl) dupeLevelEl.textContent = shopUpgrades.duplicate || 0;

	const magnetCost = 500 + (shopUpgrades.magnet || 0) * 1000;
	const printerCost = 1000 + (shopUpgrades.printer || 0) * (shopUpgrades.printer || 0) * 500;
	const dupeCost = 800 + (shopUpgrades.duplicate || 0) * (shopUpgrades.duplicate || 0) * 400;

	const magnetCostEl = document.getElementById('magnetCost');
	const printerCostEl = document.getElementById('printerCost');
	const dupeCostEl = document.getElementById('dupeCost');
	if (magnetCostEl) magnetCostEl.textContent = formatNum(magnetCost);
	if (printerCostEl) printerCostEl.textContent = formatNum(printerCost);
	if (dupeCostEl) dupeCostEl.textContent = formatNum(dupeCost);

	const magnetBtn = document.getElementById('buyMagnetBtn');
	const printerBtn = document.getElementById('buyPrinterBtn');
	const dupeBtn = document.getElementById('buyDupeBtn');

	if (magnetBtn) {
		magnetBtn.textContent = `upgrade (${formatNum(magnetCost)} pts)`;
		magnetBtn.disabled = points < magnetCost || (shopUpgrades.magnet || 0) >= 5;
	}
	if (printerBtn) {
		printerBtn.textContent = `upgrade (${formatNum(printerCost)} pts)`;
		printerBtn.disabled = points < printerCost;
	}
	if (dupeBtn) {
		dupeBtn.textContent = `upgrade (${formatNum(dupeCost)} pts)`;
		dupeBtn.disabled = points < dupeCost || (shopUpgrades.duplicate || 0) >= 10;
	}
	const speedPips = document.getElementById('speedPips');
	if (speedPips) {
	  speedPips.querySelectorAll('.level-pip').forEach((pip, i) => {
	    pip.classList.toggle('on', i < shopUpgrades.speed);
	  });
	}
	
	const magnetPips = document.getElementById('magnetPips');
	if (magnetPips) {
	  magnetPips.querySelectorAll('.level-pip').forEach((pip, i) => {
	    pip.classList.toggle('on', i < (shopUpgrades.magnet || 0));
	  });
	}
}

function updatePotionUI() {
	for (const [key, count] of Object.entries(playerPotions)) {
		const countEl = document.getElementById(`potion-${key}-count`);
		if (countEl) countEl.textContent = count;
	}
}

function buyPotion(potionType) {
	const data = potionData[potionType];
	if (!data) return;

	if (points >= data.cost) {
		points -= data.cost;
		playerPotions[potionType]++;
		updatePointsDisplay();
		updatePotionUI();
		saveAllData();
		showAnomalyPopup(`bought ${data.emoji} ${data.name}!`);
	} else {
		window.showAlert(`need ${formatNum(data.cost)} points!`);
	}
}

function usePotion(potionType) {
	if (playerPotions[potionType] <= 0) {
		window.showAlert(`you don't have any ${potionData[potionType].name} potions!`);
		return;
	}

	const data = potionData[potionType];

	if (potionType === 'duplicate') {
		duplicateRollsLeft = data.rolls;
		playerPotions[potionType]--;
		updatePotionUI();
		saveAllData();
		showAnomalyPopup(`${data.emoji} next ${data.rolls} rolls will be x2!`);
		return;
	}

	// Luck potions
	const endTime = Date.now() + data.duration;
	activePotions.push({
		type: potionType,
		endTime: endTime,
		multiplier: data.mult,
	});

	playerPotions[potionType]--;
	recalcPotionLuck();
	updatePotionUI();
	updateActivePotionsDisplay();
	saveAllData();
	showAnomalyPopup(`${data.emoji} ${data.name} activated!`);
}

function recalcPotionLuck() {
	potionLuckMultiplier = 1;
	activePotions = activePotions.filter((p) => p.endTime > Date.now());
	activePotions.forEach((p) => {
		potionLuckMultiplier += p.multiplier - 1;
	});
	recalcLuckMultiplier();
}

function updateActivePotionsDisplay() {
	const display = document.getElementById('activePotionsDisplay');
	const list = document.getElementById('activePotionsList');

	if (!display || !list) return;

	if (activePotions.length === 0 && duplicateRollsLeft === 0) {
		display.style.display = 'none';
		return;
	}

	display.style.display = 'block';
	list.innerHTML = '';

	activePotions.forEach((p) => {
		const data = potionData[p.type];
		const timeLeft = Math.ceil((p.endTime - Date.now()) / 1000);

		const div = document.createElement('div');
		div.className = 'active-potion';
		div.innerHTML = `
      <div class="active-potion-name">${data.emoji} ${data.mult}x luck</div>
      <div class="active-potion-timer">${timeLeft}s remaining</div>
    `;
		list.appendChild(div);
	});

	if (duplicateRollsLeft > 0) {
		const div = document.createElement('div');
		div.className = 'active-potion';
		div.innerHTML = `
      <div class="active-potion-name">🎭 duplicate</div>
      <div class="active-potion-timer">${duplicateRollsLeft} rolls left</div>
    `;
		list.appendChild(div);
	}
}

// Update potion timers
setInterval(() => {
	recalcPotionLuck(); // handles filter + multiplier reset internally
	updateActivePotionsDisplay();
}, 1000);

// Make functions global
window.buyPotion = buyPotion;
window.usePotion = usePotion;

function showConfirmModal(title, text, onConfirm) {
	const modal = document.getElementById('confirmModal');
	const modalTitle = document.getElementById('modalTitle');
	const modalText = document.getElementById('modalText');
	const confirmBtn = document.getElementById('modalConfirm');
	const cancelBtn = document.getElementById('modalCancel');

	if (!modal || !modalTitle || !modalText || !confirmBtn || !cancelBtn) return;

	modalTitle.textContent = title;
	modalText.textContent = text;
	modal.style.display = 'flex'; // was already correct but CSS needed .show class

	const newConfirmBtn = confirmBtn.cloneNode(true);
	const newCancelBtn = cancelBtn.cloneNode(true);
	confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
	cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

	const close = () => {
		modal.style.display = 'none';
	};

	newConfirmBtn.addEventListener('click', () => {
		close();
		onConfirm();
	});
	newCancelBtn.addEventListener('click', close);

	const bgClickHandler = (e) => {
		if (e.target === modal) {
			close();
			modal.removeEventListener('click', bgClickHandler);
		}
	};
	modal.addEventListener('click', bgClickHandler);
}

let globalLuckMultiplier = 1;

function recalcLuckMultiplier() {
	shopLuckMultiplier = 1 + shopUpgrades.luck * 0.1;
	const anomalyMult = 1 + anomaliesUsed * 0.5;
	const starmapMult =
		typeof window.getStarmapLuckBonus === 'function' ? window.getStarmapLuckBonus() : 1;
	const runeTripMult =
		typeof window.getRuneTripleLuckMultiplier === 'function'
			? window.getRuneTripleLuckMultiplier()
			: 1;
	const runeGiftMult =
		typeof window.getRuneGiftLuckMultiplier === 'function' ? window.getRuneGiftLuckMultiplier() : 1;
	const runeCloverMult =
		typeof window.getRuneDoubleCloverLuckMultiplier === 'function'
			? window.getRuneDoubleCloverLuckMultiplier()
			: 1;
	globalLuckMultiplier =
		shopLuckMultiplier * anomalyMult * starmapMult * runeTripMult * runeGiftMult * runeCloverMult;
	if (luckBoostActive) globalLuckMultiplier *= 4;
	globalLuckMultiplier *= potionLuckMultiplier;
	updateLuckDisplay();
}

function updateLuckDisplay() {
	const luckEl = document.getElementById('luckMultiplier');
	const breakdownEl = document.getElementById('luckBreakdown');
	if (!luckEl || !breakdownEl) return;

	luckEl.textContent = `luck multiplier: ${formatMult(globalLuckMultiplier)}x`;

	const parts = [];
	if (anomaliesUsed > 0) {
		const anomalyMult = 1 + anomaliesUsed * 0.5;
		parts.push(`anomalies: ${formatMult(anomalyMult)}x (${anomaliesUsed} consumed)`);
	}
	if (shopUpgrades.luck > 0)
		parts.push(`shop: ${formatMult(shopLuckMultiplier)}x (level ${shopUpgrades.luck})`);
	if (luckBoostActive) parts.push(`boost: 4.0x (active)`);
	if (potionLuckMultiplier > 1) parts.push(`potions: ${formatMult(potionLuckMultiplier)}x`);
	if (duplicateRollsLeft > 0) parts.push(`duplicate: ${duplicateRollsLeft} rolls left`);

	// starmap bonus
	const starmapMult =
		typeof window.getStarmapLuckBonus === 'function' ? window.getStarmapLuckBonus() : 1;
	if (starmapMult > 1)
		parts.push(
			`starmap: +${formatMult(starmapMult - 1)}x (${
				JSON.parse(localStorage.getItem('starmapData') || '{}').constellations?.length || 0
			} constellations)`
		);

	breakdownEl.textContent = parts.length ? parts.join(' • ') : 'base luck (no modifiers active)';
}

let luckBoostActive = false;
let luckBoostEndTime = 0;
let luckInterval = null;

const LUCK_KEY = 'luckBoostState';

let totalRolls = 0;
const inventoryData = new Map();
const achievementsUnlocked = new Set();

const backgroundMusic = new Audio();
backgroundMusic.preload = 'none';
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

const lunarMusic = new Audio();
lunarMusic.preload = 'none';
lunarMusic.volume = 0; // ITS INTENTIONALLY 0. DONT MAKE A FIX TO THIS. when we got time we remove the lunar music code because now we have cutscenes that we can instead use. too redundant

const runId = Math.floor(Math.random() * 1e10);

const playtimeKey = 'totalPlaytime';
let totalSeconds = parseInt(localStorage.getItem(playtimeKey)) || 0;

function formatTimeDisplay(seconds) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
}

function updatePlaytimeDisplay() {
	const display = document.getElementById('playtimeDisplay');
	if (display) {
		display.textContent = 'total playtime: ' + formatTimeDisplay(totalSeconds);
	}
}

updatePlaytimeDisplay();

setInterval(() => {
	totalSeconds++;
	localStorage.setItem(playtimeKey, totalSeconds);
	updatePlaytimeDisplay();
}, 1000);

let isCutscenePlaying = false;

function playCutscene(rarityName, callback) {
	const videoUrl = cutsceneMap[rarityName];
	if (!videoUrl) {
		callback();
		return;
	}

	isCutscenePlaying = true;
	rollBtn.disabled = true;

	// STOP ALL MUSIC BEFORE CUTSCENE BECAUSE YES OF COURSE
	const wasBackgroundMusicPlaying = !backgroundMusic.paused;
	const wasLunarMusicPlaying = !lunarMusic.paused;
	backgroundMusic.pause();
	lunarMusic.pause();

	const overlay = document.getElementById('cutsceneOverlay');
	const video = document.getElementById('cutsceneVideo');

	video.src = videoUrl;
	overlay.classList.add('active');

	// fade in
	setTimeout(() => {
		video.play().catch((err) => {
			console.error('Video playback failed:', err);
			endCutscene(overlay, callback, wasBackgroundMusicPlaying, wasLunarMusicPlaying);
		});
	}, 100);

	// when video ends
	video.onended = () => {
		endCutscene(overlay, callback, wasBackgroundMusicPlaying, wasLunarMusicPlaying);
	};

	// Error handling
	video.onerror = () => {
		console.error('video failed to load');
		endCutscene(overlay, callback, wasBackgroundMusicPlaying, wasLunarMusicPlaying);
	};
}

function endCutscene(overlay, callback, wasBackgroundMusicPlaying, wasLunarMusicPlaying) {
	// fade out
	overlay.classList.add('fadeout');

	setTimeout(() => {
		overlay.classList.remove('active', 'fadeout');
		const video = document.getElementById('cutsceneVideo');
		video.pause();
		video.src = '';

		callback();

		// RESUME MUSIC AFTER CUTSCENE (if it was playing before)
		const isMuted = checkMuteSettings();
		if (!isMuted) {
			if (wasBackgroundMusicPlaying) {
				backgroundMusic.play().catch(() => {});
			}
			if (wasLunarMusicPlaying) {
				lunarMusic.play().catch(() => {});
			}
		}

		// Re-enable rolling after 5 seconds
		setTimeout(() => {
			isCutscenePlaying = false;
			rollBtn.disabled = false;
		}, 5000);
	}, 500);
}

const achievementsList = [
	{
		id: 'roller',
		name: 'Roller',
		subtitle: 'Get 100 Rolls',
		check: () => totalRolls >= 100,
	},
	{
		id: 'gambler',
		name: 'Gambler',
		subtitle: 'Get 200 Rolls',
		check: () => totalRolls >= 200,
	},
	{
		id: 'discordMod',
		name: 'Discord Mod',
		subtitle: 'Get 300 Rolls',
		check: () => totalRolls >= 300,
	},
	{
		id: 'touchGrass',
		name: 'Touch Grass Please',
		subtitle: 'Get 400 Rolls',
		check: () => totalRolls >= 400,
	},
	{
		id: 'addicted',
		name: 'Addicted',
		subtitle: 'Get 500 Rolls',
		check: () => totalRolls >= 500,
	},
	{
		id: 'insane',
		name: 'Insane',
		subtitle: 'Get 600 Rolls',
		check: () => totalRolls >= 600,
	},
	{
		id: 'joel',
		name: 'Joel',
		subtitle: 'Get 700 Rolls',
		check: () => totalRolls >= 700,
	},
	{
		id: 'crazyAddicted',
		name: 'Crazy Addicted',
		subtitle: 'Get 800 Rolls',
		check: () => totalRolls >= 800,
	},
	{
		id: 'funkyTown',
		name: 'Funky Town',
		subtitle: 'Get 900 Rolls',
		check: () => totalRolls >= 900,
	},
	{
		id: 'outsideTime',
		name: "It's Outside Time Now",
		subtitle: 'Get 1000 Rolls',
		check: () => totalRolls >= 1000,
	},
	{
		id: 'actually-addicted',
		name: 'Actually Addicted',
		subtitle: 'Get 5000 Rolls',
		check: () => totalRolls >= 5000,
	},
	{
		id: 'what',
		name: '..what',
		subtitle: 'Get 7000 Rolls',
		check: () => totalRolls >= 7000,
	},
	{
		id: 'devoted',
		name: 'Devoted',
		subtitle: 'Get 10000 Rolls',
		check: () => totalRolls >= 10000,
	},
	{
		id: 'get-a-job',
		name: 'get a job',
		subtitle: 'Get 15000 Rolls',
		check: () => totalRolls >= 15000,
	},
	{
		id: 'genuinely-insane',
		name: 'Genuinely Insane',
		subtitle: 'Get 25000 Rolls',
		check: () => totalRolls >= 25000,
	},
	{
		id: 'roll-factory',
		name: 'Roll Factory',
		subtitle: 'Get 30000 Rolls',
		check: () => totalRolls >= 30000,
	},
	{
		id: 'just-one-more-roll',
		name: 'Just One More Roll',
		subtitle: 'Get 50000 Rolls',
		check: () => totalRolls >= 50000,
	},
	{
		id: 'got-no-life',
		name: 'Got No LIfe',
		subtitle: 'Get 70000 Rolls',
		check: () => totalRolls >= 70000,
	},
	{
		id: 'introverted',
		name: 'Introverted',
		subtitle: 'Get 150000 Rolls',
		check: () => totalRolls >= 150000,
	},
	{
		id: 'holy-hell',
		name: 'HOLY HELL',
		subtitle: 'Get 500000 Rolls',
		check: () => totalRolls >= 500000,
	},
	{
		id: 'dude',
		name: 'dude',
		subtitle: 'Get 1000000 Rolls',
		check: () => totalRolls >= 1000000,
	},
	{
		id: 'please-just-stop',
		name: 'PLEASE JUST STOP',
		subtitle: 'Get 5000000 Rolls',
		check: () => totalRolls >= 5000000,
	},
	{
		id: 'you-will-pay',
		name: 'you will pay',
		subtitle: 'Get 10000000 Rolls',
		check: () => totalRolls >= 10000000,
	},
	{
		id: 'startingOut',
		name: 'Starting Out',
		subtitle: 'Get A Rarity Under 1/70',
		check: (rarity) => rarity && 1 / rarity.chance < 70,
	},
	{
		id: 'lucky',
		name: 'Lucky',
		subtitle: 'Get A Rarity Above 1/70',
		check: (rarity) => rarity && 1 / rarity.chance > 70,
	},
	{
		id: 'spammin',
		name: 'Spammin',
		subtitle: 'Get A Rarity Above 1/300',
		check: (rarity) => rarity && 1 / rarity.chance > 300,
	},
	{
		id: 'leftHanded',
		name: 'Left Handed',
		subtitle: 'Get A Rarity Above 1/600',
		check: (rarity) => rarity && 1 / rarity.chance > 600,
	},
	{
		id: 'insanelyLucky',
		name: 'Insanely Lucky',
		subtitle: 'Get A Rarity Above 1/800',
		check: (rarity) => rarity && 1 / rarity.chance > 800,
	},
	{
		id: 'lunar',
		name: 'Lunar',
		subtitle: 'Get Lunar',
		check: (rarity) => rarity && rarity.name === 'Lunar',
	},
	{
		id: 'jackpot',
		name: 'Jackpot',
		subtitle: 'Get A Rarity Above 5000',
		check: (rarity) => rarity && 1 / rarity.chance > 5000,
	},
	{
		id: 'antimatter',
		name: 'Antimatter',
		subtitle: 'Get A Rarity Above 15000',
		check: (rarity) => rarity && 1 / rarity.chance > 15000,
	},
	{
		id: 'oh-my-god',
		name: 'oh my god',
		subtitle: 'Get A Rarity Above 50000',
		check: (rarity) => rarity && 1 / rarity.chance > 50000,
	},
	{
		id: 'market-crash',
		name: 'Market Crash',
		subtitle: 'Get A Rarity Above 100000',
		check: (rarity) => rarity && 1 / rarity.chance > 100000,
	},
	{
		id: 'phenomenon',
		name: 'Phenomenon',
		subtitle: 'Get A Rarity Above 10000000',
		check: (rarity) => rarity && 1 / rarity.chance > 10000000,
	},
	{
		id: 'ok-bro',
		name: 'ok bro',
		subtitle: 'Get A Rarity Above 1000000000',
		check: (rarity) => rarity && 1 / rarity.chance > 1000000000,
	},
	{
		id: 'summer',
		name: 'SUMMER',
		subtitle: 'Get SUMMER',
		check: (rarity) => rarity && rarity.name === 'SUMMER',
	},
];

function updateAchievementsUI() {
	achievementsContainer.innerHTML = '';
	achievementsList.forEach((ach) => {
		const unlocked = achievementsUnlocked.has(ach.id);
		const div = document.createElement('div');
		div.className = 'achievement' + (unlocked ? ' unlocked' : '');
		const nameEl = document.createElement('div');
		nameEl.className = 'achievement-name';
		nameEl.textContent = ach.name;
		const subEl = document.createElement('div');
		subEl.className = 'achievement-subtitle';
		subEl.textContent = ach.subtitle;
		div.appendChild(nameEl);
		div.appendChild(subEl);
		achievementsContainer.appendChild(div);
	});
}

function saveAllData() {
	const arr = Array.from(inventoryData.values()).map(({ rarityObj, count }) => ({
		name: rarityObj.name,
		chance: rarityObj.chance,
		count,
	}));
	localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
	localStorage.setItem(TOTAL_ROLLS_KEY, totalRolls);
	localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(achievementsUnlocked)));
	localStorage.setItem(ANOMALIES_KEY, String(anomalies));
	localStorage.setItem(ANOMALIES_USED_KEY, String(anomaliesUsed));
	localStorage.setItem(POINTS_KEY, points);
	localStorage.setItem(SHOP_UPGRADES_KEY, JSON.stringify(shopUpgrades));
	localStorage.setItem(RARITY_TIMESTAMPS_KEY, JSON.stringify([...rarityTimestamps.entries()]));
	localStorage.setItem(SOLD_OUT_KEY, JSON.stringify(Array.from(soldOutRarities.entries())));
	localStorage.setItem(POTIONS_KEY, JSON.stringify(playerPotions));
	localStorage.setItem(
		ACTIVE_POTIONS_KEY,
		JSON.stringify({
			active: activePotions,
			duplicateLeft: duplicateRollsLeft,
		})
	);
	Beacon.save();
}

function loadAllData() {
	console.log('[main] loading all data...');

	const sr = localStorage.getItem(TOTAL_ROLLS_KEY);
	if (sr !== null) {
		totalRolls = parseInt(sr, 10);
		updateTotalRolls();
	}

	const sv = localStorage.getItem(STORAGE_KEY);
	if (sv) {
		try {
			JSON.parse(sv).forEach((item) => {
				const o = rarities.find((r) => r.name === item.name);
				if (o) {
					const li = document.createElement('li');
					inventoryData.set(o.name, {
						rarityObj: o,
						count: item.count,
						liElement: li,
					});
					updateItem(inventoryData.get(o.name));
					inventoryList.appendChild(li);
				}
			});
		} catch (e) {
			console.error('[main] failed to parse inventory:', e);
		}
	}

	const sa = localStorage.getItem(ACHIEVEMENTS_KEY);
	if (sa) {
		try {
			JSON.parse(sa).forEach((id) => achievementsUnlocked.add(id));
		} catch (e) {
			console.error('[main] failed to parse achievements:', e);
		}
	}
	updateAchievementsUI();

	const saAnom = localStorage.getItem(ANOMALIES_KEY);
	if (saAnom !== null) anomalies = parseInt(saAnom, 10) || 0;
	const saAnomUsed = localStorage.getItem(ANOMALIES_USED_KEY);
	if (saAnomUsed !== null) anomaliesUsed = parseInt(saAnomUsed, 10) || 0;

	// re-derive upgrade-dependent values from loaded shopUpgrades
	shopLuckMultiplier = 1 + shopUpgrades.luck * 0.1;
	rollSpeed = Math.max(0.25, 1.0 - shopUpgrades.speed * 0.2);
	pointDivisor = Math.max(1.0, 3.0 - shopUpgrades.pointMult * 0.2);

	recalcLuckMultiplier();
	console.log('[main] all data loaded.');
}

function updateTotalRolls() {
	totalRollsEl.textContent = `total rolls: ${formatNum(totalRolls)}`;
}

function addToInventory(o) {
	rarityTimestamps.set(o.name, Date.now());
	if (typeof window.tryDropRune === 'function') window.tryDropRune(o);

	if (inventoryData.has(o.name)) {
		const d = inventoryData.get(o.name);
		d.count++;
		updateItem(d);
	} else {
		const li = document.createElement('li');
		// set data BEFORE updateItem so liElement exists fully
		inventoryData.set(o.name, { rarityObj: o, count: 1, liElement: li });
		const d = inventoryData.get(o.name);
		updateItem(d);
		inventoryList.appendChild(li);
	}

	const isNearBottom =
		inventoryList.scrollHeight - inventoryList.scrollTop - inventoryList.clientHeight < 60;
	if (isNearBottom) inventoryList.scrollTop = inventoryList.scrollHeight;

	updateCollectedCounter();

	// rare highlight
	const rareThresh = window.rareThreshold || 1000;
	const d = inventoryData.get(o.name);
	if (d) {
		const denom = Math.round(1 / o.chance);
		d.liElement.classList.toggle('item-rare', denom >= rareThresh);
	}

	// duplicate upgrade proc (before auto-sell so counts are stable)
	if (shopUpgrades.duplicate > 0) {
		const dupeChance = shopUpgrades.duplicate / 100;
		if (Beacon.float() < dupeChance) {
			const d2 = inventoryData.get(o.name);
			if (d2) {
				d2.count++;
				updateItem(d2);
			}
			showAnomalyPopup('duplicate proc!');
		}
	}

	// duplicate potion
	if (duplicateRollsLeft > 0) {
		const d2 = inventoryData.get(o.name);
		if (d2) {
			d2.count++;
			updateItem(d2);
		}
		duplicateRollsLeft--;
		updateActivePotionsDisplay();
		debouncedSave();
	}

	// auto-sell — runs last so count is fully settled
	const autoSellThresh = window.autoSellThreshold || 0;
	if (autoSellThresh > 0) {
		const denom = Math.round(1 / o.chance);
		if (denom < autoSellThresh) {
			const d2 = inventoryData.get(o.name);
			if (d2) {
				const alreadySold = soldOutRarities.has(o.name) ? soldOutRarities.get(o.name).count : 0;
				const sellable = d2.count - alreadySold;
				if (sellable > 0) {
					const earned = calculateRarityPoints(o) * sellable;
					soldOutRarities.set(o.name, { count: d2.count });
					points += earned;
					updatePointsDisplay();
					updateShopUI();
					updateItem(d2);
					showAnomalyPopup(`auto-sold ${o.name} for ${formatNum(earned)} pts`);
				}
			}
		}
	}
}

document.getElementById('buyLuckBtn').addEventListener('click', () => {
	const cost = Math.floor(25 + shopUpgrades.luck * shopUpgrades.luck * 15);
	if (points >= cost && shopUpgrades.luck < 100) {
		points -= cost;
		shopUpgrades.luck++;
		shopLuckMultiplier = 1 + shopUpgrades.luck * 0.1;
		recalcLuckMultiplier();
		updatePointsDisplay();
		updateShopUI();
		saveAllData();
	}
});

document.getElementById('buySpeedBtn').addEventListener('click', () => {
	const cost = Math.floor(50 + shopUpgrades.speed * shopUpgrades.speed * 55);
	if (points >= cost && shopUpgrades.speed < 3) {
		points -= cost;
		shopUpgrades.speed++;
		rollSpeed = Math.max(0.25, 1.0 - shopUpgrades.speed * 0.2);
		updatePointsDisplay();
		updateShopUI();
		saveAllData();
	}
});

document.getElementById('buyPointBtn').addEventListener('click', () => {
	const cost = Math.floor(100 + shopUpgrades.pointMult * shopUpgrades.pointMult * 35);
	if (points >= cost && shopUpgrades.pointMult < 10) {
		points -= cost;
		shopUpgrades.pointMult++;
		pointDivisor = Math.max(1.0, 3.0 - shopUpgrades.pointMult * 0.2);
		updatePointsDisplay();
		updateShopUI();
		saveAllData();
	}
});

// Point printer passive generation
let _lastShopUIPoints = -1;

setInterval(() => {
	if (shopUpgrades.printer > 0) {
		points += shopUpgrades.printer;
		updatePointsDisplay();

		// Only rebuild the full shop UI when crossing an upgrade cost threshold
		const luckCost = Math.floor(25 + shopUpgrades.luck * shopUpgrades.luck * 15);
		const speedCost = Math.floor(50 + shopUpgrades.speed * shopUpgrades.speed * 55);
		const pointCost = Math.floor(100 + shopUpgrades.pointMult * shopUpgrades.pointMult * 35);
		const thresholds = [luckCost, speedCost, pointCost];
		const crossed = thresholds.some((t) => points >= t !== _lastShopUIPoints >= t);
		if (crossed || _lastShopUIPoints < 0) updateShopUI();
		_lastShopUIPoints = points;
	}
}, 1000);

function updateItem(d) {
	const { rarityObj, count, liElement } = d;
	const denom = Math.round(1 / rarityObj.chance);

	liElement.textContent =
		count > 1 ? `${rarityObj.name} (1/${denom}) x${count}` : `${rarityObj.name} (1/${denom})`;

	if (liElement._rarityStyleAC) {
		liElement._rarityStyleAC.abort();
		liElement._rarityStyleAC = null;
	}
	liElement.style.color = '';
	liElement.style.transition = '';
	if (rarityObj.style && window.RarityStyle) {
		liElement._rarityStyleAC = window.RarityStyle.apply(liElement, rarityObj.style);
	}

	liElement.classList.add('new-roll');
	setTimeout(() => liElement.classList.remove('new-roll'), 2000);

	const key = rarityObj.name;
	const soldData = soldOutRarities.get(key);
	if (soldData && soldData.count >= count) {
		liElement.classList.add('sold-out');
	} else {
		liElement.classList.remove('sold-out');
	}

	// Remove previous sell handler before adding a new one (prevents listener accumulation)
	if (liElement._sellHandler) {
		liElement.removeEventListener('dblclick', liElement._sellHandler);
	}

	liElement._sellHandler = function sellHandler() {
		const currentData = inventoryData.get(rarityObj.name);
		if (!currentData) return;

		const soldData = soldOutRarities.get(key);
		const alreadySold = soldData ? soldData.count : 0;
		const availableToSell = currentData.count - alreadySold;

		if (availableToSell <= 0) {
			window.showAlert('all copies already sold out!');
			return;
		}

		const snapCount = currentData.count;
		const snapAvailable = availableToSell;
		const pointsEarned = calculateRarityPoints(rarityObj) * snapAvailable;

		showConfirmModal(
			'sell rarity?',
			`sell ${snapAvailable}x ${rarityObj.name} for ${formatNum(pointsEarned)} points? (you keep the rarity)`,
			() => {
				const freshData = inventoryData.get(rarityObj.name);
				if (!freshData) return;
				const freshSold = soldOutRarities.get(key);
				const freshAlready = freshSold ? freshSold.count : 0;
				const actualAvailable = freshData.count - freshAlready;
				if (actualAvailable <= 0) {
					window.showAlert('nothing left to sell!');
					return;
				}
				const actualEarned = calculateRarityPoints(rarityObj) * actualAvailable;
				points += actualEarned;
				soldOutRarities.set(key, { count: freshData.count });
				updatePointsDisplay();
				updateShopUI();
				saveAllData();
				updateItem(freshData);
				recalcLuckMultiplier();
				updateLuckDisplay();
			}
		);
	};
	liElement.addEventListener('dblclick', liElement._sellHandler);
}

function getRandomRarity() {
	return Beacon.roll(rarities, globalLuckMultiplier, inventoryData, shopUpgrades, luckBoostActive);
}

function checkAchievements(currentRarity) {
	let newlyUnlocked = false;
	achievementsList.forEach((ach) => {
		if (!achievementsUnlocked.has(ach.id)) {
			if (ach.check(currentRarity)) {
				achievementsUnlocked.add(ach.id);
				newlyUnlocked = true;
			}
		}
	});
	if (newlyUnlocked) {
		updateAchievementsUI();
		saveAllData();
	}
}

function updateAnomalyUI() {
	const el = document.getElementById('anomalyCount');
	if (!el) return;
	el.textContent = `Anomalies: ${anomalies}`;

	const btn = document.getElementById('consumeAnomalyBtn');
	if (btn) btn.disabled = anomalies <= 0;

	const allBtn = document.getElementById('consumeAllAnomaliesBtn');
	if (allBtn) allBtn.disabled = anomalies <= 0;
}

function awardAnomalyIfEligible(rarityObj) {
	if (!rarityObj) return false;
	const denom = Math.round(1 / rarityObj.chance);
	if (denom > 10000) {
		anomalies++;
		try {
			localStorage.setItem(ANOMALIES_KEY, String(anomalies));
		} catch {}
		showAnomalyPopup('+1 anomaly');
		updateAnomalyUI();
		saveAllData();
		return true;
	}
	return false;
}

function showAnomalyPopup(text) {
	let p = document.getElementById('anomalyPopup');
	if (!p) {
		p = document.createElement('div');
		p.id = 'anomalyPopup';
		document.body.appendChild(p);
	}
	p.textContent = text;
	p.classList.add('show');
	setTimeout(() => p.classList.remove('show'), 1500);

	// feed into notification center
	addNotification(text);
}

// ── Notification Center ────────────────────────────────────────────────
function addNotification(text) {
	notifications.push({
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
		text,
		ts: Date.now(),
		read: false,
	});
	// trim oldest if over cap
	if (notifications.length > NOTIF_MAX) notifications.shift();
	try {
		localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
	} catch (_) {}
	updateNotifBadge();
	if (notifPanelOpen) renderNotifList();
}

function formatNotifTime(ts) {
	const d = new Date(ts);
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	const h = d.getHours(),
		m = String(d.getMinutes()).padStart(2, '0');
	const ampm = h >= 12 ? 'pm' : 'am';
	const time = `${h % 12 || 12}:${m}${ampm}`;

	if (isToday) return time;

	const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	const months = [
		'jan',
		'feb',
		'mar',
		'apr',
		'may',
		'jun',
		'jul',
		'aug',
		'sep',
		'oct',
		'nov',
		'dec',
	];
	const diffDays = Math.floor((now - d) / 86400000);
	if (diffDays < 7) return `${days[d.getDay()]} ${time}`;
	return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear().toString().slice(2)} · ${time}`;
}

function updateNotifBadge() {
	const badge = document.getElementById('notifBadge');
	const bell = document.getElementById('notifBell');
	if (!badge) return;
	const unread = notifications.filter((n) => !n.read).length;
	if (unread === 0) {
		badge.textContent = '';
		badge.classList.remove('visible');
		bell && bell.classList.remove('has-unread');
	} else {
		badge.textContent = unread > 99 ? '100+' : String(unread);
		badge.classList.add('visible');
		bell && bell.classList.add('has-unread');
	}
}

function renderNotifList() {
	const list = document.getElementById('notifList');
	const empty = document.getElementById('notifEmpty');
	if (!list) return;

	if (notifications.length === 0) {
		list.innerHTML = '';
		if (empty) empty.style.display = 'block';
		return;
	}
	if (empty) empty.style.display = 'none';

	list.innerHTML = '';
	// newest first
	[...notifications].reverse().forEach((notif) => {
		const item = document.createElement('div');
		item.className = 'notif-item ' + (notif.read ? 'notif-read' : 'notif-unread');

		const body = document.createElement('div');
		body.className = 'notif-body';

		const txt = document.createElement('div');
		txt.className = 'notif-text';
		txt.textContent = notif.text;

		const time = document.createElement('div');
		time.className = 'notif-time';
		time.textContent = formatNotifTime(notif.ts);

		body.appendChild(txt);
		body.appendChild(time);

		const acts = document.createElement('div');
		acts.className = 'notif-actions';

		if (!notif.read) {
			const readBtn = document.createElement('button');
			readBtn.className = 'notif-btn notif-check';
			readBtn.title = 'mark as read';
			readBtn.textContent = '✓';
			readBtn.onclick = (e) => {
				e.stopPropagation();
				notifMarkRead(notif.id);
			};
			acts.appendChild(readBtn);
		}

		const delBtn = document.createElement('button');
		delBtn.className = 'notif-btn notif-del';
		delBtn.title = 'delete';
		delBtn.textContent = '×';
		delBtn.onclick = (e) => {
			e.stopPropagation();
			notifDelete(notif.id);
		};
		acts.appendChild(delBtn);

		item.appendChild(body);
		item.appendChild(acts);
		item.addEventListener('click', () => notifMarkRead(notif.id));
		list.appendChild(item);
	});
}

function notifMarkRead(id) {
	const n = notifications.find((n) => n.id === id);
	if (n && !n.read) {
		n.read = true;
		try {
			localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
		} catch (_) {}
		updateNotifBadge();
		renderNotifList();
	}
}

function notifMarkAllRead() {
	notifications.forEach((n) => (n.read = true));
	try {
		localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
	} catch (_) {}
	updateNotifBadge();
	renderNotifList();
}

function notifDelete(id) {
	notifications = notifications.filter((n) => n.id !== id);
	try {
		localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
	} catch (_) {}
	updateNotifBadge();
	renderNotifList();
}

function notifClearAll() {
	notifications = [];
	try {
		localStorage.removeItem(NOTIF_KEY);
	} catch (_) {}
	updateNotifBadge();
	renderNotifList();
}

function initNotifCenter() {
	const bell = document.getElementById('notifBell');
	const panel = document.getElementById('notifPanel');
	const markAllBtn = document.getElementById('notifMarkAllRead');
	const clearBtn = document.getElementById('notifClearAll');
	if (!bell || !panel) return;

	bell.addEventListener('click', (e) => {
		e.stopPropagation();
		notifPanelOpen = !notifPanelOpen;
		panel.classList.toggle('open', notifPanelOpen);
		if (notifPanelOpen) renderNotifList();
	});

	document.addEventListener('pointerdown', (e) => {
		if (!notifPanelOpen) return;
		if (!panel.contains(e.target) && !bell.contains(e.target)) {
			notifPanelOpen = false;
			panel.classList.remove('open');
		}
	});

	if (markAllBtn) markAllBtn.addEventListener('click', notifMarkAllRead);
	if (clearBtn) clearBtn.addEventListener('click', notifClearAll);

	updateNotifBadge();
}

function consumeAnomaly() {
	if (anomalies <= 0) {
		window.showAlert('no anomalies to consume :(');
		return;
	}
	anomalies--;
	anomaliesUsed++;
	recalcLuckMultiplier();
	updateAnomalyUI();
	updateLuckDisplay();
	saveAllData();
	showAnomalyPopup('ANOMALY CONSUMED! permanent boost');
}

function consumeAllAnomalies() {
	if (anomalies <= 0) {
		window.showAlert('no anomalies to consume :(');
		return;
	}

	const count = anomalies;
	anomaliesUsed += count;
	anomalies = 0;

	recalcLuckMultiplier();
	updateAnomalyUI();
	updateLuckDisplay();
	saveAllData();
	showAnomalyPopup(`CONSUMED ${count} ANOMALIES! +${(count * 0.5).toFixed(1)}x permanent luck!`);
}

function renderSortedInventory(mode) {
	const savedScroll = inventoryList.scrollTop;
	inventoryList.innerHTML = '';

	let items = Array.from(inventoryData.values());

	if (mode === 'rare') {
		items.sort((a, b) => a.rarityObj.chance - b.rarityObj.chance);
	}

	if (mode === 'common') {
		items.sort((a, b) => b.rarityObj.chance - a.rarityObj.chance);
	}

	if (mode === 'alpha') {
		items.sort((a, b) => a.rarityObj.name.localeCompare(b.rarityObj.name));
	}

	items.forEach((d) => inventoryList.appendChild(d.liElement));
	inventoryList.scrollTop = savedScroll;
}

const savedPoints = localStorage.getItem(POINTS_KEY);
if (savedPoints !== null) points = parseInt(savedPoints, 10) || 0;

const savedUpgrades = localStorage.getItem(SHOP_UPGRADES_KEY);
if (savedUpgrades) {
	try {
		shopUpgrades = JSON.parse(savedUpgrades);
	} catch {}
}

const savedSoldOut = localStorage.getItem(SOLD_OUT_KEY);
if (savedSoldOut) {
	try {
		soldOutRarities = new Map(JSON.parse(savedSoldOut));
	} catch {}
}

shopLuckMultiplier = 1 + shopUpgrades.luck * 0.1;
rollSpeed = Math.max(0.25, 1.0 - shopUpgrades.speed * 0.2);
pointDivisor = Math.max(1.0, 3.0 - shopUpgrades.pointMult * 0.2);

const savedPotions = localStorage.getItem(POTIONS_KEY);
if (savedPotions) {
	try {
		const loaded = JSON.parse(savedPotions);
		// merge into defaults so missing/NaN keys fall back to 0
		for (const key of Object.keys(playerPotions)) {
			const v = loaded[key];
			playerPotions[key] = typeof v === 'number' && !isNaN(v) ? v : 0;
		}
	} catch {}
}

const savedActive = localStorage.getItem(ACTIVE_POTIONS_KEY);
if (savedActive) {
	try {
		const data = JSON.parse(savedActive);
		activePotions = data.active || [];
		duplicateRollsLeft = data.duplicateLeft || 0;
		recalcPotionLuck();
		updateActivePotionsDisplay();
	} catch {}
}

const savedTimestamps = localStorage.getItem(RARITY_TIMESTAMPS_KEY);
if (savedTimestamps) {
	try {
		rarityTimestamps = new Map(JSON.parse(savedTimestamps));
	} catch {}
}
window.rarityTimestamps = rarityTimestamps;

// Called by starmap.js after crystallizing — clears inventory, keeps everything else
window.doCrystallizeReset = function () {
	inventoryData.clear();
	inventoryList.innerHTML = '';
	updateCollectedCounter();
	rarityTimestamps = new Map();
	window.rarityTimestamps = rarityTimestamps;
	localStorage.setItem(RARITY_TIMESTAMPS_KEY, JSON.stringify([]));
	saveAllData();
};

// Called by starmap.js when luck changes
window.applyStarmapLuck = function () {
	recalcLuckMultiplier();
};

async function resetInventory() {
	const confirmed = await window.showConfirm(
		'are you comfortably sure that you will delete your sweet sweet data???',
		'reset data'
	);
	if (!confirmed) return;
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(TOTAL_ROLLS_KEY);
	localStorage.removeItem(ACHIEVEMENTS_KEY);
	localStorage.removeItem(ANOMALIES_KEY);
	localStorage.removeItem(ANOMALIES_USED_KEY);
	localStorage.removeItem(POINTS_KEY);
	localStorage.removeItem(SHOP_UPGRADES_KEY);
	localStorage.removeItem(SOLD_OUT_KEY);
	localStorage.removeItem(LUCK_KEY);
	localStorage.removeItem('daily_lastClaim');
	localStorage.removeItem('daily_streak');
	localStorage.removeItem('weekly_lastClaim');
	localStorage.removeItem('weekly_streak');
	localStorage.removeItem(playtimeKey);
	localStorage.removeItem('userSettings');
	localStorage.removeItem('wishingWell');
	localStorage.removeItem('gauntletData');
	localStorage.removeItem('_beacon_v2');
	localStorage.removeItem('mutationsUnlocked');
	localStorage.removeItem('starmapData');
	localStorage.removeItem('starmapUnlocked');
	localStorage.removeItem(NOTIF_KEY);
	localStorage.removeItem(RARITY_TIMESTAMPS_KEY);
	localStorage.removeItem('mutationTrust');
	localStorage.removeItem('mutationTrustOwned');
	localStorage.removeItem('mutationTrustActive');
	localStorage.removeItem('mutationHistory');
	localStorage.removeItem('mutationBestResult');
	localStorage.removeItem('runesData');
	localStorage.removeItem('runeBlocks');
	localStorage.removeItem('runeGift');
	localStorage.removeItem('runeUpgrades');
	rarityTimestamps = new Map();
	window.rarityTimestamps = rarityTimestamps;
	notifications = [];
	inventoryData.clear();
	inventoryList.innerHTML = '';
	achievementsUnlocked.clear();
	window.hidePageDot?.(3);
	window.hidePageDot?.(4);
	updateAchievementsUI();
	totalRolls = 0;
	updateTotalRolls();
	points = 0;
	anomalies = 0;
	anomaliesUsed = 0;
	shopUpgrades = {
		luck: 0,
		speed: 0,
		pointMult: 0,
		magnet: 0,
		printer: 0,
		duplicate: 0,
	};
	playerPotions = {
		luck2x: 0,
		luck4x: 0,
		luck10x: 0,
		luck50x: 0,
		luck100x: 0,
		luck150x: 0,
		luck250x: 0,
		luck300x: 0,
		luck800x: 0,
		luck1500x: 0,
		duplicate: 0,
	};
	activePotions = [];
	duplicateRollsLeft = 0;
	potionLuckMultiplier = 1;
	localStorage.removeItem(POTIONS_KEY);
	localStorage.removeItem(ACTIVE_POTIONS_KEY);
	updatePotionUI();
	updateActivePotionsDisplay();
	soldOutRarities.clear();
	shopLuckMultiplier = 1.0;
	rollSpeed = 1.0;
	pointDivisor = 3.0;
	totalSeconds = 0;
	recalcLuckMultiplier();
	updatePointsDisplay();
	updateShopUI();
	updateAnomalyUI();
	updatePlaytimeDisplay();
	updateLuckDisplay();
	await window.showAlert('all data reset! it was your choice btw', 'reset complete');
	location.reload();
}

function startLuckBoost() {
	luckBoostActive = true;
	luckBoostEndTime = Date.now() + 60000;
	recalcLuckMultiplier();

	document.getElementById('luckBoostOverlay').style.display = 'flex';

	localStorage.setItem(
		LUCK_KEY,
		JSON.stringify({
			active: luckBoostActive,
			endTime: luckBoostEndTime,
		})
	);

	if (luckInterval) clearInterval(luckInterval);
	luckInterval = setInterval(updateLuckTimer, 200);
}

function updateLuckTimer() {
	const timerEl = document.getElementById('luckTimer');

	const msLeft = luckBoostEndTime - Date.now();

	if (msLeft <= 0) {
		endLuckBoost();
		return;
	}

	timerEl.textContent = Math.ceil(msLeft / 1000);
}

function endLuckBoost() {
	luckBoostActive = false;
	luckBoostEndTime = 0;
	recalcLuckMultiplier();

	document.getElementById('luckBoostOverlay').style.display = 'none';

	if (luckInterval) clearInterval(luckInterval);

	localStorage.removeItem(LUCK_KEY);
}

function checkMuteSettings() {
	try {
		const settingsStr = localStorage.getItem('userSettings');
		if (settingsStr) {
			const settings = JSON.parse(settingsStr);
			if (settings.muted) {
				backgroundMusic.pause();
				backgroundMusic.volume = 0;
				lunarMusic.pause();
				lunarMusic.volume = 0;
				return true;
			}
		}
	} catch (e) {}
	return false;
}

function showRollChoice(res, onDone) {
	const modal = document.getElementById('rollChoiceModal');
	const denom = Math.round(1 / res.chance);
	const pts = calculateRarityPoints(res);

	document.getElementById('rollChoiceRarity').textContent = res.name;
	document.getElementById('rollChoiceChance').textContent = `1/${denom.toLocaleString()}`;
	document.getElementById('rollChoiceSellAmt').textContent = `sell value: ${formatNum(pts)} pts`;
	modal.style.display = 'flex';

	const cleanup = (fn) => {
		modal.style.display = 'none';
		fn();
		onDone();
	};

	document.getElementById('rollChoiceSell').onclick = () =>
		cleanup(() => {
			// add to inventory first so count is correct, THEN mark as sold
			addToInventory(res);
			const currentData = inventoryData.get(res.name);
			if (currentData) {
				soldOutRarities.set(res.name, { count: currentData.count });
			}
			points += pts;
			updatePointsDisplay();
			updateShopUI();
			showAnomalyPopup(`sold ${res.name} for ${formatNum(pts)} pts`);
		});

	document.getElementById('rollChoiceKeep').onclick = () =>
		cleanup(() => {
			addToInventory(res);
		});

	document.getElementById('rollChoicePass').onclick = () =>
		cleanup(() => {
			showAnomalyPopup(`passed on ${res.name}`);
		});
}

function spinAndReveal(res) {
	if (window._spinnerResultAC) {
		window._spinnerResultAC.abort();
		window._spinnerResultAC = null;
	}
	const style = window.spinnerStyleSetting || 'slot';
	const reduceMotion = document.body.classList.contains('reduce-motion');
	const effectiveStyle = reduceMotion && style === 'slot' ? 'none' : style;

	playRollSound();

	if (totalRolls > 0 && totalRolls % 100 === 0) startLuckBoost();

	const finalize = () => {
	    totalRolls++;
	    updateTotalRolls();
	    addToInventory(res);
	    awardAnomalyIfEligible(res);
	    checkAchievements(res);
	    updateRollsSinceRare(res);
	    maybeFireConfettiAndCutscene(res);
	    if (typeof addTrailItem === 'function') {
	        const pillColor = res.style
	            ? (res.style.match(/color\s*:\s*(#[0-9a-fA-F]{3,8}|[a-z]+)/)?.[1] ?? null)
	            : null;
	        addTrailItem(res.name, pillColor);
	    }
	};

	if (effectiveStyle === 'none' || effectiveStyle === 'fade') {
		spinner.innerHTML = '';
		spinner.style.transition = 'none';
		void spinner.offsetWidth;
		spinner.style.transform = 'translateY(0)';

		const d = document.createElement('div');
		d.className = 'spin-item' + (effectiveStyle === 'fade' ? ' result-item' : '');
		d.textContent = res.name;
		spinner.classList.toggle('fade-style', effectiveStyle === 'fade');
		spinner.appendChild(d);

		const delay = effectiveStyle === 'fade' ? 350 : 50;
		setTimeout(() => {
			spinner.classList.remove('fade-style');
			if (res.style && window.RarityStyle) {
				window._spinnerResultAC = window.RarityStyle.apply(d, res.style);
			}
			finalize();
		}, delay);
		return;
	}

	// slot machine path
	spinner.innerHTML = '';
	void spinner.offsetWidth;
	const items = [];
	for (let i = 0; i < 50; i++) {
		items.push(rarities[Math.floor(Math.random() * rarities.length)]);
	}
	items.push(res);

	let _resultSpinDiv = null;
	items.forEach((o, idx) => {
		const d = document.createElement('div');
		d.className = 'spin-item';
		d.textContent = o.name;
		spinner.appendChild(d);
		if (idx === items.length - 1) _resultSpinDiv = d;
	});

	const h = 48,
		total = items.length,
		scroll = h * (total - 1);
	const duration = rollSpeed;
	spinner.style.transition = `transform ${duration}s ease-out`;
	spinner.style.transform = `translateY(-${scroll}px)`;

	setTimeout(
		() => {
			if (res.style && window.RarityStyle && _resultSpinDiv) {
				window._spinnerResultAC = window.RarityStyle.apply(_resultSpinDiv, res.style);
			}
			finalize();
		},
		duration * 1000 + 200
	);
}

function maybeFireConfettiAndCutscene(res) {
	const denom = Math.round(1 / res.chance);
	const cutsceneThresh = window.cutsceneThreshold || 0;
	const confettiThresh = window.confettiThreshold || 0;

	if (confettiThresh > 0 && denom >= confettiThresh) triggerConfetti();

	const hasCutscene = !!cutsceneMap[res.name];
	const cutsceneAllowed = hasCutscene && (cutsceneThresh === 0 || denom >= cutsceneThresh);

	const afterReveal = () => {
		const isMuted = checkMuteSettings();
		if (res.name === 'Lunar') {
			if (!isMuted) {
				lunarMusic.currentTime = 0;
				lunarMusic.play().catch(() => {});
			}
			backgroundMusic.pause();
		} else {
			lunarMusic.pause();
			if (!isMuted) backgroundMusic.play().catch(() => {});
		}
		rollBtn.disabled = false;
		debouncedSave();
	};

	if (cutsceneAllowed) {
		playCutscene(res.name, afterReveal);
	} else {
		afterReveal();
	}
}

let _saveTimer = null;
function debouncedSave(delay = 1500) {
	clearTimeout(_saveTimer);
	_saveTimer = setTimeout(saveAllData, delay);
}

// Force immediate save when tab is hidden
document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		clearTimeout(_saveTimer);
		saveAllData();
	}
});

// well timer: use a single module-level guard so rapid throws don't stack intervalss yeshvydvfwafvwhjk
let wellTimerInterval = null;
function startWellCooldownTimer() {
	if (wellTimerInterval) return; // already running, don't stack
	wellTimerInterval = setInterval(() => {
		updateWellUI();
		if (!isWellOnCooldown()) {
			clearInterval(wellTimerInterval);
			wellTimerInterval = null;
		}
	}, 1000);
}

const sortSelect = document.getElementById('sortSelect');

rollBtn.addEventListener('click', () => {
    if (isCutscenePlaying) return;
    rollBtn.disabled = true;

    try {
        spinner.style.transition = 'none';
        void spinner.offsetWidth;
        spinner.style.transform = 'translateY(0)';

        const result = getRandomRarity();
        const res = result.rarity;

        if (result.wasPity) showAnomalyPopup('pity triggered!');
        if (result.isHotPulse) rollBtn.classList.add('hot-pulse');
        else rollBtn.classList.remove('hot-pulse');

        const isMuted = checkMuteSettings();
        if (!isMuted && backgroundMusic.paused && res.name !== 'Lunar') {
            backgroundMusic.play().catch(() => {});
        }

        setTimeout(() => {
            try {
                spinAndReveal(res);
            } catch (e) {
                console.error('spinAndReveal failed:', e);
                rollBtn.disabled = false;
            }
        }, 100);
    } catch (e) {
        console.error('roll failed:', e);
        rollBtn.disabled = false;
    }
});

document.addEventListener('visibilitychange', () => {
	if (document.hidden) return;

	if (luckBoostActive && Date.now() >= luckBoostEndTime) {
		endLuckBoost();
	}

	if (activePotions.length > 0) {
		recalcPotionLuck();
		updateActivePotionsDisplay();
	}

	if (!isCutscenePlaying && rollBtn.disabled) {
		spinner.style.transition = 'none';
		spinner.style.transform = 'translateY(0)';
		spinner.innerHTML = '';
		rollBtn.disabled = false;
	}
});

if (sortSelect) {
	sortSelect.addEventListener('change', () => {
		renderSortedInventory(sortSelect.value);
	});
}

resetBtn.addEventListener('click', resetInventory);

loadAllData();
updateTotalRolls();
updatePotionUI();
recalcLuckMultiplier();
updatePointsDisplay();
updateShopUI();
const ls = localStorage.getItem(LUCK_KEY);
if (ls) {
	try {
		const obj = JSON.parse(ls);
		if (obj.active && obj.endTime > Date.now()) {
			luckBoostActive = true;
			luckBoostEndTime = obj.endTime;
			document.getElementById('luckBoostOverlay').style.display = 'flex';
			luckInterval = setInterval(updateLuckTimer, 200);
		} else {
			localStorage.removeItem(LUCK_KEY);
		}
	} catch {}
}

function updateCollectedCounter() {
	const collected = inventoryData.size;
	const total = rarities.length;
	document.getElementById('collectedCounter').textContent = `${collected}/${total} collected`;
}

updateAchievementsUI();
updateCollectedCounter();

const consumeBtn = document.getElementById('consumeAnomalyBtn');
if (consumeBtn) {
	consumeBtn.addEventListener('click', () => {
		consumeAnomaly();
	});
}

const consumeAllBtn = document.getElementById('consumeAllAnomaliesBtn');
if (consumeAllBtn) {
	consumeAllBtn.addEventListener('click', () => {
		consumeAllAnomalies();
	});
}

updateAnomalyUI();
renderSortedInventory(sortSelect.value);

setInterval(saveAllData, 10000);

document.addEventListener('DOMContentLoaded', () => {
	const btn = document.getElementById('rollBtn');
	if (btn) {
		btn.addEventListener('click', () => {
			btn.classList.remove('scale-up');
			void btn.offsetWidth;
			btn.classList.add('scale-up');
		});
	} else {
		console.warn('rollBtn not found');
	}
});

function formatPlaytime(seconds) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

const weeklyBtn = document.getElementById('weeklyBtn');
const weeklyStatus = document.getElementById('weeklyStatus');

function loadWeeklyData() {
	return {
		lastClaim: localStorage.getItem('weekly_lastClaim'),
		streak: Number(localStorage.getItem('weekly_streak') || 0),
	};
}

function saveWeeklyData(lastClaim, streak) {
	localStorage.setItem('weekly_lastClaim', lastClaim);
	localStorage.setItem('weekly_streak', streak);
}

function updateWeeklyUI() {
	const { lastClaim, streak } = loadWeeklyData();
	const now = Date.now();
	const oneWeek = 7 * 24 * 60 * 60 * 1000;

	if (!lastClaim || now - Number(lastClaim) >= oneWeek) {
		weeklyBtn.disabled = false;
		weeklyStatus.textContent = `weekly reward available · streak: ${streak}`;
	} else {
		weeklyBtn.disabled = true;
		weeklyStatus.textContent = `weekly claimed · streak: ${streak}`;
	}
}

weeklyBtn.addEventListener('click', async () => {
	const { lastClaim, streak } = loadWeeklyData();
	const now = Date.now();
	const oneWeek = 7 * 24 * 60 * 60 * 1000;

	// Guard: shouldn't be reachable if UI is correct, but be safe
	if (lastClaim && now - Number(lastClaim) < oneWeek) return;

	let newStreak;
	if (!lastClaim) {
		newStreak = 1;
	} else {
		const diffWeeks = Math.floor((now - Number(lastClaim)) / oneWeek);
		// streak continues only if exactly 1 week passed; 2+ weeks resets
		newStreak = diffWeeks === 1 ? streak + 1 : 1;
	}

	saveWeeklyData(now.toString(), newStreak);
	updateWeeklyUI();
	await window.showAlert(`weekly claimed!\nstreak: ${newStreak}`, 'weekly reward');
});

const dailyBtn = document.getElementById('dailyBtn');
const dailyStatus = document.getElementById('dailyStatus');

function getToday() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function loadDailyData() {
	return {
		lastClaim: localStorage.getItem('daily_lastClaim'),
		streak: Number(localStorage.getItem('daily_streak') || 0),
	};
}

function saveDailyData(lastClaim, streak) {
	localStorage.setItem('daily_lastClaim', lastClaim);
	localStorage.setItem('daily_streak', streak);
}

function updateDailyUI() {
	const { lastClaim, streak } = loadDailyData();
	const today = getToday();

	if (lastClaim === today) {
		dailyBtn.disabled = true;
		dailyStatus.textContent = `daily claimed · streak: ${streak}`;
	} else {
		dailyBtn.disabled = false;
		dailyStatus.textContent = `daily available · current streak: ${streak}`;
	}
}

dailyBtn.addEventListener('click', async () => {
	const today = getToday();
	const { lastClaim, streak } = loadDailyData();
	let newStreak = streak;
	if (!lastClaim) {
		newStreak = 1;
	} else {
		const last = new Date(lastClaim);
		const now = new Date(today);
		const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
		if (diffDays === 1) {
			newStreak += 1;
		} else if (diffDays > 1) {
			newStreak = 1;
		}
	}
	saveDailyData(today, newStreak);
	updateDailyUI();
	await window.showAlert(`daily claimed!\nstreak: ${newStreak}`, 'daily reward');
});

updateDailyUI();
updateWeeklyUI();

const genBtn = document.getElementById('generateRunCard');
if (genBtn) genBtn.addEventListener('click', generateRunCard);
else
	console.warn(
		'generateRunCard button not found in DOM, maybe consider... adding it in the DOM????'
	);

function generateRunCard() {
	const W = 720,
		H = 400;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, W, H);

	ctx.font = '13px monospace';

	let y = 0;
	const line = (text, color = '#ddd') => {
		ctx.fillStyle = color;
		ctx.fillText(text, 30, (y += 22));
	};
	const gap = () => {
		y += 8;
	};
	const dim = (text) => line(text, '#555');

	line("auth's RNG  :::  run summary");
	dim('─'.repeat(54));
	gap();

	line(`total rolls      ${formatNum(totalRolls)}`);
	line(`playtime         ${formatPlaytime(totalSeconds)}`);
	line(`run id           ${runId}`);

	gap();
	dim('─'.repeat(54));
	gap();

	line(`points           ${formatNum(points)}`);
	line(`luck mult        ${formatMult(globalLuckMultiplier)}x`);
	line(
		`shop luck        lv${shopUpgrades.luck}  speed lv${shopUpgrades.speed}  pts lv${shopUpgrades.pointMult}`
	);
	line(`anomalies        ${anomalies} held  /  ${anomaliesUsed} consumed`);
	line(`collected        ${inventoryData.size} / ${rarities.length}`);
	line(`achievements     ${achievementsUnlocked.size} / ${achievementsList.length}`);

	gap();
	dim('─'.repeat(54));
	gap();

	const rarest = Array.from(inventoryData.values()).sort(
		(a, b) => a.rarityObj.chance - b.rarityObj.chance
	)[0];

	if (rarest) {
		const d = Math.round(1 / rarest.rarityObj.chance).toLocaleString();
		line(`rarest rolled    ${rarest.rarityObj.name} (1/${d})`);
	} else {
		line(`rarest rolled    (none yet)`);
	}

	dim(`generated        ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`);

	ctx.fillStyle = '#444';
	ctx.font = '11px monospace';
	ctx.textAlign = 'right';
	ctx.fillText("play auth's RNG at authsrng.xyz!!!!", W - 30, H - 12);
	ctx.textAlign = 'left';

	const a = document.createElement('a');
	a.href = canvas.toDataURL('image/png');
	a.download = 'authsrng_run.png';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

window.backgroundMusic = backgroundMusic;
window.lunarMusic = lunarMusic;

const buyMagnetBtn = document.getElementById('buyMagnetBtn');
if (buyMagnetBtn) {
	buyMagnetBtn.addEventListener('click', () => {
		const cost = 500 + (shopUpgrades.magnet || 0) * 1000;
		if (points >= cost && (shopUpgrades.magnet || 0) < 5) {
			points -= cost;
			shopUpgrades.magnet = (shopUpgrades.magnet || 0) + 1;
			updatePointsDisplay();
			updateShopUI();
			saveAllData();
		}
	});
}

const buyPrinterBtn = document.getElementById('buyPrinterBtn');
if (buyPrinterBtn) {
	buyPrinterBtn.addEventListener('click', () => {
		const level = shopUpgrades.printer || 0;
		const cost = 1000 + level * level * 500;
		if (points >= cost) {
			points -= cost;
			shopUpgrades.printer = level + 1;
			updatePointsDisplay();
			updateShopUI();
			saveAllData();
		}
	});
}

const buyDupeBtn = document.getElementById('buyDupeBtn');
if (buyDupeBtn) {
	buyDupeBtn.addEventListener('click', () => {
		const level = shopUpgrades.duplicate || 0;
		const cost = 800 + level * level * 400;
		if (points >= cost && level < 10) {
			points -= cost;
			shopUpgrades.duplicate = level + 1;
			updatePointsDisplay();
			updateShopUI();
			saveAllData();
		}
	});
}

document.addEventListener('DOMContentLoaded', function () {
	const indexBtn = document.getElementById('indexBtn');
	const indexModal = document.getElementById('indexModal');
	const indexClose = document.getElementById('indexClose');
	const indexList = document.getElementById('indexList');
	const indexStats = document.getElementById('indexStats');
	const indexSearch = document.getElementById('indexSearch');

	// Safety check
	if (!indexBtn || !indexModal || !indexClose || !indexList || !indexStats) {
		console.warn('Index elements not found. Make sure modal HTML is in the page.');
		return;
	}

	function openIndex() {
		updateIndexDisplay();
		indexModal.classList.add('show');
		if (indexSearch) {
			indexSearch.value = '';
			indexSearch.focus();
		}
	}

	function closeIndex() {
		indexModal.classList.remove('show');
	}

	function updateIndexDisplay(searchTerm = '') {
		// Update stats
		const collected = inventoryData.size;
		const total = rarities.length;
		indexStats.textContent = `${collected}/${total} collected`;

		// Clear and rebuild list
		indexList.innerHTML = '';

		// Sort rarities by chance (RAREST FIRST - smallest chance value = rarest)
		const sortedRarities = [...rarities].sort((a, b) => a.chance - b.chance);

		// Filter by search term
		const filteredRarities = searchTerm
			? sortedRarities.filter((rarity) => {
					const isUnlocked = inventoryData.has(rarity.name);
					// Only search unlocked rarities by name
					return isUnlocked && rarity.name.toLowerCase().includes(searchTerm.toLowerCase());
				})
			: sortedRarities;

		// Show message if no results
		if (filteredRarities.length === 0 && searchTerm) {
			const noResults = document.createElement('div');
			noResults.style.textAlign = 'center';
			noResults.style.opacity = '0.5';
			noResults.style.padding = '20px';
			noResults.textContent = 'no rarities found';
			indexList.appendChild(noResults);
			return;
		}

		filteredRarities.forEach((rarity) => {
			const isUnlocked = inventoryData.has(rarity.name);
			const count = isUnlocked ? inventoryData.get(rarity.name).count : 0;

			const item = document.createElement('div');
			item.className = `index-item ${isUnlocked ? 'unlocked' : 'locked'}`;

			const leftSide = document.createElement('div');
			leftSide.style.display = 'flex';
			leftSide.style.alignItems = 'center';

			const name = document.createElement('div');
			name.className = 'index-item-name';
			name.textContent = isUnlocked ? rarity.name : '???';

			const chance = document.createElement('div');
			chance.className = 'index-item-chance';
			const denom = Math.round(1 / rarity.chance);
			chance.textContent = isUnlocked ? `1/${denom}` : '1/???';
			chance.style.marginLeft = '12px';

			leftSide.appendChild(name);
			leftSide.appendChild(chance);

			const rightSide = document.createElement('div');
			if (isUnlocked && count > 0) {
				const countEl = document.createElement('div');
				countEl.className = 'index-item-count';
				countEl.textContent = `x${count}`;
				rightSide.appendChild(countEl);
			}

			item.appendChild(leftSide);
			item.appendChild(rightSide);
			indexList.appendChild(item);
		});
	}

	// Event listeners
	indexBtn.addEventListener('click', openIndex);
	indexClose.addEventListener('click', closeIndex);

	// Search functionality
	if (indexSearch) {
		indexSearch.addEventListener('input', (e) => {
			updateIndexDisplay(e.target.value);
		});
	}

	// Close on background click
	indexModal.addEventListener('click', (e) => {
		if (e.target === indexModal) {
			closeIndex();
		}
	});

	// Close on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && indexModal.classList.contains('show')) {
			closeIndex();
		}
	});
});

document.addEventListener('keydown', (e) => {
	if (e.repeat) return;
	if (
		e.target.tagName === 'INPUT' ||
		e.target.tagName === 'TEXTAREA' ||
		e.target.tagName === 'SELECT'
	) {
		return;
	}

	const key = e.key.toLowerCase();

	// fucking spacebar to roll
	if (key === ' ' || key === '+') {
		e.preventDefault();
		const rollBtn = document.getElementById('rollBtn');
		if (rollBtn && !rollBtn.disabled) {
			rollBtn.click();
		}
	}

	// A = Previous page, D = Next page
	if (key === 'a') {
		e.preventDefault();
		const prevBtn = document.getElementById('prevPage');
		if (prevBtn && !prevBtn.disabled) {
			prevBtn.click();
		}
	}

	if (key === 'd') {
		e.preventDefault();
		const nextBtn = document.getElementById('nextPage');
		if (nextBtn && !nextBtn.disabled) {
			nextBtn.click();
		}
	}

	// fucking W to click even when theres a button on your mouse dedicated to fucking doing that
	if (key === 'w') {
		e.preventDefault();
		const elementUnderCursor = document.elementFromPoint(
			window.lastMouseX || window.innerWidth / 2,
			window.lastMouseY || window.innerHeight / 2
		);
		if (elementUnderCursor) {
			elementUnderCursor.click();
		}
	}
});

// Track mouse position for W key
window.lastMouseX = window.innerWidth / 2;
window.lastMouseY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
	window.lastMouseX = e.clientX;
	window.lastMouseY = e.clientY;
});

const WELL_KEY = 'wishingWell';
const WELL_COOLDOWN = 2 * 60 * 60 * 1000;

let wellData = {
	lastThrow: 0,
	totalThrown: 0,
	totalReceived: 0,
	timesThrown: 0,
	successes: 0,
};

function loadWellData() {
	const saved = localStorage.getItem(WELL_KEY);
	if (saved) {
		try {
			const parsed = JSON.parse(saved);
			// merge so any missing fields fall back to defaults above
			wellData = {
				lastThrow: parsed.lastThrow || 0,
				totalThrown: parsed.totalThrown || 0,
				totalReceived: parsed.totalReceived || 0,
				timesThrown: parsed.timesThrown || 0,
				successes: parsed.successes || 0, // guarded
			};
		} catch (e) {
			console.error('Failed to load well data:', e);
		}
	}
	updateWellUI();
}

// Save well data
function saveWellData() {
	localStorage.setItem(WELL_KEY, JSON.stringify(wellData));
}

// Set well amount from quick buttons
function setWellAmount(amount) {
	const input = document.getElementById('wellInput');
	if (input) input.value = amount;
}

// Check if well is on cooldown
function isWellOnCooldown() {
	const now = Date.now();
	const timeSinceLastThrow = now - wellData.lastThrow;
	return timeSinceLastThrow < WELL_COOLDOWN;
}

// Get remaining cooldown time
function getRemainingCooldown() {
	const now = Date.now();
	const elapsed = now - wellData.lastThrow;
	const remaining = WELL_COOLDOWN - elapsed;
	return Math.max(0, remaining);
}

// Format time for display
function formatWellTime(ms) {
	const hours = Math.floor(ms / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	const seconds = Math.floor((ms % (60 * 1000)) / 1000);

	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

function updateWellUI() {
	const status = document.getElementById('wellStatus');
	const timer = document.getElementById('wellTimer');
	const throwBtn = document.getElementById('throwWellBtn');
	const totalThrown = document.getElementById('wellTotalThrown');
	const totalReceived = document.getElementById('wellTotalReceived');
	const timesThrown = document.getElementById('wellTimesThrown');
	const successRate = document.getElementById('wellSuccessRate');

	if (!status || !timer || !throwBtn) return;

	if (isWellOnCooldown()) {
		const remaining = getRemainingCooldown();
		throwBtn.disabled = true;
		status.textContent = 'the well is recovering its magic...';
		timer.textContent = `available in: ${formatWellTime(remaining)}`;
	} else {
		throwBtn.disabled = false;
		status.textContent = 'ready to accept your offering';
		timer.textContent = '';
	}

	if (totalThrown) totalThrown.textContent = formatNum(wellData.totalThrown);
	if (totalReceived) totalReceived.textContent = formatNum(wellData.totalReceived);
	if (timesThrown) timesThrown.textContent = formatNum(wellData.timesThrown);
	if (successRate) {
		const rate =
			wellData.timesThrown > 0 ? Math.round((wellData.successes / wellData.timesThrown) * 100) : 0;
		successRate.textContent = `${rate}%`;
	}
}

function throwIntoWell() {
	const input = document.getElementById('wellInput');
	const amount = parseInt(input.value) || 0;

	if (amount <= 0) {
		window.showAlert('you must throw at least 1 point!');
		return;
	}

	if (amount > points) {
		window.showAlert(`you only have ${formatNum(points)} points!`);
		return;
	}

	if (isWellOnCooldown()) {
		window.showAlert('the well is still recovering its magic!');
		return;
	}

	points -= amount;
	updatePointsDisplay();
	createWellRipple();

	const won = Beacon.float() < 0.4;

	wellData.lastThrow = Date.now();
	wellData.totalThrown += amount;
	wellData.timesThrown++;

	if (won) {
       const reward = amount * 2;
       points += reward;
       wellData.totalReceived += reward;
 	   wellData.successes++;
 	   updatePointsDisplay();
 	   showWellResult(true, reward);
	} else {
	    showWellResult(false, amount);
	}

	saveWellData();
	saveAllData();
	updateWellUI();
	input.value = '';
	startWellCooldownTimer();
}

// Create ripple animation
function createWellRipple() {
	const visual = document.getElementById('wellVisual');
	if (!visual) return;

	const ripple = document.createElement('div');
	ripple.className = 'well-ripple';
	visual.appendChild(ripple);

	setTimeout(() => {
		ripple.remove();
	}, 1500);
}

// Show result modal
function showWellResult(won, amount) {
	const modal = document.getElementById('wellResultModal');
	const icon = document.getElementById('wellResultIcon');
	const text = document.getElementById('wellResultText');
	const amountEl = document.getElementById('wellResultAmount');

	if (!modal || !icon || !text || !amountEl) return;

	if (won) {
		icon.textContent = '✨';
		text.textContent = 'the well grants your wish!';
		amountEl.textContent = `it gives you +${formatNum(amount)} points, go thank it!`;
		amountEl.style.color = '#4a4';
	} else {
		icon.textContent = '🌊';
		text.textContent = 'the well accepts your offering...';
		amountEl.textContent = 'but nothing happens.. whoops?';
		amountEl.style.color = '#888';
	}

	modal.classList.add('show');
}

// Close result modal
function closeWellResult() {
	const modal = document.getElementById('wellResultModal');
	if (modal) modal.classList.remove('show');
}

// Initialize welling well
loadWellData();

// add da tee event listener to throw button
const throwWellBtn = document.getElementById('throwWellBtn');
if (throwWellBtn) {
	throwWellBtn.addEventListener('click', throwIntoWell);
}

// CFGVHHSUGDCSVHBDJOKVHBHFDSJDOJFBH VSBJNSUHNKXJBHVGCTFDFGHIJNKJBHVGCFXRDTFYGUHINKMTDFGKN ,MNDWBGVFYGHEK;F,NKRG
if (isWellOnCooldown()) {
	// human centipede fucking bitches asshole whoa im so not family friendly WHY IS THERE AN ERROR HERE
	startWellCooldownTimer();
}

window.refreshAllDisplays = function () {
	updatePointsDisplay();
	updateShopUI();
	updateTotalRolls();
	updateLuckDisplay();
};

// FINISH THIS SCRIPT A;READY
window.setWellAmount = setWellAmount;
window.closeWellResult = closeWellResult;
document.addEventListener('DOMContentLoaded', () => initNotifCenter()); // YAYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
