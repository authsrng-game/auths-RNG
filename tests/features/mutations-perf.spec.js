/* eslint-disable no-undef */
// Generated code starts here on 2026-11-03T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Mutations System Rarity Index Caching', () => {
	test('getRarityIndex returns accurate indices and uses cached Map lookup', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const ms = window.MutationSystem;
			if (!ms || typeof ms.getRarityIndex !== 'function') {
				return { error: 'MutationSystem not loaded' };
			}
			if (typeof rarities === 'undefined' || !Array.isArray(rarities) || rarities.length === 0) {
				return { error: 'rarities global array not defined' };
			}

			// Verify index lookups for known rarities
			const firstRarity = rarities[0];
			const middleRarity = rarities[Math.floor(rarities.length / 2)];
			const lastRarity = rarities[rarities.length - 1];

			const idxFirst = ms.getRarityIndex(firstRarity.name);
			const idxMiddle = ms.getRarityIndex(middleRarity.name);
			const idxLast = ms.getRarityIndex(lastRarity.name);
			const idxInvalid = ms.getRarityIndex('NonExistentRarity_12345');

			// Measure execution time of 5,000 lookups
			const start = performance.now();
			for (let i = 0; i < 5000; i++) {
				ms.getRarityIndex(firstRarity.name);
				ms.getRarityIndex(middleRarity.name);
				ms.getRarityIndex(lastRarity.name);
			}
			const durationMs = performance.now() - start;

			return {
				idxFirst,
				idxMiddle,
				idxLast,
				idxInvalid,
				expectedMiddle: Math.floor(rarities.length / 2),
				expectedLast: rarities.length - 1,
				durationMs,
			};
		});

		expect(result.error).toBeUndefined();
		expect(result.idxFirst).toBe(0);
		expect(result.idxMiddle).toBe(result.expectedMiddle);
		expect(result.idxLast).toBe(result.expectedLast);
		expect(result.idxInvalid).toBe(-1);
		// 15,000 lookups should take well under 100ms with O(1) Map caching
		expect(result.durationMs).toBeLessThan(100);
	});
});
// Generated code ends here on 2026-11-03T00:00:00Z:
