// Generated code starts here on 2026-10-27T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global document, window */

const BASE_URL = 'http://localhost:8080/';

test.describe('Infotips System Performance & Style Guarding', () => {
	test('tryPlace guards style.display assignment and updates correctly when container visibility toggles', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const anomalyEl = page.locator('#anomalyCount');
		await expect(anomalyEl).toBeVisible();

		const infoTip = page.locator('#anomalyCount .info-tip');
		await expect(infoTip).toBeVisible();

		// Verify inline display is initially empty string (visible)
		const initialDisplay = await infoTip.evaluate((el) => el.style.display);
		expect(initialDisplay).toBe('');

		// Track mutations or style setter calls when hiding and showing container
		await page.evaluate(() => {
			const anomalyContainer = document.getElementById('anomalyCount');
			if (anomalyContainer) {
				anomalyContainer.style.display = 'none';
			}
		});

		// Trigger page dot navigation / scan to re-evaluate placement
		await page.evaluate(() => {
			if (window.scanAll) window.scanAll();
		});

		// Verify element display becomes 'none' when container is hidden
		await expect(infoTip).toHaveCSS('display', 'none');

		// Unhide container
		await page.evaluate(() => {
			const anomalyContainer = document.getElementById('anomalyCount');
			if (anomalyContainer) {
				anomalyContainer.style.display = 'block';
			}
		});

		await expect(infoTip).toBeVisible();
	});
});
// Generated code ends here on 2026-10-27T00:00:00Z:
