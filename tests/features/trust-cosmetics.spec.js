// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('trust cosmetics system', () => {
	test('handles purchase, equipment, and balance validation', async ({ page }) => {
		await page.goto(BASE_URL);

		await page.evaluate(() => {
			localStorage.setItem('mutationTrust', '100');
			localStorage.removeItem('mutationTrustOwned');
			localStorage.removeItem('mutationTrustActive');
		});
		await page.reload();

		// Refuse purchase if unaffordable
		expect(await page.evaluate(() => window.trustCosmetics.buy('frame_neon'))).toBe(false);

		// Succeed purchase when affordable and update balance
		expect(await page.evaluate(() => window.trustCosmetics.buy('frame_signal'))).toBe(true);
		expect(await page.evaluate(() => localStorage.getItem('mutationTrust'))).toBe('20');

		// Refuse duplicate purchase
		expect(await page.evaluate(() => window.trustCosmetics.buy('frame_signal'))).toBe(false);

		// Equip item and verify localStorage and DOM frame update
		await page.evaluate(() => window.trustCosmetics.equip('frame_signal'));
		const active = await page.evaluate(() => ({
			cat: JSON.parse(localStorage.getItem('mutationTrustActive') || '{}').frame,
			cls: document.getElementById('trust-frame')?.className || '',
		}));
		expect(active.cat).toBe('frame_signal');
		expect(active.cls).toBe('frame_signal');

		// Unequip item and verify localStorage clearing and DOM reset
		await page.evaluate(() => window.trustCosmetics.unequip('frame'));
		const unequipped = await page.evaluate(() => ({
			cat: JSON.parse(localStorage.getItem('mutationTrustActive') || '{}').frame,
			cls: document.getElementById('trust-frame')?.className || '',
		}));
		expect(unequipped.cat).toBeUndefined();
		expect(unequipped.cls).toBe('');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
