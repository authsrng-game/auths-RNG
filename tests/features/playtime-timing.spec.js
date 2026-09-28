/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Playtime timing reconciliation', () => {
	test('reconciles total playtime and display on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			// Fast-forward sessionStart by simulating 15 seconds elapsed while in background
			window.getCurrentTotalSeconds(); // initial baseline
			// Accessing internal sessionStart indirectly by altering Date.now or sessionStart if accessible
			// In main.js, sessionStart was set at load. We can simulate time passage by fast-forwarding Date.now
			// Or we can invoke flushPlaytime after adjusting time.
			// Let's test visibilitychange directly:
			const initialDisplay = document.getElementById('playtimeDisplay')?.textContent;

			// Re-define Date.now temporarily or dispatch visibilitychange after sessionStart offset
			const originalNow = Date.now;
			Date.now = () => originalNow() + 15000;

			// Dispatch visibilitychange event
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			const updatedDisplay = document.getElementById('playtimeDisplay')?.textContent;
			const totalSecs = window.getCurrentTotalSeconds();

			Date.now = originalNow; // restore

			return { initialDisplay, updatedDisplay, totalSecs };
		});

		expect(result.updatedDisplay).toContain('15s');
		expect(result.totalSecs).toBeGreaterThanOrEqual(15);
	});
});
