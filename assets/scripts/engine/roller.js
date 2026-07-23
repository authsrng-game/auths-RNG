(function (root) {
	const SCALE = 1000000000n;
	const MULT_PRECISION = 1000000n;

	function rarityTier(r) {
		if (r.tier !== undefined) return r.tier;
		if (r.chance >= 0.5) return 0;
		if (r.chance >= 0.1) return 1;
		if (r.chance >= 0.01) return 2;
		if (r.chance >= 0.001) return 3;
		return 4;
	}

	class BeaconRoller {
		constructor(rng) {
			this._rng = rng;
			this.pity = new root.PityTracker();
			this.streak = new root.StreakTracker();
		}
		_buildWeightTable(rarities,
			luckMultiplier,
			inventoryData,
			shopUpgrades,
			luckBoostActive) {
			const weights = new Array(rarities.length);
			let totalWeight = 0n;
			const streakMult = this.streak.getLuckMultiplier();

			for (let i = 0; i < rarities.length; i++) {
				const r = rarities[i];
				const denom = Math.round(1 / r.chance);
				const noticeable = denom >= 100;

				let mult = streakMult;
				if (luckBoostActive && noticeable) mult *= 4;
				if (noticeable) mult *= luckMultiplier;

				if (shopUpgrades.magnet > 0 && !inventoryData.has(r.name) && noticeable) {
					mult *= 1 + shopUpgrades.magnet * 0.1;
				}

				if (noticeable) {
					mult *= this.pity.getMultiplier(r);
					mult *= this.streak.getDryRunMultiplier(r.name, r.chance);
				}

				const multBig = BigInt(Math.round(mult * Number(MULT_PRECISION)));
				const denomBig = BigInt(denom);
				let w = (SCALE * multBig) / (denomBig * MULT_PRECISION);
				const minW = r.chance >= 0.01 ? 1n : 0n;
				if (w < minW) w = minW;

				weights[i] = w;
				totalWeight += w;
			}

			return { weights: weights, totalWeight: totalWeight };
		}
		roll(rarities,
			luckMultiplier,
			inventoryData,
			shopUpgrades,
			luckBoostActive) {
			const table = this._buildWeightTable(
				rarities,
				luckMultiplier,
				inventoryData,
				shopUpgrades,
				luckBoostActive
			);
			const weights = table.weights;
			const totalWeight = table.totalWeight;

			let rand = this._rng.intBelow(totalWeight);
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
					this.pity.reset(r.name);
				} else {
					this.pity.increment(r.name);
				}
			}

			this.streak.record(rarityTier(result), result.name, rarityTier(result) >= 3);

			return {
				rarity: result,
				index: chosenIndex,
				totalWeight: totalWeight,
				wasPity: wasPity,
				pityCurrent: this.pity.get(result.name),
				isHotPulse: isHotPulse,
			};
		}
		probabilityOf(rarity,
			rarities,
			luckMultiplier,
			inventoryData,
			shopUpgrades,
			luckBoostActive) {
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
			return Number(table.weights[idx]) / Number(table.totalWeight);
		}
	}




	root.BeaconRoller = BeaconRoller;
})(typeof window !== 'undefined' ? window : this);
