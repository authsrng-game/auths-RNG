const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Generated code starts here on 2026-11-02T00:26:00Z:
test.describe('addons modal escape key dismissal', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/index.json', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'test-addon',
						name: 'Test Addon',
						author: 'tester',
						version: '1.0.0',
						entry: 'main.js',
						permissions: ['theme'],
					},
				]),
			});
		});
		await page.goto(`${BASE_URL}/assets/frontend/addons.html`);
	});

	test('detail modal closes on Escape key press', async ({ page }) => {
		const cardTop = page.locator('.card-top').first();
		await cardTop.click();

		const modalOverlay = page.locator('#modalOverlay');
		await expect(modalOverlay).toHaveClass(/show/);

		await page.keyboard.press('Escape');
		await expect(modalOverlay).not.toHaveClass(/show/);
	});

	test('permission modal closes on Escape key press', async ({ page }) => {
		const installBtn = page.locator('.card .install').first();
		await installBtn.click();

		const permOverlay = page.locator('#permOverlay');
		await expect(permOverlay).toHaveClass(/show/);

		await page.keyboard.press('Escape');
		await expect(permOverlay).not.toHaveClass(/show/);
	});
});
// Generated code ends here on 2026-11-02T00:26:00Z:
