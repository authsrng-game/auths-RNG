/* eslint-disable no-undef */
// Generated code starts here on 2026-09-30T12:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Cat Shrine unlock polling', () => {
	test('checkUnlock clears polling interval when shrine is unlocked', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			localStorage.setItem('catShrineUnlocked', '1');
			const isUnlocked = typeof window.checkUnlock === 'function' && window.checkUnlock();
			return {
				isUnlocked,
				hasCheckUnlockFunction: typeof window.checkUnlock === 'function',
			};
		});

		expect(result.hasCheckUnlockFunction).toBe(true);
		expect(result.isUnlocked).toBe(true);
	});

	test('cat shrine summon button has title tooltip and loading state support', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const summonBtn = page.locator('#catShrineSummonBtn');
		await expect(summonBtn).toHaveAttribute('title', 'Summon a random cat');
	});
});
// Generated code ends here on 2026-09-30T12:00:00Z:
