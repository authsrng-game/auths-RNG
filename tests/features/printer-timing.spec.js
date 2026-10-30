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

	test('caps catch-up point generation at 3600 seconds and prevents cap bypass on subsequent ticks', async ({
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

			// Fast-forward _lastPrinterTick by 2 hours (7200 seconds)
			_lastPrinterTick = Date.now() - 7200000;

			// First tick upon regaining focus
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			const pointsAfterFocus = points;

			// Fast-forward _lastPrinterTick by 1 second for the next tick
			_lastPrinterTick = Date.now() - 1000;
			updatePrinterPoints();
			const pointsNextTick = points;

			return { pointsAfterFocus, pointsNextTick };
		});

		// 3600 seconds * 5 points/sec = 18000
		expect(result.pointsAfterFocus).toBe(18000);
		// Next tick should add only 1 additional tick (5 points), not another 3600 seconds
		expect(result.pointsNextTick).toBe(18005);
	});

	test('reconciles passive point generation during saveAllData and pagehide', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			shopUpgrades.printer = 10;
			points = 100;
			updatePointsDisplay();
			updateShopUI();

			// Fast-forward _lastPrinterTick into the past (5 seconds ago)
			_lastPrinterTick = Date.now() - 5000;

			// Trigger saveAllData explicitly
			saveAllData();
			const savedPointsFromSaveAll = parseInt(localStorage.getItem('shopPoints') || '0', 10);

			// Fast-forward _lastPrinterTick into the past again (3 seconds ago)
			_lastPrinterTick = Date.now() - 3000;

			// Trigger pagehide event
			window.dispatchEvent(new globalThis.Event('pagehide'));
			const savedPointsFromPagehide = parseInt(localStorage.getItem('shopPoints') || '0', 10);

			return { savedPointsFromSaveAll, savedPointsFromPagehide };
		});

		// 100 + (10 points/sec * 5s) = 150
		expect(result.savedPointsFromSaveAll).toBe(150);
		// 150 + (10 points/sec * 3s) = 180
		expect(result.savedPointsFromPagehide).toBe(180);
	});
});
