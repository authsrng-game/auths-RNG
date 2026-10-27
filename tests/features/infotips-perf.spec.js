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

	// Generated code starts here on 2026-11-20T00:00:00Z:
	test('scanAll early returns when document.hidden is true and reconciles on visibilitychange', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const infoTip = page.locator('#anomalyCount .info-tip');
		await expect(infoTip).toBeVisible();

		// Hide container DOM element
		await page.evaluate(() => {
			const anomalyContainer = document.getElementById('anomalyCount');
			if (anomalyContainer) anomalyContainer.style.display = 'none';
		});

		// Mock document.hidden = true and call scanAll
		const scanResultWhileHidden = await page.evaluate(() => {
			let containerQueried = false;
			const anomalyContainer = document.getElementById('anomalyCount');
			if (anomalyContainer) {
				const origContains = anomalyContainer.contains.bind(anomalyContainer);
				anomalyContainer.contains = (...args) => {
					containerQueried = true;
					return origContains(...args);
				};
			}

			Object.defineProperty(document, 'hidden', { value: true, configurable: true });
			if (window.scanAll) window.scanAll();

			return containerQueried;
		});

		// Verify scanAll early returned and did not query/process container while hidden
		expect(scanResultWhileHidden).toBe(false);

		// Restore document.hidden = false and dispatch visibilitychange
		await page.evaluate(() => {
			Object.defineProperty(document, 'hidden', { value: false, configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		});

		// Verify that scanAll ran on visibilitychange and updated infoTip display to 'none' because container is hidden
		await expect(infoTip).toHaveCSS('display', 'none');

		// Unhide container and dispatch visibilitychange
		await page.evaluate(() => {
			const anomalyContainer = document.getElementById('anomalyCount');
			if (anomalyContainer) anomalyContainer.style.display = 'block';
			document.dispatchEvent(new Event('visibilitychange'));
		});

		// Verify infoTip is reconciled and visible
		await expect(infoTip).toBeVisible();
	});
	// Generated code ends here on 2026-11-20T00:00:00Z:
});
// Generated code ends here on 2026-10-27T00:00:00Z:
