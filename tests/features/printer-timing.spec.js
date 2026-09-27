/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Point Printer timing reconciliation', () => {
	test('reconciles passive point generation on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			shopUpgrades.printer = 5;
			points = 0;
			updatePointsDisplay();
			updateShopUI();

			// Fast-forward _lastPrinterTick into the past (e.g. 10 seconds ago) to simulate a background tab throttle
			_lastPrinterTick = Date.now() - 10000;

			// Trigger visibilitychange to visible
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return points;
		});

		expect(result).toBeGreaterThanOrEqual(50);
	});
});
