/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Rune drop logic', () => {
	test('tryDropRune respects unlock state gating and categorizes rarity tiers into runesData', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

		// Test 1: When locked (runesUnlocked not set), tryDropRune returns early without writing runesData
		const lockedResult = await page.evaluate(() => {
			localStorage.removeItem('runesUnlocked');
			let count = 0;
			const mockRng = () => {
				count++;
				return count === 1 ? 0 : 0.5;
			};
			Math.random = mockRng;
			if (typeof Beacon !== 'undefined') {
				Beacon.float = mockRng;
			}

			window.tryDropRune({ chance: 1 / 1000 });
			return localStorage.getItem('runesData');
		});

		expect(lockedResult).toBeNull();

		// Test 2: Set runesUnlocked = '1' and reload page so _unlockedCache initializes as unlocked
		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
		});
		await page.reload({ waitUntil: 'domcontentloaded' });

		const unlockedResult = await page.evaluate(() => {
			let count = 0;
			const mockRng = () => {
				count++;
				return count === 1 ? 0 : 0.5;
			};
			Math.random = mockRng;
			if (typeof Beacon !== 'undefined') {
				Beacon.float = mockRng;
			}

			window.tryDropRune({ chance: 1 / 1000 });
			return JSON.parse(localStorage.getItem('runesData') || '{}');
		});

		expect(unlockedResult.counts?.rare).toBe(1);
		expect(unlockedResult.totalDropped).toBe(1);
	});
});
