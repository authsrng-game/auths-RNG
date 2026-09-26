const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Generated code starts here on 2026-03-31T00:00:00Z:
test.describe('profile page security', () => {
	test('bannerImageUrl with malicious payload is safely sanitized', async ({ page }) => {
		// Intercept the API call to return a profile payload containing a CSS injection payload
		await page.route('**/api/accounts/profile/*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					username: 'testuser',
					createdAt: Date.now(),
					bannerImageUrl: "'); background-image: url('https://evil.com/xss.png",
				}),
			});
		});

		await page.goto(`${BASE_URL}/assets/frontend/profile.html?user=testuser`);

		const banner = page.locator('.profile-banner');
		await expect(banner).toBeVisible();

		const inlineStyle = await banner.getAttribute('style');
		// Ensure that the malicious quotes/parentheses do not create raw CSS injections or unescaped url payload
		expect(inlineStyle).not.toContain("https://evil.com/xss.png");
		expect(inlineStyle).toContain("background:#131313;");
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
