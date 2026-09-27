(function (root) {
	const SCALE = 1000000000n;
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
			const weights = new Array(rarities.length);
			let totalWeight = 0n;
			const streakMult = this.streak.getLuckMultiplier();
			const momentumMult = this.momentum.getMultiplier();
			const fortuneMult = this._pendingFortuneMult || 1.0;

			// Generated code starts here on 2026-09-12T15:30:00Z:
			// Precalculate constant base multipliers outside loop to eliminate 2,000+ per-item floating point multiplications per roll.
			const baseNonNoticeableMult = streakMult * momentumMult;
			const baseNoticeableMult =
				baseNonNoticeableMult * (luckBoostActive ? 4.0 : 1.0) * luckMultiplier * fortuneMult;
			const hasMagnet = shopUpgrades.magnet > 0;
			const magnetFactor = hasMagnet ? 1 + shopUpgrades.magnet * 0.1 : 1.0;

			for (let i = 0; i < rarities.length; i++) {
				const r = rarities[i];
				const meta = getRarityMeta(r);
				const denom = meta.denom;
				const noticeable = meta.noticeable;

				let mult;
				if (noticeable) {
					mult = baseNoticeableMult;
					if (hasMagnet && !inventoryData.has(r.name)) mult *= magnetFactor;
					mult *= this.pity.getMultiplier(r);
					mult *= this.streak.getDryRunMultiplier(r.name, r.chance, denom);
					mult *= this.resistance.getMultiplier(r);
				} else {
					mult = baseNonNoticeableMult;
				}

				let w;
				if (mult === 1.0) {
					w = SCALE / denom;
				} else {
					const multBig = BigInt(Math.max(0, Math.round(mult * Number(MULT_PRECISION))));
					w = (SCALE_REDUCED * multBig) / denom;
				}
				if (w < meta.minW) w = meta.minW;

				weights[i] = w;
				totalWeight += w;
			}
			// Generated code ends here on 2026-09-12T15:30:00Z:

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
	}

	root.PlushRoller = PlushRoller;
})(typeof window !== 'undefined' ? window : this);
