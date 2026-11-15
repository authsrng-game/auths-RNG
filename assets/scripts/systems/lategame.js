(function () {
	'use strict';
	// i got lazy
	const KEY = 'lategameData';

	const COSTS = {
		counterweight: { base: 2e9, growth: 1.6 },
		luck2: { base: 2e10, growth: 1.4 },
		printer2: { base: 2e11, growth: 1.5 },
		sell2: { base: 2e12, growth: 1.7 },
	};

	const WEIGHT_STEP = 1.2;
	const COUNTERWEIGHT_STEP = 1.15;
	const MAX_BULK = 1000;
	const UNLOCK_POINTS = 1e9;

	const UPGRADES = [
		{
			id: 'luck2',
			name: 'luck II',
			desc: '+2% to your final luck multiplier per level',
			effect: (n) => 1 + 0.02 * n,
		},
		{
			id: 'printer2',
			name: 'printer II',
			desc: '+25% point printer income per level',
			effect: (n) => 1 + 0.25 * n,
		},
		{
			id: 'sell2',
			name: 'sell value',
			desc: '+10% points from selling rarities per level',
			effect: (n) => 1 + 0.1 * n,
		},
	];

	let _raw = null;
	let _data = null;

	function load() {
		let raw = null;
		try {
			raw = localStorage.getItem(KEY);
		} catch (_) {}
		if (_data && raw === _raw) return _data;
		_raw = raw;
		let parsed = {};
		try {
			parsed = JSON.parse(raw || '{}') || {};
		} catch (_) {}
		_data = Object.assign(
			{ unlocked: false, counterweight: 0, luck2: 0, printer2: 0, sell2: 0 },
			parsed
		);
		return _data;
	}

	function save(d) {
		_data = d;
		_raw = JSON.stringify(d);
		localStorage.setItem(KEY, _raw);
		window.saveAllData?.();
	}

	function costOf(id, level) {
		const c = COSTS[id];
		return Math.ceil(c.base * Math.pow(c.growth, level));
	}

	function milestones() {
		let m = 0;
		const consts = window.getStarmapConstellationsCount?.() || 0;
		m += consts;
		const rolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
		if (rolls >= 1e5) m += Math.floor(Math.log10(rolls)) - 4;
		try {
			if (window.dealerStore?.load().dead) m += 1;
		} catch (_) {}
		return m;
	}

	function rawWeight() {
		return Math.pow(WEIGHT_STEP, milestones());
	}

	function checkUnlock() {
		const d = load();
		if (d.unlocked) return;
		if ((window.getPoints?.() || 0) < UNLOCK_POINTS) return;
		d.unlocked = true;
		save(d);
		window.showAnomalyPopup?.('something heavy settles over the shop...');
		recalc();
		render();
	}

	function getWeight() {
		if (!load().unlocked) return 1;
		const n = load().counterweight;
		return Math.max(1, rawWeight() / Math.pow(COUNTERWEIGHT_STEP, n));
	}

	function fmt(n) {
		return typeof window.formatNum === 'function' ? window.formatNum(n) : String(Math.round(n));
	}

	function fmtMult(n) {
		return typeof window.formatMult === 'function' ? window.formatMult(n) : n.toFixed(2);
	}

	function upgradeMult(id) {
		const u = UPGRADES.find((x) => x.id === id);
		return u.effect(load()[id]);
	}

	function applyLuck(m) {
		return Math.max(1, (m * upgradeMult('luck2')) / getWeight());
	}

	function breakdown() {
		const out = [];
		const w = getWeight();
		if (w > 1.0001) out.push(`weight: /${fmtMult(w)}x`);
		const l2 = load().luck2;
		if (l2 > 0) out.push(`luck II: ${fmtMult(upgradeMult('luck2'))}x`);
		return out;
	}

	function recalc() {
		if (typeof recalcLuckMultiplier === 'function') recalcLuckMultiplier();
	}

	let busy = false;

	function buy(id, bulk) {
		busy = true;
		const d = load();
		const key = id;
		let n = 0;
		const want = bulk ? MAX_BULK : 1;
		while (n < want) {
			const cost = costOf(id, d[key]);
			if (!Number.isFinite(cost) || (window.getPoints?.() || 0) < cost) break;
			if (!window.spendPoints?.(cost)) break;
			d[key]++;
			n++;
		}
		busy = false;
		if (!n) {
			window.showAlert?.('not enough points!');
			return;
		}
		save(d);
		recalc();
		render();
	}

	function row(name, desc, level, cost, onBuy, onMax, canAfford) {
		const el = document.createElement('div');
		el.className = 'shop-item';
		el.dataset.cost = String(cost);
		el.innerHTML = `
			<div class="shop-item-header">
				<div class="shop-item-name">${name}</div>
				<div class="shop-item-level">lv ${fmt(level)}</div>
			</div>
			<div class="shop-item-desc">${desc}</div>
			<div class="shop-item-footer">
				<div class="shop-item-cost">${fmt(cost)} pts</div>
				<div style="display:flex;gap:6px;">
					<button class="small lg-buy" ${canAfford ? '' : 'disabled'}>buy</button>
					<button class="small lg-max" ${canAfford ? '' : 'disabled'}>max</button>
				</div>
			</div>`;
		el.querySelector('.lg-buy').addEventListener('click', onBuy);
		el.querySelector('.lg-max').addEventListener('click', onMax);
		return el;
	}

	function ensureRoot() {
		let root = document.getElementById('lategameShop');
		if (root) return root;
		const anchor = document.getElementById('potionsContainer');
		if (!anchor || !anchor.parentElement) return null;
		root = document.createElement('div');
		root.id = 'lategameShop';
		anchor.parentElement.appendChild(root);
		return root;
	}

	function render() {
		const root = ensureRoot();
		if (!root) return;
		const d = load();
		const pts = window.getPoints?.() || 0;
		root.innerHTML = '';
		if (!d.unlocked) return;

		const div1 = document.createElement('div');
		div1.className = 'shop-divider';
		div1.innerHTML = '<span class="shop-divider-label">the weight</span>';
		root.appendChild(div1);

		const w = getWeight();
		const info = document.createElement('div');
		info.className = 'shop-item';
		info.innerHTML = `
			<div class="shop-item-name">current weight: /${fmtMult(w)}x luck</div>
			<div class="shop-item-desc">
				it grows as you advance: constellations, every power of ten of rolls past 100K, and what you did at the table.
				counterweights divide it, but it never drops below 1x...
			</div>`;
		root.appendChild(info);

		const cw = costOf('counterweight', d.counterweight);
		root.appendChild(
			row(
				'counterweight',
				`divides the weight by ${COUNTERWEIGHT_STEP} per level`,
				d.counterweight,
				cw,
				() => buy('counterweight', false),
				() => buy('counterweight', true),
				pts >= cw
			)
		);

		const div2 = document.createElement('div');
		div2.className = 'shop-divider';
		div2.innerHTML = '<span class="shop-divider-label">ascended upgrades</span>';
		root.appendChild(div2);

		UPGRADES.forEach((u) => {
			const c = costOf(u.id, d[u.id]);
			root.appendChild(
				row(
					u.name,
					`${u.desc} (now ${fmtMult(u.effect(d[u.id]))}x)`,
					d[u.id],
					c,
					() => buy(u.id, false),
					() => buy(u.id, true),
					pts >= c
				)
			);
		});
	}

	let lastWeight = null;
	setInterval(() => {
		checkUnlock();
		const w = getWeight();
		if (lastWeight === null || Math.abs(w - lastWeight) > 1e-9) {
			lastWeight = w;
			recalc();
		}
	}, 5000);

	document.addEventListener('pointsChanged', () => {
		checkUnlock();
		if (busy || document.hidden) return;
		const pts = window.getPoints?.() || 0;
		document.querySelectorAll('#lategameShop .shop-item[data-cost]').forEach((el) => {
			const ok = pts >= Number(el.dataset.cost);
			el.querySelectorAll('button').forEach((b) => (b.disabled = !ok));
		});
	});

	window.Lategame = {
		applyLuck,
		breakdown,
		getWeight,
		sellMult: () => upgradeMult('sell2'),
		printerMult: () => upgradeMult('printer2'),
		render,
	};
	window.reloadLategameCache = () => {
		_data = null;
		_raw = null;
		recalc();
		render();
	};

	function tryInit(n) {
		if (document.getElementById('potionsContainer')) {
			render();
			recalc();
		} else if (n > 0) {
			setTimeout(() => tryInit(n - 1), 200);
		}
	}
	tryInit(25);
})();
