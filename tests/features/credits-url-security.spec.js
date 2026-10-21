// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('credits page URL security', () => {
	test('sanitizes javascript: and non-http/https URL schemes in contributor profiles', async ({
		page,
	}) => {
		await page.route(
			'https://api.github.com/repos/authsrng-game/auths-RNG/contributors?per_page=100',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([
						{
							login: 'maliciousUser',
							html_url: 'javascript:alert(1)',
							avatar_url: 'data:text/html,<script>alert(1)</script>',
							contributions: 1,
						},
					]),
				});
			}
		);

		await page.goto(`${BASE_URL}/assets/frontend/credits.html`);

		const contribLink = page.locator('.contributor');
		await expect(contribLink).toBeVisible();

		// Ensure javascript: is not set on the href attribute
		const href = await contribLink.getAttribute('href');
		expect(href).toBeNull();

		// Ensure data: URI is sanitized on the avatar img src
		const img = contribLink.locator('img');
		const src = await img.getAttribute('src');
		expect(src).toBe('');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
