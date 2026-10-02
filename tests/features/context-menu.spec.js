/* eslint-disable no-undef */
// Generated code starts here on 2026-06-18T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Context menu FAQ link', () => {
	test('open faq menu item triggers window.open with correct FAQ path', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const openedUrl = await page.evaluate(async () => {
			let urlOpened = null;
			window.open = (url) => {
				urlOpened = url;
			};

			const event = new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: 100,
			});
			document.body.dispatchEvent(event);

			const items = Array.from(document.querySelectorAll('._ctx-item'));
			const faqItem = items.find((item) => item.textContent.includes('open faq'));
			if (faqItem) {
				faqItem.click();
			}
			return urlOpened;
		});

		expect(openedUrl).toBe('/assets/frontend/FAQ.html');
	});
});
// Generated code ends here on 2026-06-18T00:00:00Z:
