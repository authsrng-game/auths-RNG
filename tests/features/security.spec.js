// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Security tests', () => {
	test('legal consent popup link has rel="noopener noreferrer"', async ({ page }) => {
		await page.goto(BASE_URL);
		const consentLink = page.locator('#legalConsentInner a[target="_blank"]');
		await expect(consentLink).toBeVisible();
		await expect(consentLink).toHaveAttribute('rel', 'noopener noreferrer');
	});

	test('credits page contributor links have rel="noopener noreferrer" and sanitize input', async ({
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
							login: '<script>alert(1)</script>hacker',
							html_url: 'https://github.com/hacker',
							avatar_url: 'https://github.com/avatar.png',
							contributions: 42,
						},
					]),
				});
			}
		);

		await page.goto(`${BASE_URL}/assets/frontend/credits.html`);
		const contribLink = page.locator('.contributor');
		await expect(contribLink).toBeVisible();
		await expect(contribLink).toHaveAttribute('rel', 'noopener noreferrer');
		await expect(contribLink.locator('.name')).toHaveText('<script>alert(1)</script>hacker');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
