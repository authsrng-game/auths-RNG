(function () {
	'use strict';

	const KEYS = {
		unlocked: 'runesUnlocked',
		data: 'runesData',
		blocks: 'runeBlocks',
		gift: 'runeGift',
		upgrades: 'runeUpgrades',
	};

	const TIERS = [
		{ key: 'rare', label: 'rare', minDenom: 1000, drop: 1 / 30, blockMult: 10 },
		{ key: 'mid-rare', label: 'mid-rare', minDenom: 70, drop: 1 / 70, blockMult: 3 },
		{ key: 'common', label: 'common', minDenom: 0, drop: 1 / 140, blockMult: 1 },
	];
	const TIERS_ASC = TIERS.slice().reverse();
	const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t]));

	const ELEMENTS = [
		{
			id: 'water',
			color: '#5ab0ff',
			path: 'M12 2.5C12 2.5 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2.5 12 2.5z',
		},
		{
			id: 'fire',
			color: '#ff7a45',
			path: 'M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 0 2 .8 3 1.8 3.2C10.8 8.5 11 5 12 2z',
		},
		{ id: 'earth', color: '#8bbf6a', path: 'M2 20L9 7l4 7 3-4.5L22 20z' },
		{
			id: 'wizardry',
			color: '#b894ff',
			path: 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z',
		},
	];

	const ELEMENTAL_CHANCE = 1 / 20;
	const BASE_RATE = 1.25;
	const BOOSTED_RATE = 10;
	const BACK_RATIO = 0.85;
	const WEALTH_PER_SEC = 200000;
	const ANOMALY_PER_TICK = 50;
	const ANOMALY_TICK_MS = 2000;
	const PASSIVE_CAP_MS = 3600 * 1000;
	const DOPAMINE_MS = Math.round(1000 / 3);
	const DOPAMINE_MAX_CATCHUP = 1800;
	const CLOVER_ANOMALIES = 50000000;

	const GIFTS = {
		luck: {
			name: 'gift of luck',
			desc: '2x your existing luck multiplier, permanently',
			popup: 'gift of luck active: 2x permanent luck',
		},
		wealth: {
			name: 'gift of wealth',
			desc: '200,000 points per second, permanently',
			popup: 'gift of wealth active: 200k pts/sec',
		},
	};

	const UPGRADES = [
		{
			key: 'tripleLuck',
			name: 'always triple your luck',
			desc: 'permanent 3x luck multiplier',
			cost: 9000,
		},
		{
			key: 'moreBlocks',
			name: 'more blocks!',
			desc: 'exchange rate becomes 1 rune = 10 blocks',
			cost: 15000,
		},
		{
			key: 'anomalyMachine',
			name: 'anomaly anomaly anomaly',
			desc: '+50 anomalies every 2 seconds',
			cost: 17000,
		},
		{
			key: 'dopamineAttack',
			name: 'dopamine attack',
			desc: 'auto-roll 3 times per second',
			cost: 20000,
		},
		{
			key: 'doubleClover',
			name: 'double clover',
			desc: '50M anomalies + 4x permanent luck',
			cost: 50000,
		},
	];

	const state = {
		runes: { counts: {}, elementals: {}, totalDropped: 0 },
		blocks: 0,
		gift: null,
		upgrades: {},
	};

	let unlockedCache = null;
	let ui = null;
	let dirty = false;
	let refreshQueued = false;
	let converging = false;
	let autoPrompted = false;
	let dopamineTimer = null;
	let lastDopamine = 0;
	const passive = { wealth: 0, anomaly: 0 };

	function el(tag, cls, text) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text !== undefined) e.textContent = text;
		return e;
	}

	function glyphNode(element, size) {
		const s = el('span', 'rn-glyph');
		s.style.setProperty('--rn-c', element.color);
		s.innerHTML =
			'<svg viewBox="0 0 24 24" width="' +
			size +
			'" height="' +
			size +
			'" aria-hidden="true"><path d="' +
			element.path +
			'"/></svg>';
		return s;
	}

	function fmt(n) {
		if (typeof formatNum === 'function') return formatNum(n);
		return Math.round(n).toLocaleString();
	}

	function fmtDec(n) {
		if (n >= 1000) return fmt(n);
		return String(Math.round(n * 100) / 100);
	}

	function popup(text) {
		if (typeof showAnomalyPopup === 'function') showAnomalyPopup(text);
	}

	function recalcLuck() {
		if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
	}

	function roll() {
		if (typeof Plush !== 'undefined' && typeof Plush.float === 'function') return Plush.float();
		if (typeof Beacon !== 'undefined' && typeof Beacon.float === 'function') return Beacon.float();
		return Math.random();
	}

	function readJSON(key) {
		try {
			const v = JSON.parse(localStorage.getItem(key) || '{}');
			return v && typeof v === 'object' ? v : {};
		} catch (e) {
			console.warn('[runes] failed to parse ' + key + ':', e);
			return {};
		}
	}

	function count(v) {
		const n = Math.floor(Number(v));
		return Number.isFinite(n) && n > 0 ? n : 0;
	}

	function isUnlocked(force) {
		if (force || unlockedCache === null) {
			unlockedCache = localStorage.getItem(KEYS.unlocked) === '1';
		}
		return unlockedCache;
	}

	function load() {
		const d = readJSON(KEYS.data);
		const counts = {};
		TIERS.forEach((t) => {
			counts[t.key] = count(d.counts && d.counts[t.key]);
		});
		const elementals = {};
		ELEMENTS.forEach((e) => {
			elementals[e.id] = count(d.elementals && d.elementals[e.id]);
		});
		state.runes = { counts, elementals, totalDropped: count(d.totalDropped) };

		const b = parseFloat(localStorage.getItem(KEYS.blocks) || '0');
		state.blocks = Number.isFinite(b) && b > 0 ? b : 0;

		const g = localStorage.getItem(KEYS.gift);
		state.gift = g && Object.hasOwn(GIFTS, g) ? g : null;

		const u = readJSON(KEYS.upgrades);
		state.upgrades = {};
		UPGRADES.forEach((x) => {
			state.upgrades[x.key] = u[x.key] === true;
		});

		unlockedCache = localStorage.getItem(KEYS.unlocked) === '1';
	}

	function save() {
		try {
			localStorage.setItem(KEYS.data, JSON.stringify(state.runes));
			localStorage.setItem(KEYS.blocks, String(state.blocks));
			if (state.gift) localStorage.setItem(KEYS.gift, state.gift);
			localStorage.setItem(KEYS.upgrades, JSON.stringify(state.upgrades));
		} catch (e) {
			console.warn('[runes] failed to save:', e);
		}
	}

	function tierOf(rarity) {
		const denom = Math.round(1 / rarity.chance);
		return TIERS.find((t) => denom >= t.minDenom);
	}

	function allCollected() {
		return ELEMENTS.every((e) => state.runes.elementals[e.id] > 0);
	}

	function collectedCount() {
		return ELEMENTS.filter((e) => state.runes.elementals[e.id] > 0).length;
	}

	function blockValue(tier) {
		return (state.upgrades.moreBlocks ? BOOSTED_RATE : BASE_RATE) * tier.blockMult;
	}

	function buyCost(tier, n) {
		return Math.ceil((n * blockValue(tier)) / BACK_RATIO);
	}

	function maxBuy(tier) {
		let n = Math.floor((state.blocks * BACK_RATIO) / blockValue(tier));
		while (n > 0 && buyCost(tier, n) > state.blocks) n--;
		return Math.max(0, n);
	}

	function grantPoints(n) {
		if (typeof points === 'undefined') return;
		points += n;
		if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
	}

	function grantAnomalies(n) {
		if (typeof anomalies === 'undefined') return;
		anomalies += n;
		if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
	}

	function markDirty() {
		dirty = true;
		if (refreshQueued || !ui) return;
		refreshQueued = true;
		requestAnimationFrame(() => {
			refreshQueued = false;
			if (dirty) refresh();
		});
	}

	function tryDropRune(rarity) {
		if (!isUnlocked() || !rarity) return;
		const tier = tierOf(rarity);
		if (!tier || roll() >= tier.drop) return;

		state.runes.totalDropped++;

		if (roll() < ELEMENTAL_CHANCE) {
			const element = ELEMENTS[Math.floor(roll() * ELEMENTS.length)];
			state.runes.elementals[element.id]++;
			save();
			popup(element.id + ' rune found');
			markDirty();
			checkConvergence();
			return;
		}

		state.runes.counts[tier.key]++;
		save();
		popup(tier.label + ' rune dropped');
		markDirty();
	}

	function sellRunes(tierKey, n) {
		const tier = TIER_BY_KEY[tierKey];
		if (!tier || n < 1 || state.runes.counts[tier.key] < n) return false;
		state.runes.counts[tier.key] -= n;
		state.blocks += n * blockValue(tier);
		save();
		return true;
	}

	function buyRunes(tierKey, n) {
		const tier = TIER_BY_KEY[tierKey];
		if (!tier || n < 1) return false;
		const cost = buyCost(tier, n);
		if (state.blocks < cost) return false;
		state.blocks -= cost;
		state.runes.counts[tier.key] += n;
		save();
		return true;
	}

	function buyUpgrade(key) {
		const u = UPGRADES.find((x) => x.key === key);
		if (!u || state.upgrades[key] || state.blocks < u.cost) return;
		state.blocks -= u.cost;
		state.upgrades[key] = true;
		save();
		activate(key);
		refresh();
	}

	function activate(key) {
		if (key === 'tripleLuck') {
			recalcLuck();
			popup('triple luck active');
		}
		if (key === 'anomalyMachine') {
			passive.anomaly = Date.now();
		}
		if (key === 'dopamineAttack') {
			startDopamine();
		}
		if (key === 'doubleClover') {
			grantAnomalies(CLOVER_ANOMALIES);
			if (typeof saveAllData === 'function') saveAllData();
			recalcLuck();
			popup('double clover: 50M anomalies + 4x luck!');
		}
	}

	function applyGift() {
		if (state.gift === 'luck') recalcLuck();
		if (state.gift === 'wealth') passive.wealth = Date.now();
		if (state.gift) popup(GIFTS[state.gift].popup);
	}

	function advance(key, unitMs) {
		const now = Date.now();
		const elapsed = now - passive[key];
		const units = Math.floor(elapsed / unitMs);
		if (units <= 0) return 0;
		passive[key] = now - (elapsed % unitMs);
		return Math.min(units, Math.floor(PASSIVE_CAP_MS / unitMs));
	}

	function tick() {
		if (state.gift === 'wealth') {
			const n = advance('wealth', 1000);
			if (n) grantPoints(WEALTH_PER_SEC * n);
		} else {
			passive.wealth = Date.now();
		}

		if (state.upgrades.anomalyMachine) {
			const n = advance('anomaly', ANOMALY_TICK_MS);
			if (n) grantAnomalies(ANOMALY_PER_TICK * n);
		} else {
			passive.anomaly = Date.now();
		}
	}

	function withHidden(fn) {
		Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
		try {
			fn();
		} finally {
			delete document.hidden;
		}
	}

	function rollReady() {
		const btn = document.getElementById('rollBtn');
		if (!btn || btn.disabled) return false;
		if (typeof isCutscenePlaying !== 'undefined' && isCutscenePlaying) return false;
		return typeof window.performRoll === 'function';
	}

	function dopamineTick() {
		if (!state.upgrades.dopamineAttack) {
			lastDopamine = Date.now();
			return;
		}
		const now = Date.now();
		const elapsed = now - lastDopamine;
		const n = Math.min(DOPAMINE_MAX_CATCHUP, Math.floor(elapsed / DOPAMINE_MS));
		if (n < 1) return;
		lastDopamine = now - (elapsed % DOPAMINE_MS);

		for (let i = 0; i < n; i++) {
			if (!rollReady()) break;
			if (typeof window._resetNextRollAllowedAt === 'function') window._resetNextRollAllowedAt();
			if (i < n - 1 && !document.hidden) withHidden(window.performRoll);
			else window.performRoll();
		}
	}

	function startDopamine() {
		if (dopamineTimer) return;
		lastDopamine = Date.now();
		dopamineTimer = setInterval(dopamineTick, DOPAMINE_MS);
	}

	function checkConvergence() {
		if (!allCollected() || state.gift || converging || autoPrompted) return;
		autoPrompted = true;
		converging = true;
		playConvergence().then(() => {
			converging = false;
			openGiftChoice();
		});
	}

	function playConvergence() {
		return new Promise((resolve) => {
			const overlay = el('div', 'rn-converge');
			const title = el('div', 'rn-converge-title', 'the elements converge...');
			const row = el('div', 'rn-converge-row');
			overlay.append(title, row);
			document.body.appendChild(overlay);
			setTimeout(() => title.classList.add('on'), 200);

			let i = 0;
			const step = () => {
				if (i < ELEMENTS.length) {
					const g = glyphNode(ELEMENTS[i], 56);
					g.classList.add('rn-converge-glyph');
					row.appendChild(g);
					setTimeout(() => g.classList.add('on'), 50);
					i++;
					setTimeout(step, 800);
					return;
				}
				setTimeout(() => {
					overlay.classList.add('flash');
					setTimeout(() => {
						overlay.remove();
						resolve();
					}, 1800);
				}, 400);
			};
			setTimeout(step, 600);
		});
	}

	function makeConfirmString() {
		const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
		let s = '';
		for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
		return s;
	}

	function openGiftChoice() {
		if (state.gift || document.getElementById('rnGiftModal')) return;

		const confirmStr = makeConfirmString();
		const modal = el('div', 'rn-modal');
		modal.id = 'rnGiftModal';
		const panel = el('div', 'rn-modal-panel');
		panel.append(
			el('div', 'rn-modal-title', 'choose your gift'),
			el('div', 'rn-modal-sub', 'this decision is permanent. it defines your run until SUMMER.')
		);

		let selected = null;
		const options = el('div', 'rn-gift-options');
		const optionButtons = Object.keys(GIFTS).map((id) => {
			const b = el('button', 'rn-gift-opt');
			b.append(
				el('div', 'rn-gift-name', GIFTS[id].name),
				el('div', 'rn-gift-desc', GIFTS[id].desc)
			);
			options.appendChild(b);
			return { id, b };
		});

		const confirmArea = el('div', 'rn-confirm');
		confirmArea.hidden = true;
		const prompt = el('div', 'rn-confirm-text');
		prompt.append('type ', el('strong', '', confirmStr), ' to confirm');
		const input = el('input', 'rn-input rn-input-wide');
		input.type = 'text';
		input.autocomplete = 'off';
		input.spellcheck = false;
		const confirmBtn = el('button', '', 'confirm');
		confirmBtn.disabled = true;
		const cancelBtn = el('button', 'rn-ghost', 'cancel');
		const laterBtn = el('button', 'rn-ghost', 'decide later');
		const actions = el('div', 'rn-confirm-actions');
		actions.append(confirmBtn, cancelBtn);
		confirmArea.append(prompt, input, actions);

		panel.append(options, confirmArea, laterBtn);
		modal.appendChild(panel);
		document.body.appendChild(modal);

		const clearSelection = () => {
			selected = null;
			confirmArea.hidden = true;
			optionButtons.forEach((o) => o.b.classList.remove('dim', 'sel'));
		};

		optionButtons.forEach((o) => {
			o.b.addEventListener('click', () => {
				selected = o.id;
				optionButtons.forEach((x) => {
					x.b.classList.toggle('sel', x === o);
					x.b.classList.toggle('dim', x !== o);
				});
				confirmArea.hidden = false;
				input.value = '';
				confirmBtn.disabled = true;
				input.focus();
			});
		});

		input.addEventListener('input', () => {
			confirmBtn.disabled = input.value !== confirmStr;
		});

		confirmBtn.addEventListener('click', () => {
			if (!selected) return;
			state.gift = selected;
			save();
			modal.remove();
			applyGift();
			refresh();
		});

		cancelBtn.addEventListener('click', clearSelection);
		laterBtn.addEventListener('click', () => modal.remove());
	}

	function amountOf(x) {
		return Math.max(0, parseInt(x.input.value, 10) || 0);
	}

	function maxAmount(x) {
		const tier = TIER_BY_KEY[x.select.value];
		return x.kind === 'sell' ? state.runes.counts[tier.key] : maxBuy(tier);
	}

	function refreshExchange(x) {
		const tier = TIER_BY_KEY[x.select.value];
		const n = amountOf(x);
		const value = blockValue(tier);

		if (x.kind === 'sell') {
			const have = state.runes.counts[tier.key];
			x.max.disabled = have < 1;
			if (n < 1) {
				x.preview.textContent =
					'you have ' + fmt(have) + ' ' + tier.label + ' (' + fmtDec(value) + ' blocks each)';
				x.go.disabled = true;
			} else if (n > have) {
				x.preview.textContent = 'you only have ' + fmt(have);
				x.go.disabled = true;
			} else {
				x.preview.textContent = 'gives ' + fmtDec(n * value) + ' blocks';
				x.go.disabled = false;
			}
			return;
		}

		const most = maxBuy(tier);
		x.max.disabled = most < 1;
		if (n < 1) {
			x.preview.textContent =
				'each ' + tier.label + ' rune costs about ' + fmtDec(buyCost(tier, 1)) + ' blocks';
			x.go.disabled = true;
		} else {
			const cost = buyCost(tier, n);
			x.preview.textContent = 'costs ' + fmtDec(cost) + ' blocks';
			x.go.disabled = state.blocks < cost;
		}
	}

	function makeExchange(kind) {
		const root = el('div', 'rn-ex');
		root.appendChild(
			el('div', 'rn-ex-title', kind === 'sell' ? 'runes to blocks' : 'blocks to runes (lossy)')
		);

		const select = el('select', 'rn-select');
		TIERS_ASC.forEach((t) => {
			const o = el('option', '', t.label);
			o.value = t.key;
			select.appendChild(o);
		});
		select.value = 'common';

		const input = el('input', 'rn-input');
		input.type = 'number';
		input.min = '1';
		input.placeholder = kind === 'sell' ? 'runes' : 'runes out';

		const max = el('button', 'small', 'max');
		const go = el('button', 'small', 'exchange');
		const row = el('div', 'rn-ex-row');
		row.append(select, input, max, go);

		const preview = el('div', 'rn-preview');
		root.append(row, preview);

		const x = { kind, root, select, input, max, go, preview };
		const sync = () => refreshExchange(x);
		select.addEventListener('change', sync);
		input.addEventListener('input', sync);
		max.addEventListener('click', () => {
			input.value = String(maxAmount(x));
			sync();
		});
		go.addEventListener('click', () => {
			const n = amountOf(x);
			const ok = kind === 'sell' ? sellRunes(select.value, n) : buyRunes(select.value, n);
			if (ok) input.value = '';
			refresh();
		});
		return x;
	}

	function buildLocked(container) {
		container.textContent = '';
		const root = el('div', 'rn-locked');
		root.append(
			glyphNode(ELEMENTS[3], 40),
			el('div', '', 'complete the abyss gauntlet to unlock runes')
		);
		container.appendChild(root);
		return { mode: 'locked', container, root, refs: {} };
	}

	function buildMain(container) {
		container.textContent = '';
		const root = el('div', 'rn-root');
		const refs = { tiers: {}, elements: {} };

		const banner = el('div', 'rn-banner');
		const bannerText = el('span', '');
		const bannerBtn = el('button', 'small', 'choose your gift');
		bannerBtn.addEventListener('click', openGiftChoice);
		banner.append(bannerText, bannerBtn);
		refs.banner = { root: banner, text: bannerText, btn: bannerBtn };
		root.appendChild(banner);

		const stats = el('div', 'rn-grid2');
		TIERS.forEach((t) => {
			const card = el('div', 'rn-card');
			const value = el('div', 'rn-card-value');
			const sub = el('div', 'rn-card-sub');
			card.append(el('div', 'rn-card-label', t.label + ' runes'), value, sub);
			refs.tiers[t.key] = { value, sub };
			stats.appendChild(card);
		});
		const totalCard = el('div', 'rn-card');
		refs.total = el('div', 'rn-card-value');
		totalCard.append(el('div', 'rn-card-label', 'total dropped'), refs.total);
		stats.appendChild(totalCard);
		root.appendChild(stats);

		root.appendChild(el('div', 'rn-label', 'elementals'));
		const elements = el('div', 'rn-elements');
		ELEMENTS.forEach((e) => {
			const card = el('div', 'rn-el');
			card.style.setProperty('--rn-c', e.color);
			const countEl = el('div', 'rn-el-count');
			card.append(glyphNode(e, 28), el('div', 'rn-el-name', e.id), countEl);
			refs.elements[e.id] = { root: card, count: countEl };
			elements.appendChild(card);
		});
		root.appendChild(elements);

		const blocksLabel = el('div', 'rn-label');
		blocksLabel.append('blocks: ');
		refs.blocks = el('span', '');
		blocksLabel.appendChild(refs.blocks);
		root.appendChild(blocksLabel);

		const utm = el('div', 'rn-panel');
		utm.appendChild(el('div', 'rn-panel-title', 'UTM, universal transaction machine'));
		refs.sell = makeExchange('sell');
		refs.buy = makeExchange('buy');
		utm.append(refs.sell.root, refs.buy.root);
		root.appendChild(utm);

		root.appendChild(el('div', 'rn-label rn-label-gap', 'block upgrades'));
		const list = el('div', 'rn-upgrades');
		refs.upgrades = {};
		UPGRADES.forEach((u) => {
			const row = el('div', 'rn-up');
			const left = el('div', 'rn-up-left');
			left.append(el('div', 'rn-up-name', u.name), el('div', 'rn-up-desc', u.desc));
			const right = el('div', 'rn-up-right');
			const cost = el('div', 'rn-up-cost', fmt(u.cost) + ' blocks');
			const btn = el('button', 'small', 'buy');
			const owned = el('span', 'rn-up-owned', 'owned');
			btn.addEventListener('click', () => buyUpgrade(u.key));
			right.append(cost, btn, owned);
			row.append(left, right);
			refs.upgrades[u.key] = { row, cost, btn, owned };
			list.appendChild(row);
		});
		root.appendChild(list);

		container.appendChild(root);
		return { mode: 'main', container, root, refs };
	}

	function refresh() {
		dirty = false;
		if (!ui || ui.mode !== 'main') return;
		const r = ui.refs;

		TIERS.forEach((t) => {
			r.tiers[t.key].value.textContent = fmt(state.runes.counts[t.key]);
			r.tiers[t.key].sub.textContent = fmtDec(blockValue(t)) + ' blocks each';
		});
		r.total.textContent = fmt(state.runes.totalDropped);

		ELEMENTS.forEach((e) => {
			const c = state.runes.elementals[e.id];
			r.elements[e.id].count.textContent = String(c);
			r.elements[e.id].root.classList.toggle('on', c > 0);
		});

		r.blocks.textContent = fmt(Math.floor(state.blocks));

		const b = r.banner;
		if (state.gift) {
			b.root.className = 'rn-banner rn-banner-on';
			b.text.textContent = GIFTS[state.gift].name + ' active';
			b.btn.hidden = true;
		} else if (allCollected()) {
			b.root.className = 'rn-banner rn-banner-ready';
			b.text.textContent = 'all four elementals collected';
			b.btn.hidden = false;
		} else {
			b.root.className = 'rn-banner';
			b.text.textContent = 'elementals collected: ' + collectedCount() + ' / ' + ELEMENTS.length;
			b.btn.hidden = true;
		}

		refreshExchange(r.sell);
		refreshExchange(r.buy);

		UPGRADES.forEach((u) => {
			const row = r.upgrades[u.key];
			const own = state.upgrades[u.key];
			row.row.classList.toggle('rn-up-has', own);
			row.cost.hidden = own;
			row.btn.hidden = own;
			row.owned.hidden = !own;
			row.btn.disabled = state.blocks < u.cost;
		});
	}

	function renderRunes() {
		const container = document.getElementById('runesContainer');
		if (!container) return;
		const mode = isUnlocked(true) ? 'main' : 'locked';
		if (!ui || ui.container !== container || ui.mode !== mode || !container.contains(ui.root)) {
			ui = mode === 'main' ? buildMain(container) : buildLocked(container);
		}
		if (mode === 'main') refresh();
	}

	function injectStyles() {
		if (document.getElementById('runesStyles')) return;
		const style = document.createElement('style');
		style.id = 'runesStyles';
		style.textContent = `
.rn-root { width: 100%; max-width: 540px; font-family: monospace; color: var(--text-color); }
.rn-root [hidden], .rn-modal [hidden] { display: none !important; }
.rn-locked { text-align: center; opacity: 0.4; margin-top: 48px; font-size: 0.9em; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.rn-glyph { display: inline-flex; color: var(--rn-c, currentColor); }
.rn-glyph svg { display: block; fill: currentColor; }
.rn-banner { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: var(--overlay-bg); border: 1px solid var(--border-color); border-radius: 2px; padding: 8px 12px; margin-bottom: 16px; font-size: 0.82em; min-height: 40px; }
.rn-banner-on { background: rgba(40, 90, 40, 0.12); border-color: #3a5a3a; color: #88cc88; justify-content: center; }
.rn-banner-ready { border-color: #6a5a2a; }
.rn-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.rn-card { background: var(--overlay-bg); border: 1px solid var(--border-color); border-radius: 2px; padding: 10px 12px; text-align: center; }
.rn-card-label { font-size: 0.72em; opacity: 0.45; margin-bottom: 4px; }
.rn-card-value { font-size: 1.1em; }
.rn-card-sub { font-size: 0.68em; opacity: 0.35; margin-top: 2px; }
.rn-label { font-size: 0.72em; opacity: 0.38; letter-spacing: 0.07em; margin-bottom: 10px; }
.rn-label-gap { margin-top: 20px; }
.rn-elements { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
.rn-el { display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--overlay-bg); border: 1px solid var(--border-color); border-radius: 2px; padding: 10px 6px; opacity: 0.4; transition: opacity 0.3s, border-color 0.3s; }
.rn-el .rn-glyph { color: var(--rn-c); }
.rn-el.on { opacity: 1; border-color: var(--rn-c); }
.rn-el-name { font-size: 0.72em; opacity: 0.7; }
.rn-el-count { font-size: 0.9em; }
.rn-panel { background: var(--overlay-bg); border: 1px solid var(--border-color); border-radius: 2px; padding: 14px; }
.rn-panel-title { font-size: 0.8em; opacity: 0.5; margin-bottom: 12px; }
.rn-ex { margin-bottom: 16px; }
.rn-ex:last-child { margin-bottom: 0; }
.rn-ex-title { font-size: 0.75em; opacity: 0.6; margin-bottom: 6px; }
.rn-ex-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.rn-select { padding: 4px 6px; }
.rn-input { width: 90px; padding: 4px 6px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); font-family: monospace; border-radius: 2px; }
.rn-input-wide { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
.rn-preview { font-size: 0.72em; opacity: 0.55; margin-top: 6px; min-height: 1.2em; }
.rn-upgrades { display: flex; flex-direction: column; gap: 8px; }
.rn-up { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--overlay-bg); border: 1px solid var(--border-color); border-radius: 2px; padding: 12px; }
.rn-up-has { border-color: #3a5a3a; background: rgba(40, 90, 40, 0.08); }
.rn-up-left { flex: 1; min-width: 0; }
.rn-up-name { font-size: 0.88em; margin-bottom: 2px; }
.rn-up-desc { font-size: 0.75em; opacity: 0.5; }
.rn-up-right { flex-shrink: 0; text-align: right; }
.rn-up-cost { font-size: 0.75em; color: var(--points-color, #ffb86b); margin-bottom: 4px; }
.rn-up-owned { font-size: 0.8em; color: #4a4; }
.rn-converge { position: fixed; inset: 0; background: #000; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; transition: background 1.5s; }
.rn-converge.flash { background: #fff; }
.rn-converge-title { font-family: monospace; font-size: 1.4em; color: #fff; opacity: 0; transition: opacity 1s; }
.rn-converge-title.on { opacity: 1; }
.rn-converge-row { display: flex; gap: 32px; }
.rn-converge-glyph { opacity: 0; transform: scale(0.5); transition: opacity 0.6s, transform 0.6s; }
.rn-converge-glyph.on { opacity: 1; transform: scale(1); }
.rn-modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); z-index: 99999; display: flex; align-items: center; justify-content: center; }
.rn-modal-panel { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 4px; padding: 32px; max-width: 480px; width: 90%; font-family: monospace; color: var(--text-color); text-align: center; }
.rn-modal-title { font-size: 1.3em; margin-bottom: 8px; }
.rn-modal-sub { font-size: 0.8em; opacity: 0.5; margin-bottom: 24px; }
.rn-gift-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.rn-gift-opt { padding: 16px; text-align: center; }
.rn-gift-opt.dim { opacity: 0.4; }
.rn-gift-opt.sel { opacity: 1; border-color: var(--text-color); }
.rn-gift-name { font-size: 1.05em; margin-bottom: 4px; }
.rn-gift-desc { font-size: 0.75em; opacity: 0.6; }
.rn-confirm-text { font-size: 0.8em; opacity: 0.7; margin-bottom: 8px; }
.rn-confirm-actions { display: flex; justify-content: center; gap: 8px; margin-bottom: 8px; }
.rn-ghost { background: transparent; border-color: transparent; opacity: 0.5; }
`;
		document.head.appendChild(style);
	}

	function init() {
		injectStyles();
		load();
		recalcLuck();
		passive.wealth = Date.now();
		passive.anomaly = Date.now();
		if (state.upgrades.dopamineAttack) startDopamine();
		setInterval(tick, 1000);
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) return;
			tick();
			dopamineTick();
		});
		renderRunes();
	}

	window.getRuneGiftLuckMultiplier = () => (state.gift === 'luck' ? 2 : 1);
	window.getRuneTripleLuckMultiplier = () => (state.upgrades.tripleLuck ? 3 : 1);
	window.getRuneDoubleCloverLuckMultiplier = () => (state.upgrades.doubleClover ? 4 : 1);
	window.tryDropRune = tryDropRune;
	window.renderRunes = renderRunes;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		setTimeout(init, 0);
	}
})();
