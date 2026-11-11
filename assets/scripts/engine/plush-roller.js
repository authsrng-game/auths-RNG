(function (root) {
	const SCALE = 1000000000n;
	const FULL = 1n << 256n; // fixed-point "probability 1"
	// 1n << 256n = no cap (what the issue proposes). Try FULL / 2n to stop the single
	// rarest-reachable item from dropping every roll at extreme luck.
	const P_CAP = FULL;
	const MULT_PRECISION = 1000000n;
	const NOTICEABLE_DENOM = 100n;
	const SCALE_REDUCED = SCALE / MULT_PRECISION;

	/*

	scale=
	Bin: ..11 1.11 1..1 1.1. 11.. 1.1. .... ....
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	28 24 20 16 12 8 4 0

	Hex: 3B9A CA00 (32-bit)
	Str: ; . . . (59, 154, 202, 0)
	Dec: 1,000,000,000 (953.674 MiB)

	mult=
	Bin: .... .... .... 1111 .1.. ..1. .1.. ....
	---+ ---+ ---+ ---+ ---+ ---+ ---+ ---+
	28 24 20 16 12 8 4 0

	Hex: 000F 4240 (32-bit)
	Str: . . B @ (0, 15, 66, 64)
	Dec: 1,000,000 (976.563 KiB)

	noticeable=
	Bin: .11. .1..
	---+ ---+
	4 0

	Hex: 64 (8-bit)
	Str: d (100)
	Dec: 100 (100 B)
	*/
	function rarityTier(r) {
		if (r.tier !== undefined) return r.tier;
		if (r.denomEpic) return 5;
		if (r.chance >= 0.5) return 0;
		if (r.chance >= 0.1) return 1;
		if (r.chance >= 0.01) return 2;
		if (r.chance >= 0.001) return 3;
		return 4;
	}

	// Generated code starts here on 2026-09-12T15:30:00Z:
	// Memoize BigInt denominator, noticeable flag, and minW values to avoid repeated conversions and comparisons per roll.
	const _rarityMetaCache = new WeakMap();
	function getRarityMeta(r) {
		let cached = _rarityMetaCache.get(r);
		if (cached !== undefined) return cached;
		let denom;
		if (r.denomEpic && root.Epic) {
			denom = root.Epic.from(r.denomEpic).toBigInt();
		} else {
			denom = BigInt(Math.round(1 / r.chance));
		}
		cached = {
			denom: denom,
			noticeable: denom >= NOTICEABLE_DENOM,
			minW: denom < 10000n ? 1n : 0n,
		};
		_rarityMetaCache.set(r, cached);
		return cached;
	}

	function denomBig(r) {
		return getRarityMeta(r).denom;
	}
	// Generated code ends here on 2026-09-12T15:30:00Z:

	class PlushRoller {
		constructor(rng) {
			this._rng = rng;
			this.pity = new root.PityTracker();
			this.streak = new root.StreakTracker();
			this.momentum = new root.MomentumTracker();
			this.fortune = new root.FortuneBank();
			this.resistance = new root.ResistanceTracker();
			this._rollCount = 0;
			this._pendingFortuneMult = null;
		}

		spendFortune() {
			this._pendingFortuneMult = this.fortune.spend();
			return this._pendingFortuneMult;
		}
		_buildWeightTable(rarities, luckMultiplier, inventoryData, shopUpgrades, luckBoostActive) {
			const weights = new Array(rarities.length).fill(0n);
			const streakMult = this.streak.getLuckMultiplier();
			const momentumMult = this.momentum.getMultiplier();
			const fortuneMult = this._pendingFortuneMult || 1.0;

			const baseNonNoticeableMult = streakMult * momentumMult;
			const baseNoticeableMult =
				baseNonNoticeableMult * (luckBoostActive ? 4.0 : 1.0) * luckMultiplier * fortuneMult;
			const hasMagnet = shopUpgrades.magnet > 0;
			const magnetFactor = hasMagnet ? 1 + shopUpgrades.magnet * 0.1 : 1.0;

			const order = this._order(rarities);

			// cascade: rarest first, each hits with min(1, mult / denom)
			let survive = FULL; // probability nothing rarer has hit yet
			for (let k = 0; k < order.notice.length && survive > 0n; k++) {
				const i = order.notice[k];
				const r = rarities[i];
				const meta = getRarityMeta(r);

				let p;
				if (this.pity.isHardPity(r)) {
					p = FULL; // hard pity is a guarantee
				} else {
					let mult = baseNoticeableMult;
					if (hasMagnet && !inventoryData.has(r.name)) mult *= magnetFactor;
					mult *= this.pity.getMultiplier(r);
					mult *= this.streak.getDryRunMultiplier(r.name, r.chance, meta.denom);
					mult *= this.resistance.getMultiplier(r);

					if (!Number.isFinite(mult)) {
						p = P_CAP;
					} else {
						const multBig = BigInt(Math.max(0, Math.round(mult * Number(MULT_PRECISION))));
						p = (multBig * FULL) / (meta.denom * MULT_PRECISION);
						if (p > P_CAP) p = P_CAP;
					}
				}

				const w = (p * survive) / FULL;
				weights[i] = w;
				survive -= w;
			}

			// leftover probability goes to the common rarities, split like the old weights
			if (survive > 0n && order.common.length) {
				const cw = new Array(order.common.length);
				let commonTotal = 0n;
				for (let k = 0; k < order.common.length; k++) {
					const meta = getRarityMeta(rarities[order.common[k]]);
					let w;
					if (baseNonNoticeableMult === 1.0) {
						w = SCALE / meta.denom;
					} else {
						const multBig = BigInt(
							Math.max(0, Math.round(baseNonNoticeableMult * Number(MULT_PRECISION)))
						);
						w = (SCALE_REDUCED * multBig) / meta.denom;
					}
					if (w < meta.minW) w = meta.minW;
					cw[k] = w;
					commonTotal += w;
				}
				if (commonTotal > 0n) {
					for (let k = 0; k < order.common.length; k++) {
						weights[order.common[k]] = (survive * cw[k]) / commonTotal;
					}
				} else {
					weights[order.common[order.common.length - 1]] = survive;
				}
			}

			let totalWeight = 0n;
			for (let i = 0; i < weights.length; i++) totalWeight += weights[i];
			return { weights: weights, totalWeight: totalWeight };
		}

		roll(rarities, luckMultiplier, inventoryData, shopUpgrades, luckBoostActive) {
			const table = this._buildWeightTable(
				rarities,
				luckMultiplier,
				inventoryData,
				shopUpgrades,
				luckBoostActive
			);
			this._pendingFortuneMult = null;
			const weights = table.weights;
			const totalWeight = table.totalWeight;

			let rand = this._rng.intBelow(totalWeight > 0n ? totalWeight : 1n);
			let chosenIndex = rarities.length - 1;

			for (let i = 0; i < rarities.length; i++) {
				if (rand < weights[i]) {
					chosenIndex = i;
					break;
				}
				rand -= weights[i];
			}

			const result = rarities[chosenIndex];
			const wasPity = this.pity.isHardPity(result);
			const isHotPulse = this.streak.isInHotPulse();

			// Generated code starts here on 2026-09-12T12:00:00Z:
			// Increment global pity step and reset chosen item in O(1).
			this.pity.advance();
			if (this.pity.isEligible(result)) {
				this.pity.reset(result.name, wasPity);
			}
			// Generated code ends here on 2026-09-12T12:00:00Z:

			this.streak.record(rarityTier(result), result.name, rarityTier(result) >= 3);
			this.momentum.record();
			this.fortune.deposit();
			this.resistance.onWin(result);
			this.resistance.tick();

			this._rollCount++;
			if (root.PlushLog) {
				root.PlushLog.debug('roll', 'roll #' + this._rollCount, {
					result: result.name,
					wasPity: wasPity,
					combo: this.momentum.combo(),
				});
				if (rarityTier(result) >= 4) {
					root.PlushLog.milestone('roll', 'rare pull landed', {
						name: result.name,
						rollNumber: this._rollCount,
						wasPity: wasPity,
					});
				}
			}

			return {
				rarity: result,
				index: chosenIndex,
				totalWeight: totalWeight.toString(),
				wasPity: wasPity,
				pityCurrent: this.pity.get(result.name),
				isHotPulse: isHotPulse,
				comboMultiplier: this.momentum.getMultiplier(),
				resistanceRemaining: this.resistance.remaining(result.name),
			};
		}

		probabilityOf(rarity, rarities, luckMultiplier, inventoryData, shopUpgrades, luckBoostActive) {
			const table = this._buildWeightTable(
				rarities,
				luckMultiplier,
				inventoryData,
				shopUpgrades,
				luckBoostActive
			);
			const idx = rarities.findIndex(function (r) {
				return r.name === rarity.name;
			});
			if (idx === -1) return 0;
			if (table.totalWeight === 0n) return 0;
			return Number(table.weights[idx]) / Number(table.totalWeight);
		}

		denomOf(rarity) {
			return Number(denomBig(rarity));
		}

		denomOfString(rarity) {
			return denomBig(rarity).toString();
		}

		_order(rarities) {
			const c = this._orderCache;
			if (c && c.src === rarities && c.len === rarities.length) return c;
			const notice = [];
			const common = [];
			for (let i = 0; i < rarities.length; i++) {
				(getRarityMeta(rarities[i]).noticeable ? notice : common).push(i);
			}
			notice.sort((a, b) => {
				const da = getRarityMeta(rarities[a]).denom;
				const db = getRarityMeta(rarities[b]).denom;
				return da > db ? -1 : da < db ? 1 : 0;
			});
			this._orderCache = { src: rarities, len: rarities.length, notice, common };
			return this._orderCache;
		}
	}

	root.PlushRoller = PlushRoller;
})(typeof window !== 'undefined' ? window : this);
