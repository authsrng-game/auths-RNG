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

	test('context menu window.open calls use noopener,noreferrer', async ({ page }) => {
		await page.goto(BASE_URL);
		const windowOpenCalls = [];
		await page.exposeFunction('trackWindowOpen', (url, target, features) => {
			windowOpenCalls.push({ url, target, features });
		});
		await page.evaluate(() => {
			globalThis.window.open = function (url, target, features) {
				globalThis.window.trackWindowOpen(url, target, features);
				return null;
			};
		});

		await page.locator('body').dispatchEvent('contextmenu', { clientX: 100, clientY: 100 });
		const githubBtn = page.locator('._ctx-item', { hasText: 'open github' });
		await expect(githubBtn).toBeVisible();
		await githubBtn.click();

		await expect.poll(() => windowOpenCalls.length).toBeGreaterThan(0);
		expect(windowOpenCalls[0].features).toBe('noopener,noreferrer');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
