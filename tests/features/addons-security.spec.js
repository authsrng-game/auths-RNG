const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Generated code starts here on 2026-03-31T00:00:00Z:
test.describe('addons page security', () => {
	test('addon metadata with malicious HTML payload is safely sanitized', async ({ page }) => {
		await page.route('**/index.json', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'malicious-addon',
						name: 'Malicious <img src="x" onerror="window.xssExecuted=true"> Addon',
						author: 'Evil <script>window.xssExecuted=true</script> Author',
						version: '1.0.0',
						entry: 'main.js',
						permissions: ['theme'],
					},
				]),
			});
		});

		await page.goto(`${BASE_URL}/assets/frontend/addons.html`);

		const cardName = page.locator('.card-name');
		await expect(cardName).toBeVisible();

		const xssExecuted = await page.evaluate(() => globalThis.window.xssExecuted);
		expect(xssExecuted).toBeUndefined();

		const textContent = await cardName.textContent();
		expect(textContent).toContain(
			'Malicious <img src="x" onerror="window.xssExecuted=true"> Addon'
		);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
