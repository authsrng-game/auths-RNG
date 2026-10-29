/* global window */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('starmap compression and luck calculation', () => {
	test('getPityCompressionReduction and getStarmapLuckBonus calculate correct cumulative multipliers', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('starmapUnlocked', '1');
			localStorage.setItem(
				'starmapData',
				JSON.stringify({
					constellations: [],
					voidShards: 100000,
					compressionTiers: 0,
					permanentLuckStacks: 2,
					voidMarketLuck: 0.5,
				})
			);
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const initialCompression = window.getPityCompressionReduction();
			const initialLuck = window.getStarmapLuckBonus();

			// Buy first compression tier (cost 75000, mult 0.75)
			window.buyCompressionTier();

			const tier1Compression = window.getPityCompressionReduction();
			const starmapDataAfter = JSON.parse(localStorage.getItem('starmapData') || '{}');

			return {
				initialCompression,
				initialLuck, // 1 + 2 * 0.25 + 0.5 = 2.0
				tier1Compression,
				voidShardsRemaining: starmapDataAfter.voidShards,
				compressionTiers: starmapDataAfter.compressionTiers,
			};
		});

		expect(result.initialCompression).toBe(1);
		expect(result.initialLuck).toBe(2.0);
		expect(result.tier1Compression).toBe(0.75);
		expect(result.voidShardsRemaining).toBe(25000);
		expect(result.compressionTiers).toBe(1);
	});
});
