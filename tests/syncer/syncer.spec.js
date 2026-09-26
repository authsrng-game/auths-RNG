const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Syncer state consistency tests', () => {
	// Generated code starts here on 2026-10-24T00:00:00Z:
	test('infoTipsRead is removed on resetInventory', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.setItem('infoTipsRead', JSON.stringify(['anomalies', 'mutations']));
		});
		await page.evaluate(async () => {
			globalThis.showConfirm = () => Promise.resolve(true);
			globalThis.showAlert = () => Promise.resolve();
			globalThis.location.reload = () => {};
			const resetBtn = globalThis.document.getElementById('resetBtn');
			if (resetBtn) resetBtn.click();
		});
		await page.waitForTimeout(500);
		const val = await page.evaluate(() => {
			return globalThis.localStorage.getItem('infoTipsRead');
		});
		expect(val).toBeNull();
	});
	// Generated code ends here on 2026-10-24T00:00:00Z:

	// Generated code starts here on 2026-03-31T20:00:00Z:
	test('starmap star trail cosmetic migrates from starmapData shopPurchases', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.removeItem('cosmeticUnlock_star_trail');
			globalThis.localStorage.setItem('starmapUnlocked', '1');
			globalThis.localStorage.setItem(
				'starmapData',
				JSON.stringify({
					shopPurchases: { star_trail: 1 },
				})
			);
		});
		await page.reload();
		await page.waitForTimeout(500);
		const val = await page.evaluate(() => {
			return globalThis.localStorage.getItem('cosmeticUnlock_star_trail');
		});
		expect(val).toBe('1');
	});
	// Generated code ends here on 2026-03-31T20:00:00Z:
});
