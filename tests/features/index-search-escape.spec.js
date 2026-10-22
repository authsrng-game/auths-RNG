// Generated code starts here on 2026-10-25T12:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Index Search Escape Key and Tooltip Attributes', () => {
	test('icon-only buttons have title tooltip attributes', async ({ page }) => {
		await page.goto(BASE_URL);

		await expect(page.locator('#prevPage')).toHaveAttribute('title', 'Previous page');
		await expect(page.locator('#nextPage')).toHaveAttribute('title', 'Next page');
		await expect(page.locator('#friendsClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#messagesClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#authClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#accountInfoClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#backupKeysClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#indexClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#updatePopupClose')).toHaveAttribute('title', 'Close');
		await expect(page.locator('#accountBtn')).toHaveAttribute(
			'title',
			'Account details and login'
		);
	});

	test('Escape key clears index search query before closing index modal on second press', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Suppress consent / release overlays if present
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', 'true');
			localStorage.setItem('seenReleaseTag', 'v1.0.0');
		});

		// Open index modal
		await page.click('#indexBtn');
		const indexModal = page.locator('#indexModal');
		await expect(indexModal).toHaveClass(/show/);

		const searchInput = page.locator('#indexSearch');
		await searchInput.fill('Common');
		await expect(searchInput).toHaveValue('Common');

		// Press Escape once -> should clear search input without closing modal
		await page.keyboard.press('Escape');
		await expect(searchInput).toHaveValue('');
		await expect(indexModal).toHaveClass(/show/);

		// Press Escape a second time -> should close the index modal
		await page.keyboard.press('Escape');
		await expect(indexModal).not.toHaveClass(/show/);
	});
});
// Generated code ends here on 2026-10-25T12:00:00Z:
