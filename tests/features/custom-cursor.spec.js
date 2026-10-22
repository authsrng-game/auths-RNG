const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Custom cursor click flash', () => {
	test('does not throw when the .plus element is missing', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});

		// Serve index.html without the cursor's .plus child (regression for JAVASCRIPT-E)
		await page.route(
			(url) => url.pathname === '/' || url.pathname === '/index.html',
			async (route) => {
				const response = await route.fetch();
				const html = (await response.text()).replace('<div class="plus"></div>', '');
				await route.fulfill({ response, body: html });
			}
		);

		const errors = [];
		page.on('pageerror', (err) => errors.push(err.message));

		await page.goto(BASE_URL);
		expect(await page.locator('#custom-cursor .plus').count()).toBe(0);

		await page.mouse.move(200, 200);
		await page.mouse.down();
		await page.mouse.up();
		await page.mouse.down();
		await page.mouse.up();
		await page.waitForTimeout(400);

		const styleErrors = errors.filter((m) => m.includes("reading 'style'"));
		expect(styleErrors).toHaveLength(0);
	});
});
