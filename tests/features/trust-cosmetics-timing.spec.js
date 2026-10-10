/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Trust Cosmetics timing reconciliation', () => {
	test('reconciles auto-mutations on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('mutationTrustOwned', JSON.stringify(['upgrade_automutate']));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			// Fast-forward _lastAutoMutateTick into the past (e.g. 60 seconds ago = 3 ticks)
			window._lastAutoMutateTick = Date.now() - 60000;

			// Trigger visibilitychange to visible
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return window._lastAutoMutateTick;
		});

		// _lastAutoMutateTick should have updated to around present time
		expect(result).toBeGreaterThan(Date.now() - 10000);
	});
});
