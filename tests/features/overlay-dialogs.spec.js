// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('overlay dialog accessibility', () => {
	test('modal overlays have proper ARIA dialog roles and labels', async ({ page }) => {
		await page.goto(BASE_URL);

		await expect(page.locator('#updatePopup')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#updatePopup')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#updatePopup')).toHaveAttribute('aria-labelledby', 'updatePopupTag');

		await expect(page.locator('#friendsOverlay')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#friendsOverlay')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#friendsOverlay')).toHaveAttribute('aria-label', 'Friends');

		await expect(page.locator('#messagesOverlay')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#messagesOverlay')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#messagesOverlay')).toHaveAttribute('aria-label', 'Messages');

		await expect(page.locator('#authOverlay')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#authOverlay')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#authOverlay')).toHaveAttribute(
			'aria-label',
			'Account authentication'
		);

		await expect(page.locator('#accountInfoOverlay')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#accountInfoOverlay')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#accountInfoOverlay')).toHaveAttribute(
			'aria-label',
			'Account details'
		);

		await expect(page.locator('#backupKeysOverlay')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#backupKeysOverlay')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#backupKeysOverlay')).toHaveAttribute('aria-label', 'Backup keys');

		await expect(page.locator('#migrationPopup')).toHaveAttribute('role', 'dialog');
		await expect(page.locator('#migrationPopup')).toHaveAttribute('aria-modal', 'true');
		await expect(page.locator('#migrationPopup')).toHaveAttribute(
			'aria-label',
			'Account migration info'
		);

		await expect(page.locator('#syncLoadingOverlay')).toHaveAttribute('role', 'status');
		await expect(page.locator('#syncLoadingOverlay')).toHaveAttribute('aria-label', 'Syncing data');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
