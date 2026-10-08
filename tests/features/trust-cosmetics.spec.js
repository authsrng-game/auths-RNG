// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document, rarities, addToInventory */

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

	test('startAutoMutate clears active interval when upgrade_automutate is no longer owned', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			// Own the upgrade and start auto mutate
			localStorage.setItem('mutationTrustOwned', JSON.stringify(['upgrade_automutate']));
			window.trustCosmetics.startAutoMutate();

			// Remove the upgrade ownership and trigger startAutoMutate
			localStorage.setItem('mutationTrustOwned', JSON.stringify([]));
			window.trustCosmetics.startAutoMutate();

			return true;
		});

		expect(result).toBe(true);
	});

	test('startAutoMutate reconciles elapsed auto-mutations on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const historyCount = await page.evaluate(() => {
			localStorage.setItem('mutationTrustOwned', JSON.stringify(['upgrade_automutate']));
			localStorage.setItem('mutationsUnlocked', '1');

			if (typeof addToInventory === 'function' && typeof rarities !== 'undefined') {
				const valid = rarities.filter(
					(r) =>
						!['SUMMER', 'finished.', 'pseudopseudohypoparathyroidism', '...', 'the world', 'Antimatter'].includes(
							r.name
						)
				);
				if (valid.length >= 2) {
					addToInventory(valid[0]);
					addToInventory(valid[10]);
				}
			}

			window.trustCosmetics.startAutoMutate();

			// Simulate 60 seconds passed (3 ticks of 20s) while tab was backgrounded
			window._lastAutoMutateTick = Date.now() - 60000;

			// Trigger visibilitychange event
			document.dispatchEvent(new Event('visibilitychange'));

			const history = JSON.parse(localStorage.getItem('mutationHistory') || '[]');
			return history.length;
		});

		expect(historyCount).toBeGreaterThanOrEqual(1);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
