const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Trust Cosmetics', () => {
	test('purchasing and equipping cosmetics updates trust and active state', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			/* global window, document */
			localStorage.setItem('mutationTrust', '50');
			const failedBuy = window.trustCosmetics.buy('frame_signal');
			localStorage.setItem('mutationTrust', '100');
			const successBuy = window.trustCosmetics.buy('frame_signal');
			window.trustCosmetics.equip('frame_signal');
			const activeEquip = localStorage.getItem('mutationTrustActive');
			const frameClass = document.getElementById('trust-frame')?.className;
			window.trustCosmetics.unequip('frame');
			return {
				failedBuy,
				successBuy,
				trust: localStorage.getItem('mutationTrust'),
				activeEquip,
				frameClass,
				unequippedClass: document.getElementById('trust-frame')?.className,
			};
		});

		expect(result.failedBuy).toBe(false);
		expect(result.successBuy).toBe(true);
		expect(result.trust).toBe('20');
		expect(JSON.parse(result.activeEquip)).toEqual({ frame: 'frame_signal' });
		expect(result.frameClass).toBe('frame_signal');
		expect(result.unequippedClass).toBe('');
	});
});
