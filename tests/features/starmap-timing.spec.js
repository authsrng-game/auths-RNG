// Generated code starts here on 2026-09-26T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('starmap timing reconciliation', () => {
	test('starmap passive shard generation reconciles void shards on visibilitychange', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('starmapUnlocked', '1');
			const initialLast = Date.now() - 3600000; // 1 hour ago
			localStorage.setItem(
				'starmapData',
				JSON.stringify({
					constellations: [
						{
							id: 'c_test',
							index: 1,
							createdAt: Date.now() - 3600000,
							stars: [{ name: 'TestStar', chance: 0.01 }],
						},
					],
					voidShards: 10,
					lastShardCalc: initialLast,
					shopPurchases: {},
					permanentLuckStacks: 1,
					voidMarketLuck: 0,
				})
			);
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			/* global window, document */
			// Get initial shard count in starmap data
			const dataBefore = JSON.parse(localStorage.getItem('starmapData') || '{}');
			const shardsBefore = dataBefore.voidShards;

			// Simulate 1 hour passing in background
			const currentLast = dataBefore.lastShardCalc;
			dataBefore.lastShardCalc = currentLast - 3600000;
			localStorage.setItem('starmapData', JSON.stringify(dataBefore));

			// Reload starmap cache if helper exists and dispatch visibilitychange to simulate tab refocus
			if (typeof window.reloadStarmapCache === 'function') {
				window.reloadStarmapCache();
			}
			document.dispatchEvent(new Event('visibilitychange'));

			const dataAfter = JSON.parse(localStorage.getItem('starmapData') || '{}');
			return {
				shardsBefore,
				shardsAfter: dataAfter.voidShards,
			};
		});

		expect(result.shardsAfter).toBeGreaterThan(result.shardsBefore);
	});
});
// Generated code ends here on 2026-09-26T00:00:00Z:
