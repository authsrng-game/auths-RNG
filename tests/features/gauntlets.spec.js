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
});
// Generated code ends here on 2026-03-31T00:00:00Z:
