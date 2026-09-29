// Generated code starts here on 2026-11-01T12:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Dev overlay FPS loop lifecycle', () => {
	test('cancels fpsLoop requestAnimationFrame when devOverlay is disabled', async ({ page }) => {
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

		await page.waitForTimeout(500);

		// Disable dev overlay
		await page.evaluate(() => {
			if (window.applySettings) {
				window.applySettings({ dev: false });
			}
		});

		// Clear _devFPS
		await page.evaluate(() => {
			window._devFPS = 0;
		});

		// Wait 1.5s - if fpsLoop was still running, it would calculate window._devFPS and update it
		await page.waitForTimeout(1500);

		const fps2 = await page.evaluate(() => window._devFPS);
		expect(fps2).toBe(0);
	});
});
// Generated code ends here on 2026-11-01T12:00:00Z:
