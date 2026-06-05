// ===== GAUNTLET SYSTEM AHHHHHH I HATE EVERYTHINGGBGNGNFJFBDKSGAJISVD =====

console.log(performance.now());

(function () {
	'use strict';
	const GAUNTLET_KEY = 'gauntletData';

	const GLOBAL_POOL = [
		// --- the main entries ---
		'Lunar',
		'Deneb',
		'Regulus',
		'Hopeless',
		'Altair',
		'Spica',
		'Achernar',
		'Hadar',
		'Canopus',
		'Starlight',
		'Proxima',
		'Eclipse',
		'Constellation',
		'Gold',
		'Jellyfish',
		'Twilight',
		'Lunarity',
		'Wildfire',
		'Eagle',
		'Paradox',
		'Helix',
		'Duration',
		'Ring',
		'Despair',
		'Carina',
		'Tarantula',
		'Insanity',
		'Rosette',
		'Eskimo',
		'Lagoon',
		'Trifid',
		'Solstice',
		'Orion',
		'Crab',
		'Paralysis',
		'Veil',
		'Dumbbell',
		'Owl',
		'Butterfly',
		'funny haha',
		'Purpose',
		'Pelican',
		'Swan',
		'California',
		'Cone',
		'Iris',
		'still playing?',
		'wowie',
		'Heart',
		'Soul',
		'Aperture',
		'Flame',
		'<>',
		'Keyhole',
		'Inferno',
		'Tempered',
		'Documented',
		'Matrix',
		'Grayscale',
		'Homunculus',
		'Garden',
		'Constant',
		'Trapezium',
		'Access',
		'Betelgeuse',
		'Gladiator',
		'Rigel',
		'Sirius',
		'Amethyst',
		'Blink',
		'Cobalt',
		'Procyon',
		'Terrifying',
		'Aldebaran',
		'Heliocentric',
		'Antares',
		'Arcturus',
		'Vega',
		'anyone there?',
		'Capella',
		'Stressed',
		'Pollux',
		'Divine',
		'Fomalhaut',
		'Meteor',
		'Appalled',
		'Dreamy',
		'Index',
		'Catastropic',
		'Gravity',
		'Equations',
		'Tidal',
		'Lucky',
		'IO',
		'Merciful',
		'Worried',
		'the spooky',
		'Process',
		'Celestial',

		// --- easier end (~1/500–~1/749) ---
		'Divinity',
		'Lonely',
		'Storm',
		'Cosmos',
		'Glass',
		'Lazer',
		'Jetdroid',
		'Prism',
		'Ultra',
		'Astral',
		'Fearful',

		// --- harder end (~1/2101–~1/3000) ---
		'horsehead hahahaha',
		'Pillars',
		'Verbose',
		'Coherence',
		'Thoughts',
		'Equinox',
		'Overload',
		'pale',
		'Terminal',
		'Micro',
		'kappa',
		'Peripherals',
		'bridged',
		'Alpha',
		'Daydream',
		'Experience',
		'Desire',
		'Delta',
		'Lambda',
		'Omega',
		'Upsilon',
		'Prophetic',
		'Top',
		'Bottom',
		'Nightmare',
		'Strange',
		'Charm',
		'Pixelated',
		'Quark',
		'MURDER',
		'Graviton',
		'Gluon',
		'Poltergeist',
		'Boson',
		'Spectra',
		'Fermion',
		'The End?',
	];

	// This is where you make the fucking gauntlets... it's like making a new rarity except if it took 5x longer to make one
	const TIERS = [
		{
			id: 'global',
			name: 'global',
			emoji: '🌐',
			minRolls: 0,
			isGlobal: true,
			rewards: [
				{ type: 'points', amount: 5000, label: '5,000 pts' },
				{ type: 'anomaly', amount: 5, label: '5 anomalies' },
				{ type: 'luck', mult: 2, dur: 60, label: '1m 2x luck' },
			],
		},
		{
			id: 'easy',
			name: 'easy',
			emoji: '⚡',
			minRolls: 0,
			rarities: ['Common', 'Uncommon', 'Garbage', 'Blown', 'Cool', 'Tired'],
			rewards: [
				{ type: 'points', amount: 500, label: '500 pts' },
				{ type: 'anomaly', amount: 1, label: '1 anomaly' },
				{ type: 'luck', mult: 1.5, dur: 30, label: '30s 1.5x luck' },
			],
		},
		{
			id: 'medium',
			name: 'medium',
			emoji: '🔵',
			minRolls: 500,
			rarities: ['Rainbow', 'Jupiter', 'Superior', 'Troubled', 'Fabled'],
			rewards: [
				{ type: 'points', amount: 5000, label: '5,000 pts' },
				{ type: 'anomaly', amount: 5, label: '5 anomalies' },
				{ type: 'luck', mult: 2, dur: 45, label: '45s 2x luck' },
			],
		},
		{
			id: 'hard',
			name: 'hard',
			emoji: '🔴',
			minRolls: 1500,
			rarities: ['Eclipse', 'Wildfire', 'Despair', 'Paradox', 'Lunarity'],
			rewards: [
				{ type: 'points', amount: 25000, label: '25,000 pts' },
				{ type: 'anomaly', amount: 20, label: '20 anomalies' },
				{ type: 'luck', mult: 2.5, dur: 60, label: '1m 2.5x luck' },
			],
		},
		{
			id: 'insane',
			name: 'insane',
			emoji: '💀',
			minRolls: 3000,
			rarities: ['Breakdown', 'Depression', 'Supergalaxy', 'Pulsar'],
			rewards: [
				{ type: 'points', amount: 100000, label: '100,000 pts' },
				{ type: 'anomaly', amount: 100, label: '100 anomalies' },
				{ type: 'luck', mult: 3, dur: 120, label: '2m 3x luck' },
			],
		},
		{
			id: 'godlike',
			name: 'godlike',
			emoji: '✨',
			minRolls: 6000,
			rarities: ['Psychosis', 'CHARGED', 'SCHIZOPHRENIC'],
			rewards: [
				{ type: 'points', amount: 500000, label: '500,000 pts' },
				{ type: 'anomaly', amount: 1000, label: '1,000 anomalies' },
				{ type: 'luck', mult: 4, dur: 180, label: '3m 4x luck' },
			],
		},
		{
			id: 'inferno',
			name: 'inferno',
			emoji: '🔥',
			minRolls: 10000,
			rarities: ['Galactic', 'rare rarity :3', 'Disorder'],
			rewards: [
				{ type: 'points', amount: 1000000, label: '1,000,000 pts' },
				{ type: 'anomaly', amount: 1800, label: '1,800 anomalies' },
				{ type: 'luck', mult: 5, dur: 300, label: '5m 5x luck' },
			],
		},
		{
			id: 'snowy',
			name: 'snowy',
			emoji: '❄️',
			minRolls: 20000,
			rarities: ['Cosmic', 'Neurosis', 'Trauma', 'Mania'],
			rewards: [
				{ type: 'points', amount: 1200000, label: '1,200,000 pts' },
				{ type: 'anomaly', amount: 3000, label: '3,000 anomalies' },
				{ type: 'luck', mult: 7, dur: 360, label: '6m 7x luck' },
			],
		},
		{
			id: 'eon',
			name: 'eon',
			emoji: '🌌',
			minRolls: 40000,
			rarities: ['Interstellar', 'Delusion', 'Psychosis', 'STOP PLAYING'],
			rewards: [
				{ type: 'anomaly', amount: 10000, label: '10,000 anomalies' },
				{ type: 'luck', mult: 8, dur: 480, label: '8m 8x luck' },
				{ type: 'unlock_mutations', label: 'unlock mutations! 🧬' },
			],
		},
		{
			id: 'void',
			name: 'void',
			emoji: '🌑',
			minRolls: 80000,
			rarities: ['Nebulous', 'panic!', 'just let go already', 'kill me'],
			rewards: [
				{ type: 'points', amount: 5000000, label: '5,000,000 pts' },
				{ type: 'anomaly', amount: 8000, label: '8,000 anomalies' },
				{ type: 'luck', mult: 10, dur: 600, label: '10m 10x luck' },
			],
		},
		{
			id: 'abyss',
			name: 'abyss',
			emoji: '🕳️',
			minRolls: 175000,
			rarities: ['Event Horizon', 'anxiety...', 'Gravitational', 'Dissociative'],
			rewards: [
				{ type: 'points', amount: 20000000, label: '20,000,000 pts' },
				{ type: 'anomaly', amount: 25000, label: '25,000 anomalies' },
				{ type: 'unlock_runes', label: 'unlock runes 🔷' },
			],
		},
		{
			id: 'eclipse_gate',
			name: 'eclipse',
			emoji: '🌒',
			minRolls: 400000,
			rarities: ['Impossible...', 'Obsession', 'Kyawthuite', 'Supermassive'],
			rewards: [
				{ type: 'points', amount: 100000000, label: '100,000,000 pts' },
				{ type: 'anomaly', amount: 75000, label: '75,000 anomalies' },
				{ type: 'luck', mult: 20, dur: 900, label: '15m 20x luck' },
			],
		},
		{
			id: 'oblivion',
			name: 'oblivion',
			emoji: '💫',
			minRolls: 900000,
			rarities: ['some sort of paranoia', 'smoking gun', 'Extinction', 'Multiverse'],
			rewards: [
				{ type: 'points', amount: 500000000, label: '500,000,000 pts' },
				{ type: 'anomaly', amount: 250000, label: '250,000 anomalies' },
				{ type: 'unlock_starmap', label: 'unlock starmap ✦' },
			],
		},
		{
			id: 'transcendence',
			name: 'transcendence',
			emoji: '☀️',
			minRolls: 2500000,
			rarities: ['Void', 'Dissociation', 'Antimatter', 'the world'],
			rewards: [
				{ type: 'points', amount: 1000000000, label: '1,000,000,000 pts' },
				{ type: 'anomaly', amount: 1000000, label: '1,000,000 anomalies' },
				{ type: 'luck', mult: 50, dur: 1800, label: '30m 50x luck' },
			],
		},
	];

	// pre-register gauntlet luck keys in potionData so main.js never
	// crashes on a page-reload while a gauntlet luck is still active and shit
	[
		'global',
		'easy',
		'medium',
		'hard',
		'insane',
		'godlike',
		'inferno',
		'snowy',
		'eon',
		'void',
		'abyss',
		'eclipse_gate',
		'oblivion',
		'transcendence',
	].forEach((id) => {
		if (typeof potionData !== 'undefined') {
			potionData['_g_' + id] = {
				name: id + ' luck',
				emoji: '🏆',
				mult: 1,
				duration: 0,
			};
		}
	});

	function formatWellTime(ms) {
		if (typeof window.formatWellTime === 'function') return window.formatWellTime(ms);
		// local fallback
		const h = Math.floor(ms / 3600000);
		const m = Math.floor((ms % 3600000) / 60000);
		const s = Math.floor((ms % 60000) / 1000);
		if (h > 0) return h + 'h ' + m + 'm';
		if (m > 0) return m + 'm ' + s + 's';
		return s + 's';
	}

	// ── helpers ──────────────────────────────────────────────────────────
	function loadData() {
		try {
			return JSON.parse(localStorage.getItem(GAUNTLET_KEY) || '{}');
		} catch {
			return {};
		}
	}
	function saveData(d) {
		localStorage.setItem(GAUNTLET_KEY, JSON.stringify(d));
	}

	function checkRotationChange() {
		const d = loadData();
		const current = rotIdx();
		if (d.lastSeenRot === undefined) {
			// first ever load, just store it silently
			d.lastSeenRot = current;
			saveData(d);
			return;
		}
		if (d.lastSeenRot !== current) {
			d.lastSeenRot = current;
			saveData(d);
			if (typeof addNotification === 'function') {
				addNotification('🌐 the global gauntlet rotation changed! new rarities are available.');
			}
		}
	}

	function seededRand(s) {
		const x = Math.sin(s + 1.23456789) * 10000;
		return x - Math.floor(x);
	}
	function rotIdx() {
		return Math.floor(Date.now() / (2 * 24 * 60 * 60 * 1000));
	}

	function getGlobalRarities() {
		const rot = rotIdx();
		// shuffle a copy of the pool with the seeded RNG, then take first 3
		const indices = Array.from({ length: GLOBAL_POOL.length }, (_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(seededRand(rot * 97 + i * 31) * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		return indices.slice(0, 3).map((i) => GLOBAL_POOL[i]);
	}

	function getTierRarities(t) {
		return t.isGlobal ? getGlobalRarities() : t.rarities;
	}

	function isLocked(t) {
		return (typeof totalRolls !== 'undefined' ? totalRolls : 0) < t.minRolls;
	}
	function isComplete(t, d) {
		if (typeof inventoryData === 'undefined') return false;

		const stateKey = t.isGlobal ? 'global' : t.id;
		const tierState = d[stateKey];

		if (!tierState) {
			return getTierRarities(t).every((n) => inventoryData.has(n));
		}

		const lastClaimTime = tierState.lastClaimTime ?? 0;
		return getTierRarities(t).every((n) => {
			if (!inventoryData.has(n)) return false;
			const ts =
				typeof window.rarityTimestamps !== 'undefined' ? (window.rarityTimestamps.get(n) ?? 0) : 0;
			return ts > lastClaimTime;
		});
	}

	function canClaim(t, d) {
		if (t.isGlobal) return ((d.global && d.global.lastRot) ?? -1) < rotIdx();
		const last = (d[t.id] && d[t.id].lastClaim) ?? 0;
		return Date.now() - last >= 24 * 60 * 60 * 1000;
	}
	function getCdStr(t, d) {
		if (t.isGlobal) {
			if (((d.global && d.global.lastRot) ?? -1) >= rotIdx()) {
				const next = (rotIdx() + 1) * 2 * 24 * 60 * 60 * 1000;
				return 'claimed · resets in ' + formatWellTime(next - Date.now());
			}
			return null;
		}
		const last = (d[t.id] && d[t.id].lastClaim) ?? 0;
		const rem = 24 * 60 * 60 * 1000 - (Date.now() - last);
		return rem > 0 ? 'cooldown: ' + formatWellTime(rem) : null;
	}

	// ── reward application ───────────────────────────rfvgbhgvfcdfvgbvfc────────────────────
	function applyReward(rew, tierId) {
		if (rew.type === 'points') {
			points += rew.amount;
			updatePointsDisplay();
			saveAllData();
			showAnomalyPopup('+' + rew.amount.toLocaleString() + ' pts 🎉');
		} else if (rew.type === 'anomaly') {
			anomalies += rew.amount;
			updateAnomalyUI();
			saveAllData();
			showAnomalyPopup('+' + rew.amount + ' anomalies ✨');
		} else if (rew.type === 'luck') {
			const key = '_g_' + tierId;
			if (typeof potionData !== 'undefined') {
				potionData[key] = {
					name: tierId + ' luck',
					emoji: '🏆',
					mult: rew.mult,
					duration: rew.dur * 1000,
				};
			}
			if (typeof activePotions !== 'undefined') {
				activePotions.push({
					type: key,
					endTime: Date.now() + rew.dur * 1000,
					multiplier: rew.mult,
				});
				if (typeof recalcPotionLuck === 'function') recalcPotionLuck();
				if (typeof updateActivePotionsDisplay === 'function') updateActivePotionsDisplay();
				saveAllData();
			}
			showAnomalyPopup(rew.mult + 'x luck · ' + rew.dur + 's 🏆');
		} else if (rew.type === 'unlock_mutations') {
			localStorage.setItem('mutationsUnlocked', '1');
			showAnomalyPopup('mutations unlocked! 🧬');
			if (typeof renderMutations === 'function') renderMutations();
			window.unlockPageDot?.(3);
		} else if (rew.type === 'unlock_starmap') {
			localStorage.setItem('starmapUnlocked', '1');
			showAnomalyPopup('✦ starmap unlocked!');
			if (typeof renderStarmap === 'function') renderStarmap();
			window.unlockPageDot?.(4);
		} else if (rew.type === 'unlock_runes') {
			localStorage.setItem('runesUnlocked', '1');
			showAnomalyPopup('🔷 runes unlocked!');
			if (typeof renderRunes === 'function') renderRunes();
			window.unlockPageDot?.(5);
		}
	}

	// ── claim (exposed globally for onclick) ────────────────────────────
	window.claimGauntletReward = function (tierId, rewIdx) {
		const tier = TIERS.find((t) => t.id === tierId);
		if (!tier) return;
		const d = loadData();
		if (!isComplete(tier, d) || !canClaim(tier, d)) return;
		const rew = tier.rewards[rewIdx];
		if (!rew) return;

		const now = Date.now();
		if (tier.isGlobal) {
			d.global = { ...(d.global ?? {}), lastRot: rotIdx(), lastClaimTime: now };
		} else {
			d[tier.id] = { lastClaim: now, lastClaimTime: now };
		}

		saveData(d);
		applyReward(rew, tierId);
		renderGauntlets();
	};

	// ── render ───────────────────────────────────────────────────────────
	function renderGauntlets() {
	  const container = document.getElementById('gauntletContainer');
	  if (!container) return;
	  const d = loadData();
	  const rolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
	
	  const rollEl = document.getElementById('gauntletRollDisplay');
	  if (rollEl) rollEl.textContent = 'your rolls: ' + rolls.toLocaleString();
	
	  container.innerHTML = '';
	
	  TIERS.forEach((tier) => {
	    const locked = isLocked(tier);
	    const rarNames = getTierRarities(tier);
	    const complete = !locked && isComplete(tier, d);
	    const claimable = complete && canClaim(tier, d);
	    const cdStr = !locked ? getCdStr(tier, d) : null;
	    const got = locked
	      ? 0
	      : rarNames.filter((n) => typeof inventoryData !== 'undefined' && inventoryData.has(n)).length;
	    const pct = rarNames.length ? Math.round((got / rarNames.length) * 100) : 0;
	
	    const el = document.createElement('div');
	    el.className = 'gauntlet-tier' + (locked ? ' gauntlet-locked' : '');
	    el.dataset.tier = tier.id;
	
	    const hdr = document.createElement('div');
	    hdr.className = 'gauntlet-tier-header';
	
	    const nameWrap = document.createElement('div');
	    nameWrap.style.display = 'flex';
	    nameWrap.style.alignItems = 'center';
	    nameWrap.style.gap = '0';
	
	    const nameEl = document.createElement('span');
	    nameEl.className = 'gauntlet-tier-name';
	    nameEl.textContent = tier.emoji + ' ' + tier.name;
	    nameWrap.appendChild(nameEl);
	
	    if (tier.isGlobal) {
	      const badge = document.createElement('span');
	      badge.className = 'gauntlet-tier-badge';
	      badge.textContent = 'rotating';
	      nameWrap.appendChild(badge);
	    }
	
	    const metaEl = document.createElement('div');
	    metaEl.className = 'gauntlet-tier-meta' + (!locked && (claimable || complete) ? ' gauntlet-unlocked-meta' : '');
	    if (locked) metaEl.textContent = '🔒 ' + tier.minRolls.toLocaleString();
	    else if (claimable) metaEl.textContent = '✓ ready';
	    else if (complete) metaEl.textContent = '✓ done';
	
	    hdr.appendChild(nameWrap);
	    hdr.appendChild(metaEl);
	    el.appendChild(hdr);
	
	    if (tier.isGlobal && !locked) {
	      const next = (rotIdx() + 1) * 2 * 24 * 60 * 60 * 1000;
	      const rotEl = document.createElement('div');
	      rotEl.className = 'gauntlet-rotation-text';
	      rotEl.textContent = 'rotates in ' + formatWellTime(next - Date.now());
	      el.appendChild(rotEl);
	    }
	
	    if (!locked) {
	      const progEl = document.createElement('div');
	      progEl.className = 'gauntlet-progress-text';
	      progEl.textContent = got + ' / ' + rarNames.length + ' — ' + pct + '%';
	      el.appendChild(progEl);
	
	      const barWrap = document.createElement('div');
	      barWrap.className = 'gauntlet-bar-wrap';
	      const bar = document.createElement('div');
	      bar.className = 'gauntlet-bar';
	      bar.style.width = pct + '%';
	      if (complete) {
	        bar.style.background = '#4a8';
	        bar.style.opacity = '0.7';
	      }
	      barWrap.appendChild(bar);
	      el.appendChild(barWrap);
	
	      const chipGrid = document.createElement('div');
	      chipGrid.className = 'gauntlet-chip-grid';
	      rarNames.forEach((name) => {
	        const has = typeof inventoryData !== 'undefined' && inventoryData.has(name);
	        const chip = document.createElement('div');
	        chip.className = 'gauntlet-chip ' + (has ? 'chip-has' : 'chip-missing');
	        const rar = typeof rarities !== 'undefined' ? rarities.find((r) => r.name === name) : null;
	        const den = rar ? '1/' + Math.round(1 / rar.chance).toLocaleString() : '?';
	        chip.textContent = (has ? '✓ ' : '') + name + ' · ' + den;
	        chipGrid.appendChild(chip);
	      });
	      el.appendChild(chipGrid);
	
	      const hr = document.createElement('hr');
	      hr.className = 'gauntlet-hr';
	      el.appendChild(hr);
	
	      const rewLabel = document.createElement('div');
	      rewLabel.className = 'gauntlet-reward-label';
	      rewLabel.textContent = 'pick a reward';
	      el.appendChild(rewLabel);
	
	      const rewRow = document.createElement('div');
	      rewRow.className = 'gauntlet-reward-row';
	      tier.rewards.forEach((rew, i) => {
	        const btn = document.createElement('button');
	        btn.className = 'gauntlet-rew-btn' + (claimable ? ' rew-ready' : '');
	        btn.disabled = !claimable;
	        btn.textContent = rew.label;
	        const ci = i, cid = tier.id;
	        btn.addEventListener('click', () => {
	          if (typeof showConfirmModal === 'function') {
	            showConfirmModal(
	              tier.emoji + ' ' + tier.name,
	              'claim: ' + rew.label + '?',
	              () => window.claimGauntletReward(cid, ci)
	            );
	          } else {
	            window.claimGauntletReward(cid, ci);
	          }
	        });
	        rewRow.appendChild(btn);
	      });
	      el.appendChild(rewRow);
	
	      if (cdStr) {
	        const cdEl = document.createElement('div');
	        cdEl.className = 'gauntlet-cd-text';
	        cdEl.textContent = cdStr;
	        el.appendChild(cdEl);
	      }
	    } else {
	      const prev = document.createElement('div');
	      prev.className = 'gauntlet-locked-preview';
	      prev.textContent = tier.rewards.map((r) => r.label).join(' · ');
	      el.appendChild(prev);
	    }
	
	    container.appendChild(el);
	  });
	}

	window.renderGauntlets = renderGauntlets;

	// refresh every 4 s (timers + post-roll sync) as well as check the rotation change.
	checkRotationChange(); // run once on load
	setInterval(renderGauntlets, 4000);

	// Wait for main.js to finish loading inventoryData before first render
	function tryFirstRender(attempts) {
		if (typeof inventoryData !== 'undefined' && inventoryData instanceof Map) {
			renderGauntlets();
		} else if (attempts > 0) {
			setTimeout(() => tryFirstRender(attempts - 1), 100);
		}
	}
	tryFirstRender(30); // up to 3 seconds of retries
})();
