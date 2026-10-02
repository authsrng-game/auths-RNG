/* global window */
// Generated code starts here on 2026-10-26T12:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Custom Popup Accessibility', () => {
	test('showAlert modal has accessible dialog attributes and focuses action button', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		await page.evaluate(() => {
			window.showAlert('Test alert message', 'Test Title');
		});

		const dialog = page.locator('#customPopupOverlay [role="dialog"]');
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute('aria-modal', 'true');
		await expect(dialog).toHaveAttribute('aria-labelledby', 'customPopupTitle');
		await expect(dialog).toHaveAttribute('aria-describedby', 'customPopupDesc');

		const title = page.locator('#customPopupTitle');
		await expect(title).toHaveText('Test Title');

		const desc = page.locator('#customPopupDesc');
		await expect(desc).toHaveText('Test alert message');

		const okBtn = dialog.locator('button', { hasText: 'ok' });
		await expect(okBtn).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});

	test('showConfirm modal has accessible dialog attributes and focuses primary button', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		await page.evaluate(() => {
			window.showConfirm('Confirm this action?', 'Confirm Title');
		});

		const dialog = page.locator('#customPopupOverlay [role="dialog"]');
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute('aria-modal', 'true');
		await expect(dialog).toHaveAttribute('aria-labelledby', 'customPopupTitle');
		await expect(dialog).toHaveAttribute('aria-describedby', 'customPopupDesc');

		const okBtn = dialog.locator('button', { hasText: 'ok' });
		await expect(okBtn).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});
});
// Generated code ends here on 2026-10-26T12:00:00Z:
