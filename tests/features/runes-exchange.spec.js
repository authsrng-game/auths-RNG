/* eslint-disable no-undef */
// Generated code starts here on 2026-10-27T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes block to rune exchange rate calculation', () => {
	test('exchangeBlocksToRunes scales block cost dynamically with getExchangeRate()', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			// Set initial blocks and moreBlocks upgrade = true
			localStorage.setItem('runeBlocks', '100');
			localStorage.setItem(
				'runeUpgrades',
				JSON.stringify({
					moreBlocks: true,
				})
			);
		});

		await page.goto(BASE_URL);

		// With moreBlocks = true, getExchangeRate() is 10.
		// Exchanging 1 rune out should cost Math.ceil((1 * 10) / 0.85) = 12 blocks,
		// rather than Math.ceil(1 / 0.85) = 2 blocks.
		const remainingBlocks = await page.evaluate(() => {
			const input = document.querySelector('#blockToRuneInput');
			const btn = document.querySelector('#blockToRuneBtn');
			if (!input || !btn) return null;

			input.value = '1';
			btn.click();

			return parseFloat(localStorage.getItem('runeBlocks') || '0');
		});

		// Starting from 100 blocks, subtracting 12 blocks leaves 88 blocks.
		// (With the bug, cost was 2 blocks, leaving 98 blocks).
		expect(remainingBlocks).toBe(88);
	});
});
// Generated code ends here on 2026-10-27T00:00:00Z:
