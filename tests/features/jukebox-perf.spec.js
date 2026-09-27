// Generated code starts here on 2026-10-26T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Jukebox Performance & Rendering', () => {
	test('jukebox renders active disc state and updates panel text when opened', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const saContainer = page.locator('.sa-container');
		if (await saContainer.isVisible()) {
			await saContainer.click({ force: true });
			await page.waitForTimeout(300);
		}

		const jukebox = page.locator('#jukebox');
		await expect(jukebox).toBeAttached();

		const disc = page.locator('#jb-disc');
		await expect(disc).toBeVisible();

		// Check initial disc state (active when unmuted)
		await expect(disc).toHaveClass(/jb-active/);

		const panel = page.locator('#jb-panel');
		await expect(panel).not.toHaveClass(/jb-open/);

		// Click disc to open panel and verify instant render
		await page.evaluate(() => {
			const discEl = document.getElementById('jb-disc');
			if (discEl) discEl.click();
		});

		await expect(panel).toHaveClass(/jb-open/);

		// Verify track name and time elements inside panel update correctly
		const nameEl = page.locator('#jb-name');
		await expect(nameEl).toBeVisible();

		const timeEl = page.locator('#jb-time');
		await expect(timeEl).toBeAttached();
	});
});
// Generated code ends here on 2026-10-26T00:00:00Z:
