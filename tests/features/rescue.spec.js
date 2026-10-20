/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

// Generated code starts here on 2026-04-02T12:00:00Z:
test.describe('Rescue service stall recovery & UI safety', () => {
	test('escalates rescue level and blocks localStorage writes on stall', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.reload();

		const rescueState = await page.evaluate(() => {
			if (!window.__rescueDebug) return null;
			const initialLevel = window.__rescueDebug.getLevel();
			// Simulate first stall -> level 1 (cleanup)
			window.__rescueDebug.simulateStall();
			const level1 = window.__rescueDebug.getLevel();

			// Simulate second stall -> level 2 (reset & block writes)
			window.__rescueDebug.simulateStall();
			const level2 = window.__rescueDebug.getLevel();

			// Test that localStorage setItem is blocked for window.localStorage
			localStorage.setItem('test_rescue_key', 'blocked_value');
			const testVal = localStorage.getItem('test_rescue_key');

			return {
				initialLevel,
				level1,
				level2,
				savesBlocked: !!window.__rescueSavesBlocked,
				testVal,
			};
		});

		expect(rescueState).not.toBeNull();
		expect(rescueState.initialLevel).toBe(0);
		expect(rescueState.level1).toBe(1);
		expect(rescueState.level2).toBe(2);
		expect(rescueState.savesBlocked).toBe(true);
		expect(rescueState.testVal).toBeNull();
	});

	test('displays rescue warning overlay when rescueModeReloaded session flag is present', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			sessionStorage.setItem('rescueModeReloaded', '1');
		});
		await page.reload();

		const overlay = page.locator('#rescueWarningOverlay');
		await expect(overlay).toBeVisible();
		await expect(overlay).toContainText('THE SITE FROZE AND HAD TO FORCE-RELOAD ITSELF');

		// Clicking overlay dismisses it
		await overlay.click();
		await expect(overlay).toBeHidden();
	});
});
// Generated code ends here on 2026-04-02T12:00:00Z:
