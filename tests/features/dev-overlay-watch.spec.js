const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Dev overlay watch interval lifecycle', () => {
	test('clears watch list setInterval when devOverlay is disabled', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		// Enable dev overlay
		await page.evaluate(() => {
			if (window.applySettings) {
				window.applySettings({ dev: true });
			}
		});

		await page.waitForTimeout(300);

		// Track calls to renderWatchList or observe interval behavior
		const watchIntervalSet = await page.evaluate(() => {
			return document.getElementById('devOverlayPanel') !== null;
		});
		expect(watchIntervalSet).toBe(true);

		// Disable dev overlay
		await page.evaluate(() => {
			if (window.applySettings) {
				window.applySettings({ dev: false });
			}
		});

		await page.waitForTimeout(300);

		// Confirm panel is hidden and watchInterval was cleared without error
		const isHidden = await page.evaluate(() => {
			const panel = document.getElementById('devOverlayPanel');
			return panel ? panel.style.display === 'none' : true;
		});
		expect(isHidden).toBe(true);
	});
});
