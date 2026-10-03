// Generated code starts here on 2026-10-26T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window */

const BASE_URL = 'http://localhost:8080/';

test.describe('Expeditions System Caching & Launching', () => {
	test('reloadExpeditionsCache refreshes state and startExpedition updates active progress', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Unlock expeditions, set initial state, unlock dot, and navigate to page-4 (index 3)
		await page.evaluate(() => {
			localStorage.setItem('expeditionsUnlocked', '1');
			localStorage.setItem('expeditionData', JSON.stringify({ active: null, cooldownUntil: 0 }));
			if (window.unlockPageDot) window.unlockPageDot(3);
			if (window.goToPage) window.goToPage(3);
			if (window.reloadExpeditionsCache) window.reloadExpeditionsCache();
			if (window.renderExpeditions) window.renderExpeditions();
		});

		const container = page.locator('#expeditionsContainer');
		await expect(container).toBeVisible();

		// Launch short expedition and check active progress display
		await page.evaluate(() => {
			window.startExpedition('short', false);
		});

		const activeTitle = page.locator('.expedition-active-title');
		await expect(activeTitle).toContainText('short expedition in progress');

		// Mutate localStorage directly and verify reloadExpeditionsCache invalidates cache
		await page.evaluate(() => {
			const data = JSON.parse(localStorage.getItem('expeditionData'));
			data.active = null;
			data.cooldownUntil = Date.now() + 60000;
			localStorage.setItem('expeditionData', JSON.stringify(data));
			window.reloadExpeditionsCache();
			window.renderExpeditions();
		});

		const cooldownBox = page.locator('.expedition-cooldown-box');
		await expect(cooldownBox).toContainText('expeditions recovering');
	});
});
// Generated code ends here on 2026-10-26T00:00:00Z:
