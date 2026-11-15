'use strict';

(function () {
	// i dont wanna overfill main.js so we are making a new file!
	const COST_SCALE = 20;
	const exp = (base, growth) => (l) => Math.floor(base * COST_SCALE * Math.pow(growth, l));
	const f2 = (n) => String(Math.round(n * 100) / 100);
	const pct = (n) => f2(n * 100) + '%';
	const fn = (n) => (window.formatNum ? window.formatNum(n) : String(Math.round(n)));

	let source = () => ({});

	const GROUPS = [
		{ id: 'economy', label: 'economy' },
		{ id: 'luck', label: 'luck and boosts' },
		{ id: 'potions', label: 'potion mastery' },
		{ id: 'duplicates', label: 'duplication' },
		{ id: 'well', label: 'wishing well' },
	];

	const DEFS = [
		{
			key: 'haggler',
			group: 'economy',
			name: 'haggler',
			max: 200,
			desc: '+5% sell value per level',
			cost: exp(50000, 1.07),
			value: (l) => 1 + l * 0.05,
			fmt: (v) => 'sell value x' + f2(v),
		},
		{
			key: 'printerBoost',
			group: 'economy',
			name: 'overclocked printer',
			max: 100,
			desc: '+10% point printer output per level',
			cost: exp(250000, 1.09),
			value: (l) => 1 + l * 0.1,
			fmt: (v) => 'printer output x' + f2(v),
		},
		{
			key: 'printerStorage',
			group: 'economy',
			name: 'printer storage',
			max: 24,
			desc: '+30m of offline printing per level (base 1h)',
			cost: exp(1000000, 1.45),
			value: (l) => 3600 + l * 1800,
			fmt: (v) => f2(v / 3600) + 'h of offline printing',
		},
		{
			key: 'rollBounty',
			group: 'economy',
			name: 'roll bounty',
			max: 100,
			desc: 'earn bonus points on every single roll',
			cost: exp(200000, 1.1),
			value: (l) => Math.floor(20 * Math.pow(l, 1.5)),
			fmt: (v) => '+' + fn(v) + ' pts per roll',
		},
		{
			key: 'bulkSeller',
			group: 'economy',
			name: 'bulk contracts',
			max: 100,
			desc: '+2% bonus points when using sell all',
			cost: exp(1000000, 1.08),
			value: (l) => 1 + l * 0.02,
			fmt: (v) => 'sell all bonus x' + f2(v),
		},
		{
			key: 'dailyBonus',
			group: 'economy',
			name: 'loyalty program',
			max: 50,
			desc: '+10% daily and weekly reward points per level',
			cost: exp(500000, 1.12),
			value: (l) => 1 + l * 0.1,
			fmt: (v) => 'daily and weekly rewards x' + f2(v),
		},

		{
			key: 'luckMult',
			group: 'luck',
			name: 'fortune compound',
			max: 100,
			desc: '+2% total luck per level (multiplicative)',
			cost: exp(1000000, 1.1),
			value: (l) => 1 + l * 0.02,
			fmt: (v) => 'luck x' + f2(v),
		},
		{
			key: 'boostLength',
			group: 'luck',
			name: 'boost extender',
			max: 30,
			desc: '+5s on the roll milestone luck boost per level',
			cost: exp(200000, 1.25),
			value: (l) => 60000 + l * 5000,
			fmt: (v) => f2(v / 1000) + 's boost',
		},
		{
			key: 'boostCycle',
			group: 'luck',
			name: 'boost cycle',
			max: 10,
			desc: 'the milestone boost triggers 5 rolls sooner per level',
			cost: exp(5000000, 1.9),
			value: (l) => 100 - l * 5,
			fmt: (v) => 'boost every ' + v + ' rolls',
		},
		{
			key: 'boostPower',
			group: 'luck',
			name: 'boost amplifier',
			max: 40,
			desc: '+0.25x to the milestone boost multiplier per level',
			cost: exp(10000000, 1.3),
			value: (l) => 4 + l * 0.25,
			fmt: (v) => 'boost is ' + f2(v) + 'x luck',
		},
		{
			key: 'anomalyResonance',
			group: 'luck',
			name: 'anomaly resonance',
			max: 50,
			desc: 'consumed anomalies give +0.05x more luck each per level',
			cost: exp(5000000, 1.15),
			value: (l) => 0.5 + l * 0.05,
			fmt: (v) => '+' + f2(v) + 'x luck per consumed anomaly',
		},
		{
			key: 'anomalyMagnet',
			group: 'luck',
			name: 'anomaly magnet',
			max: 50,
			desc: '+1% chance per level for an anomaly drop to give one extra',
			cost: exp(20000000, 1.17),
			value: (l) => l * 0.01,
			fmt: (v) => pct(v) + ' chance for a bonus anomaly',
		},

		{
			key: 'potionDuration',
			group: 'potions',
			name: 'extended brew',
			max: 100,
			desc: '+4% potion duration per level',
			cost: exp(300000, 1.09),
			value: (l) => 1 + l * 0.04,
			fmt: (v) => 'potions last x' + f2(v) + ' longer',
		},
		{
			key: 'potionPotency',
			group: 'potions',
			name: 'potent brew',
			max: 100,
			desc: '+1% potion strength per level',
			cost: exp(1000000, 1.1),
			value: (l) => 1 + l * 0.01,
			fmt: (v) => 'potion strength x' + f2(v),
		},
		{
			key: 'potionDiscount',
			group: 'potions',
			name: 'alchemist discount',
			max: 50,
			desc: '-1% potion prices per level',
			cost: exp(1000000, 1.12),
			value: (l) => 1 - l * 0.01,
			fmt: (v) => 'potions cost ' + pct(v) + ' of base',
		},
		{
			key: 'potionSaver',
			group: 'potions',
			name: 'thrifty brewer',
			max: 40,
			desc: '+1% chance per level to not use up a potion',
			cost: exp(5000000, 1.15),
			value: (l) => l * 0.01,
			fmt: (v) => pct(v) + ' chance to keep a used potion',
		},

		{
			key: 'dupeRolls',
			group: 'duplicates',
			name: 'double dipper',
			max: 45,
			desc: '+2 rolls per duplicate potion per level',
			cost: exp(2000000, 1.12),
			value: (l) => 10 + l * 2,
			fmt: (v) => v + ' rolls per duplicate potion',
		},
		{
			key: 'dupeEcho',
			group: 'duplicates',
			name: 'echo duplicate',
			max: 50,
			desc: 'a second, independent +1% duplicate chance per level',
			cost: exp(10000000, 1.2),
			value: (l) => l * 0.01,
			fmt: (v) => pct(v) + ' extra duplicate chance',
		},
		{
			key: 'dupeJackpot',
			group: 'duplicates',
			name: 'duplicate jackpot',
			max: 50,
			desc: '+0.2% chance per level for a roll to give +9 copies',
			cost: exp(50000000, 1.2),
			value: (l) => l * 0.002,
			fmt: (v) => pct(v) + ' chance for +9 copies',
		},

		{
			key: 'wellLuck',
			group: 'well',
			name: 'blessed coin',
			max: 50,
			desc: '+0.5% wishing well win chance per level',
			cost: exp(1000000, 1.13),
			value: (l) => 0.4 + l * 0.005,
			fmt: (v) => pct(v) + ' win chance',
		},
		{
			key: 'wellPayout',
			group: 'well',
			name: 'deep pockets',
			max: 60,
			desc: '+0.05x wishing well payout per level',
			cost: exp(2000000, 1.12),
			value: (l) => 2 + l * 0.05,
			fmt: (v) => 'wins pay x' + f2(v),
		},
		{
			key: 'wellCooldown',
			group: 'well',
			name: 'restless spirits',
			max: 60,
			desc: '-1% wishing well cooldown per level',
			cost: exp(1000000, 1.1),
			value: (l) => 1 - l * 0.01,
			fmt: (v) => f2(v * 2) + 'h cooldown',
		},
	];

	const byKey = {};
	DEFS.forEach((d) => {
		byKey[d.key] = d;
	});

	function build(container) {
		const out = [];
		GROUPS.forEach((g) => {
			const divider = document.createElement('div');
			divider.className = 'shop-divider';
			divider.innerHTML = `<span class="shop-divider-label">${g.label}</span>`;
			container.appendChild(divider);
			DEFS.filter((d) => d.group === g.id).forEach((d) => {
				const p = 'sx-' + d.key + '-';
				const el = document.createElement('div');
				el.className = 'shop-item';
				el.innerHTML = `
					<div class="shop-item-header">
						<div class="shop-item-name">${d.name}</div>
						<div class="shop-item-level">lv <span id="${p}level">0</span> / ${d.max}</div>
					</div>
					<div class="upgrade-bar-wrap"><div class="upgrade-bar-fill" id="${p}bar" style="width: 0%"></div></div>
					<div class="shop-item-desc">${d.desc}</div>
					<div class="shop-item-desc" id="${p}now" style="margin-top: -6px; opacity: 0.8"></div>
					<div class="shop-item-footer">
						<div class="shop-item-cost"><span id="${p}cost">0</span> pts</div>
						<button id="${p}btn" class="small" aria-label="Upgrade ${d.name}">upgrade</button>
					</div>`;
				container.appendChild(el);
				out.push({
					key: d.key,
					cost: d.cost,
					max: d.max,
					row: {
						key: d.key,
						level: p + 'level',
						cost: p + 'cost',
						btn: p + 'btn',
						pips: null,
						bar: p + 'bar',
						now: p + 'now',
					},
				});
			});
		});
		return out;
	}

	window.ShopX = {
		defs: DEFS,
		bind: (fnSource) => {
			source = fnSource;
		},
		zeroes: () => {
			const o = {};
			DEFS.forEach((d) => {
				o[d.key] = 0;
			});
			return o;
		},
		val: (k) => byKey[k].value(source()[k] || 0),
		describe: (k, l) => byKey[k].fmt(byKey[k].value(l)),
		build,
	};
})();
