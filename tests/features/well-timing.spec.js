/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Wishing Well timing reconciliation', () => {
	test('resumes well timer on visibilitychange when well is on cooldown', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			// Set well on cooldown
			localStorage.setItem(
				'wishingWell',
				JSON.stringify({
					lastThrow: Date.now(),
					totalThrown: 100,
					totalReceived: 0,
					timesThrown: 1,
					successes: 0,
				})
			);
		});
		await page.reload();

		const result = await page.evaluate(() => {
			// Simulate tab visibility change
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			const timer = document.getElementById('wellTimer');
			return timer ? timer.textContent : '';
		});

		expect(result).toContain('available in:');
	});
});
