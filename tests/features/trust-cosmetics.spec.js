// Generated code starts here on 2026-03-31T21:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('trust cosmetics system', () => {
	test('buy, equip, and unequip cosmetics manage trust balance and active state', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('mutationTrust', '100');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			/* global window */
			const tc = window.trustCosmetics;
			const failBuy = tc.buy('frame_void'); // costs 650, balance 100 -> false
			const successBuy = tc.buy('frame_signal'); // costs 80, balance 100 -> true
			const dupBuy = tc.buy('frame_signal'); // already owned -> false

			tc.equip('frame_signal');
			const activeAfterEquip = localStorage.getItem('mutationTrustActive');

			tc.unequip('frame');
			const activeAfterUnequip = localStorage.getItem('mutationTrustActive');

			return {
				failBuy,
				successBuy,
				dupBuy,
				remainingTrust: localStorage.getItem('mutationTrust'),
				owned: localStorage.getItem('mutationTrustOwned'),
				activeAfterEquip,
				activeAfterUnequip,
			};
		});

		expect(result.failBuy).toBe(false);
		expect(result.successBuy).toBe(true);
		expect(result.dupBuy).toBe(false);
		expect(result.remainingTrust).toBe('20');
		expect(JSON.parse(result.owned)).toContain('frame_signal');
		expect(JSON.parse(result.activeAfterEquip)).toEqual({ frame: 'frame_signal' });
		expect(JSON.parse(result.activeAfterUnequip)).toEqual({});
	});
});
// Generated code ends here on 2026-03-31T21:00:00Z:
