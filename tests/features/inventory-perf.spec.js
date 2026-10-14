// Generated code starts here on 2026-10-14T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global document, window */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Inventory & Achievements DOM Batching Performance', () => {
	test('updateAchievementsUI and renderSortedInventory populate DOM elements efficiently', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});

		await page.goto(BASE_URL);

		// Check achievementsContainer rendered cards
		const achievementCards = page.locator('#achievementsContainer .achievement');
		await expect(achievementCards).toHaveCount(36);

		// Test renderSortedInventory and updateAchievementsUI batching performance
		const result = await page.evaluate(() => {
			const start = performance.now();

			// Run 100 render cycles of updateAchievementsUI and renderSortedInventory
			for (let i = 0; i < 100; i++) {
				if (typeof window.updateAchievementsUI === 'function') {
					window.updateAchievementsUI();
				}
				if (typeof window.renderSortedInventory === 'function') {
					window.renderSortedInventory('rare');
					window.renderSortedInventory('common');
					window.renderSortedInventory('alpha');
				}
			}

			const duration = performance.now() - start;
			const achCount = document.querySelectorAll('#achievementsContainer .achievement').length;

			return { duration, achCount };
		});

		expect(result.achCount).toBe(36);
		expect(result.duration).toBeLessThan(500); // 400 total DOM batch renders should complete in <500ms
	});
});
// Generated code ends here on 2026-10-14T00:00:00Z:
