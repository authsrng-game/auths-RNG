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
});
// Generated code ends here on 2026-03-31T00:00:00Z:
