/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Luck boost and potion timing reconciliation', () => {
	test('reconciles luck multiplier display on visibilitychange when boost or potions expire backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			// Activate luck boost
			startLuckBoost();

			// Fast-forward luckBoostEndTime into the past (expired 5s ago)
			luckBoostEndTime = Date.now() - 5000;

			// Trigger visibilitychange to simulate tab returning to focus
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			const text = document.getElementById('luckMultiplier')?.textContent || '';
			return {
				luckBoostActive,
				globalLuckMultiplier,
				luckText: text,
			};
		});

		expect(result.luckBoostActive).toBe(false);
		expect(result.globalLuckMultiplier).toBe(1);
		expect(result.luckText).toContain('1.0x');
	});
});
