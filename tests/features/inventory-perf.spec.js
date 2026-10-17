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

	test('updateCollectedCounter and updateRollsSinceRare execute efficiently on repeat roll updates', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const commonRarity = { name: 'Common', chance: 0.5 };
			const rareRarity = { name: 'Insanity', chance: 0.0001 };

			const start = performance.now();

			// Simulate 1,000 roll iterations calling updateCollectedCounter and updateRollsSinceRare
			for (let i = 0; i < 1000; i++) {
				if (typeof window.updateCollectedCounter === 'function') {
					window.updateCollectedCounter();
				}
				if (typeof window.updateRollsSinceRare === 'function') {
					window.updateRollsSinceRare(i % 50 === 0 ? rareRarity : commonRarity);
				}
			}

			const duration = performance.now() - start;
			const collectedText = document.getElementById('collectedCounter')?.textContent || '';
			const rollsSinceRareText = document.getElementById('rollsSinceRare')?.textContent || '';

			return { duration, collectedText, rollsSinceRareText };
		});

		expect(result.collectedText).toContain('collected');
		expect(result.rollsSinceRareText).toContain('rolls since last rare:');
		expect(result.duration).toBeLessThan(50); // 1,000 iterations should complete in <50ms
	});
});
// Generated code ends here on 2026-10-14T00:00:00Z:
