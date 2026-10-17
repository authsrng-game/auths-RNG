/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

// Generated code starts here on 2026-11-04T00:00:00Z:
test.describe('Daily and weekly reward timing reconciliation', () => {
	test('reconciles daily reward UI on visibilitychange when a new day arrives', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			// Set daily reward as claimed yesterday
			localStorage.setItem('daily_lastClaim', '2020-01-01');
			localStorage.setItem('daily_streak', '3');
		});
		await page.reload();

		const statusText = await page.evaluate(() => {
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			const btn = document.getElementById('dailyBtn');
			const status = document.getElementById('dailyStatus');
			return {
				disabled: btn ? btn.disabled : true,
				text: status ? status.textContent : '',
			};
		});

		expect(statusText.disabled).toBe(false);
		expect(statusText.text).toContain('daily available');
	});

	test('reconciles weekly reward UI on visibilitychange when a week has elapsed', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			// Set weekly reward as claimed 8 days ago
			const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
			localStorage.setItem('weekly_lastClaim', eightDaysAgo.toString());
			localStorage.setItem('weekly_streak', '2');
		});
		await page.reload();

		const statusText = await page.evaluate(() => {
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			const btn = document.getElementById('weeklyBtn');
			const status = document.getElementById('weeklyStatus');
			return {
				disabled: btn ? btn.disabled : true,
				text: status ? status.textContent : '',
			};
		});

		expect(statusText.disabled).toBe(false);
		expect(statusText.text).toContain('weekly reward available');
	});
});
// Generated code ends here on 2026-11-04T00:00:00Z:
