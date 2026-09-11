(function (root) {
	const SCALE = 1000000000n;
	const MULT_PRECISION = 1000000n;
	const NOTICEABLE_DENOM = 100n;

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

	// Generated code starts here on 2026-09-11T03:25:15Z:
	// Memoize BigInt denominator values to avoid ~300 conversions per roll.
	const _denomBigCache = new WeakMap();
	function denomBig(r) {
		let cached = _denomBigCache.get(r);
		if (cached !== undefined) return cached;
		if (r.denomEpic && root.Epic) {
			cached = root.Epic.from(r.denomEpic).toBigInt();
		} else {
			cached = BigInt(Math.round(1 / r.chance));
		}
		_denomBigCache.set(r, cached);
		return cached;
	}
	// Generated code ends here on 2026-09-11T03:25:15Z:

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

			for (let i = 0; i < rarities.length; i++) {
				const r = rarities[i];
				const denom = denomBig(r);
				const noticeable = denom >= NOTICEABLE_DENOM;

				let mult = streakMult * momentumMult;
				if (luckBoostActive && noticeable) mult *= 4;
				if (noticeable) mult *= luckMultiplier;
				if (noticeable) mult *= fortuneMult;

				if (shopUpgrades.magnet > 0 && !inventoryData.has(r.name) && noticeable) {
					mult *= 1 + shopUpgrades.magnet * 0.1;
				}

				if (noticeable) {
					mult *= this.pity.getMultiplier(r);
					mult *= this.streak.getDryRunMultiplier(r.name, r.chance || 1 / Number(denom));
					mult *= this.resistance.getMultiplier(r);
				}

				const multBig = BigInt(Math.max(0, Math.round(mult * Number(MULT_PRECISION))));
				let w = (SCALE * multBig) / (denom * MULT_PRECISION);
				const minW = denom < 10000n ? 1n : 0n;
				if (w < minW) w = minW;

				weights[i] = w;
				totalWeight += w;
			}

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

			for (let i = 0; i < rarities.length; i++) {
				const r = rarities[i];
				if (!this.pity.isEligible(r)) continue;
				if (r.name === result.name) {
					this.pity.reset(r.name, wasPity);
				} else {
					this.pity.increment(r.name);
				}
			}

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
