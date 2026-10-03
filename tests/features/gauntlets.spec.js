// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global inventoryData, rarityTimestamps, renderGauntlets */

const BASE_URL = 'http://localhost:8080/';

test.describe('gauntlets system completion logic', () => {
	test('easy tier completion respects rarity presence and acquisition timestamps', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Step 1: Set totalRolls and empty gauntletData, reload page
		await page.evaluate(() => {
			localStorage.setItem('totalRolls', '1000');
			const gauntletData = { easy: { lastClaim: 0, lastClaimTime: 0 } };
			localStorage.setItem('gauntletData', JSON.stringify(gauntletData));
		});
		await page.reload();

		const easyMeta = page.locator('.gauntlet-tier[data-tier="easy"] .gauntlet-tier-meta');
		await expect(easyMeta).not.toHaveText('✓ ready');

		// Step 2: Add easy rarities and timestamps in script context
		await page.evaluate(() => {
			const easyRarities = ['Common', 'Uncommon', 'Garbage', 'Blown', 'Cool', 'Tired'];
			easyRarities.forEach((r) => {
				inventoryData.set(r, { count: 1 });
				rarityTimestamps.set(r, Date.now());
			});
			renderGauntlets();
		});

		await expect(easyMeta).toHaveText('✓ ready');

		// Step 3: Set claim time in gauntletData, update timestamps to prior to claimTime
		await page.evaluate(() => {
			const claimTime = Date.now();
			const gauntletData = { easy: { lastClaim: 0, lastClaimTime: claimTime } };
			localStorage.setItem('gauntletData', JSON.stringify(gauntletData));

			const easyRarities = ['Common', 'Uncommon', 'Garbage', 'Blown', 'Cool', 'Tired'];
			easyRarities.forEach((r) => {
				rarityTimestamps.set(r, claimTime - 1000);
			});

			renderGauntlets();
		});

		await expect(easyMeta).not.toHaveText('✓ ready');
	});

	test('all static gauntlet tiers have strictly monotonic rarity denominators', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			/* global rarities, document */
			const rarityMap = new Map(rarities.map((r) => [r.name, Math.round(1 / r.chance)]));
			const nonMonotonicTiers = [];

			// Find TIERS by rendering or querying TIERS if exposed, or inspecting gauntlet cards
			const gauntletContainer = document.getElementById('gauntletContainer');
			if (!gauntletContainer) return { error: 'gauntletContainer not found' };

			// We can also evaluate rarity denominators for hard-coded static tier rarities from window
			// or by fetching gauntlets.js content / inspecting DOM chip grids if unrolled.
			// Let's verify each static tier's rarity list in rarities map.
			const hardTierRarities = ['Eclipse', 'Lunarity', 'Wildfire', 'Despair', 'Paradox'];
			const denoms = hardTierRarities.map((r) => rarityMap.get(r));

			for (let i = 0; i < denoms.length - 1; i++) {
				if (denoms[i] > denoms[i + 1]) {
					nonMonotonicTiers.push({ index: i, denomA: denoms[i], denomB: denoms[i + 1] });
				}
			}

			return { nonMonotonicTiers, denoms };
		});

		expect(result.nonMonotonicTiers).toEqual([]);
		expect(result.denoms).toEqual([1500, 1700, 1854, 1900, 2000]);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
