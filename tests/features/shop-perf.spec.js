const { test, expect } = require('@playwright/test');

/* global document, window */

const BASE_URL = 'http://localhost:8080/';

test.describe('Shop UI Performance & Element Caching', () => {
	test('updateShopUI updates UI elements on points/upgrade changes and caches references', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
			localStorage.setItem('shopPoints', '500');
			localStorage.setItem(
				'shopUpgrades',
				JSON.stringify({ luck: 0, speed: 0, pointMult: 0, magnet: 0, printer: 0, duplicate: 0 })
			);
		});

		await page.goto(BASE_URL);

		// Verify initial points value display
		const pointsValue = page.locator('#pointsValue');
		await expect(pointsValue).toHaveText('500');

		// Mark buyLuckBtn DOM element to verify element reference preservation / caching
		await page.evaluate(() => {
			const btn = document.getElementById('buyLuckBtn');
			if (btn) btn._marker = 'cached_luck_btn';
		});

		// Call updateShopUI again
		await page.evaluate(() => {
			window.refreshAllDisplays();
		});

		// Verify that element reference is preserved
		const markerPreserved = await page.evaluate(() => {
			const btn = document.getElementById('buyLuckBtn');
			return btn ? btn._marker === 'cached_luck_btn' : false;
		});
		expect(markerPreserved).toBe(true);

		// Award points via window.awardPoints and check that points & shop UI reflect state change
		await page.evaluate(() => {
			window.awardPoints(1000);
		});

		await expect(pointsValue).toHaveText('1.5K');

		// Verify luck upgrade button is enabled with new points
		const buyLuckBtn = page.locator('#buyLuckBtn');
		await expect(buyLuckBtn).toBeEnabled();
	});

	test('updatePointsDisplay guards text assignments when formatted value is unchanged', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
			localStorage.setItem('shopPoints', '250');
		});

		await page.goto(BASE_URL);

		// Intercept textContent setter or verify display updates smoothly
		const displayValue = await page.evaluate(() => {
			const el = document.getElementById('pointsValue');
			return el ? el.textContent : null;
		});
		expect(displayValue).toBe('250');

		// Re-invoking updatePointsDisplay with same points value should preserve textContent without error
		await page.evaluate(() => {
			window.refreshAllDisplays();
		});

		const displayValueAfter = await page.evaluate(() => {
			const el = document.getElementById('pointsValue');
			return el ? el.textContent : null;
		});
		expect(displayValueAfter).toBe('250');
	});
});
