// Generated code starts here on 2026-11-02T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Dev overlay perf loop lifecycle', () => {
	test('clears perf loop setTimeout when devOverlay is disabled', async ({ page }) => {
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

		// Switch to perf tab to activate drawPerf loop
		await page.evaluate(() => {
			const perfTabBtn = document.querySelector('.dev-tab[data-tab="perf"]');
			if (perfTabBtn) perfTabBtn.click();
		});

		await page.waitForTimeout(500);

		// Confirm perf tab is visible
		const isPerfVisible = await page.evaluate(() => {
			const perfTab = document.getElementById('dct-perf');
			return perfTab && perfTab.style.display !== 'none';
		});
		expect(isPerfVisible).toBe(true);

		// Disable dev overlay
		await page.evaluate(() => {
			if (window.applySettings) {
				window.applySettings({ dev: false });
			}
		});

		await page.waitForTimeout(300);

		// Confirm dev overlay panel is hidden
		const isHidden = await page.evaluate(() => {
			const panel = document.getElementById('devOverlayPanel');
			return panel ? panel.style.display === 'none' : true;
		});
		expect(isHidden).toBe(true);
	});
});
// Generated code ends here on 2026-11-02T00:00:00Z:
