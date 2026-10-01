const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes System Arbitrage Logic', () => {
	test('exchangeBlocksToRunes scales block cost with exchange rate when moreBlocks upgrade is active', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeBlocks', '100000');
			localStorage.setItem(
				'runeUpgrades',
				JSON.stringify({
					tripleLuck: false,
					moreBlocks: true, // exchange rate becomes 1 rune = 10 blocks
					anomalyMachine: false,
					dopamineAttack: false,
					doubleClover: false,
				})
			);
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			/* global document */
			const initialBlocks = parseFloat(localStorage.getItem('runeBlocks') || '0');
			const input = document.querySelector('#blockToRuneInput');
			const btn = document.querySelector('#blockToRuneBtn');

			if (input && btn) {
				input.value = '100';
				btn.click();
			}

			const remainingBlocks = parseFloat(localStorage.getItem('runeBlocks') || '0');
			const blockCost = initialBlocks - remainingBlocks;

			// Expected cost when 1 rune = 10 blocks: ceil((100 * 10) / 0.85) = 1177 blocks
			return { blockCost, remainingBlocks };
		});

		// Before fix: cost is ceil(100 / 0.85) = 118 blocks (allowing positive arbitrage loop: 100 runes -> 1000 blocks -> 847 runes)
		// After fix: cost is ceil((100 * 10) / 0.85) = 1177 blocks
		expect(result.blockCost).toBe(1177);
	});
});
