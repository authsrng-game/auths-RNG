// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Trust Cosmetics System', () => {
	test('purchasing and equipping trust cosmetics validates trust balance and updates active cosmetics', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Test buy validation with insufficient vs sufficient trust
		expect(
			await page.evaluate(() => {
				localStorage.setItem('mutationTrust', '50');
				return window.trustCosmetics.buy('frame_signal');
			})
		).toBe(false);

		expect(
			await page.evaluate(() => {
				localStorage.setItem('mutationTrust', '100');
				return window.trustCosmetics.buy('frame_signal');
			})
		).toBe(true);

		expect(await page.evaluate(() => localStorage.getItem('mutationTrust'))).toBe('20');
		expect(await page.evaluate(() => window.trustCosmetics.buy('frame_signal'))).toBe(false);

		// Test equipping unowned vs owned items and DOM reflection
		await page.evaluate(() => window.trustCosmetics.equip('frame_neon'));
		expect(
			await page.evaluate(
				() => JSON.parse(localStorage.getItem('mutationTrustActive') || '{}').frame
			)
		).toBeUndefined();

		await page.evaluate(() => window.trustCosmetics.equip('frame_signal'));
		expect(
			await page.evaluate(
				() => JSON.parse(localStorage.getItem('mutationTrustActive') || '{}').frame
			)
		).toBe('frame_signal');
		expect(await page.evaluate(() => document.getElementById('trust-frame')?.className)).toBe(
			'frame_signal'
		);

		// Test unequipping
		await page.evaluate(() => window.trustCosmetics.unequip('frame'));
		expect(
			await page.evaluate(
				() => JSON.parse(localStorage.getItem('mutationTrustActive') || '{}').frame
			)
		).toBeUndefined();
		expect(await page.evaluate(() => document.getElementById('trust-frame')?.className)).toBe('');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
