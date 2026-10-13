// Generated code starts here on 2026-11-01T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Runes UTM conversion rate and arbitrage prevention', () => {
	test('exchangeBlocksToRunes scales cost with getExchangeRate() enforcing lossy conversion', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Unlock runes and initialize base state
		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeBlocks', '125');
			localStorage.setItem(
				'runesData',
				JSON.stringify({ counts: { common: 0 }, elementals: {}, totalDropped: 0 })
			);
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: false }));
			if (typeof window.renderRunes === 'function') window.renderRunes();
		});

		await page.reload();

		// Test 1: Base rate (1.25 blocks per rune when converting runes->blocks)
		// With 125 blocks, converting 100 runes to blocks gives 125 blocks.
		// Exchanging 100 runes back from blocks must cost Math.ceil((100 * 1.25) / 0.85) = 148 blocks.
		// Since user only has 125 blocks, attempting to exchange 100 runes should fail due to insufficient blocks.
		await page.evaluate(() => {
			const input = document.getElementById('blockToRuneInput');
			const btn = document.getElementById('blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		// Verify conversion failed due to insufficient blocks (blocks remain 125, common runes remain 0)
		const blocksText = await page.evaluate(() => localStorage.getItem('runeBlocks'));
		const runeCounts = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('runesData') || '{}')
		);

		expect(blocksText).toBe('125');
		expect(runeCounts.counts.common || 0).toBe(0);

		// Test 2: Valid lossy exchange at base rate
		// 80 runes out cost Math.ceil((80 * 1.25) / 0.85) = Math.ceil(100 / 0.85) = 118 blocks.
		await page.evaluate(() => {
			const input = document.getElementById('blockToRuneInput');
			const btn = document.getElementById('blockToRuneBtn');
			if (input && btn) {
				input.value = '80';
				btn.click();
			}
		});

		const newBlocks = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		const newRunes = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('runesData') || '{}')
		);

		expect(newBlocks).toBe(125 - 118); // 7 blocks left
		expect(newRunes.counts.common).toBe(80);

		// Test 3: Upgraded rate (moreBlocks = true -> 10 blocks per rune)
		// Set blocks to 1000 and upgrade moreBlocks
		await page.evaluate(() => {
			localStorage.setItem('runeBlocks', '1000');
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: true }));
			localStorage.setItem(
				'runesData',
				JSON.stringify({ counts: { common: 0 }, elementals: {}, totalDropped: 0 })
			);
		});

		await page.reload();

		// Exchanging 100 runes back from blocks with 10 blocks/rune rate:
		// cost = Math.ceil((100 * 10) / 0.85) = 1177 blocks.
		// Attempting 100 runes with 1000 blocks should fail.
		await page.evaluate(() => {
			const input = document.getElementById('blockToRuneInput');
			const btn = document.getElementById('blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const upgradedBlocksFail = await page.evaluate(() => localStorage.getItem('runeBlocks'));
		expect(upgradedBlocksFail).toBe('1000');

		// 85 runes out cost Math.ceil((85 * 10) / 0.85) = Math.ceil(1000) = 1000 blocks.
		await page.evaluate(() => {
			const input = document.getElementById('blockToRuneInput');
			const btn = document.getElementById('blockToRuneBtn');
			if (input && btn) {
				input.value = '85';
				btn.click();
			}
		});

		const upgradedBlocksSuccess = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		const upgradedRunesSuccess = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('runesData') || '{}')
		);

		expect(upgradedBlocksSuccess).toBe(0);
		expect(upgradedRunesSuccess.counts.common).toBe(85);
	});
});
// Generated code ends here on 2026-11-01T00:00:00Z:
