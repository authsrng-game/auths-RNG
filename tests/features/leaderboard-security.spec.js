const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('leaderboard mode toggle rate limiting', () => {
	test('rapid mode toggle clicks are rate-limited to prevent API spam', async ({ page }) => {
		let globalFetchCount = 0;
		let friendsFetchCount = 0;

		await page.route('**/*', async (route) => {
			const url = route.request().url();
			if (url.includes('/api/leaderboard')) {
				if (url.includes('/friends')) {
					friendsFetchCount++;
				} else {
					globalFetchCount++;
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ entries: [], cachedAt: Date.now() }),
				});
			} else {
				await route.continue();
			}
		});

		// Set auth token so friends mode toggle is permitted
		await page.addInitScript(() => {
			localStorage.setItem('authToken', 'test-token');
		});

		await page.goto(`${BASE_URL}/assets/frontend/leaderboard.html`);

		// Initial load fetches global leaderboard once
		await expect.poll(() => globalFetchCount).toBe(1);

		const globalBtn = page.locator('#lbModeGlobal');
		const friendsBtn = page.locator('#lbModeFriends');

		// Click friends toggle button once
		await friendsBtn.click();
		await expect.poll(() => friendsFetchCount).toBe(1);

		// Immediately click global toggle button (within cooldown period of 1000ms)
		await globalBtn.click();

		// Give a brief pause to confirm no extra fetch request occurred due to cooldown
		await page.waitForTimeout(300);

		// globalFetchCount should still be 1 (the immediate second toggle was blocked by cooldown)
		expect(globalFetchCount).toBe(1);

		// Wait for cooldown to expire
		await page.waitForTimeout(800);

		// Click global toggle button again
		await globalBtn.click();
		await expect.poll(() => globalFetchCount).toBe(2);
	});
});
