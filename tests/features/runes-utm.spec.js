const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Runes UTM Exchange System', () => {
	test('round-trip conversion is lossy and prevents infinite block generation at default exchange rate', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem(
				'runesData',
				JSON.stringify({ counts: { common: 100, 'mid-rare': 0, rare: 0 }, totalDropped: 100 })
			);
			localStorage.setItem('runeBlocks', '0');
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: false }));
		});
		await page.reload();

		// Convert 100 runes to blocks at default rate (1.25 blocks / rune) -> 125 blocks
		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#runeToBlockInput');
			const btn = container.querySelector('#runeToBlockBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const blocksAfterSell = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		expect(blocksAfterSell).toBe(125);

		// Buying 100 runes back should cost Math.ceil((100 * 1.25) / 0.85) = 148 blocks.
		// Since user only has 125 blocks, attempting to buy 100 runes back fails.
		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#blockToRuneInput');
			const btn = container.querySelector('#blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const runesAfterFailedBuy = await page.evaluate(() => {
			const d = JSON.parse(localStorage.getItem('runesData') || '{}');
			return d.counts?.common || 0;
		});
		expect(runesAfterFailedBuy).toBe(0);

		// Now load with 148 blocks and test purchasing 100 runes back
		await page.evaluate(() => {
			localStorage.setItem('runeBlocks', '148');
		});
		await page.reload();

		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#blockToRuneInput');
			const btn = container.querySelector('#blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const blocksRemaining = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		const runesReceived = await page.evaluate(() => {
			const d = JSON.parse(localStorage.getItem('runesData') || '{}');
			return d.counts?.common || 0;
		});

		expect(blocksRemaining).toBe(0);
		expect(runesReceived).toBe(100);
	});

	test('round-trip conversion is lossy and prevents infinite block generation with moreBlocks upgrade', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem(
				'runesData',
				JSON.stringify({ counts: { common: 100, 'mid-rare': 0, rare: 0 }, totalDropped: 100 })
			);
			localStorage.setItem('runeBlocks', '0');
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: true }));
		});
		await page.reload();

		// Convert 100 runes to blocks with moreBlocks upgrade (10 blocks / rune) -> 1,000 blocks
		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#runeToBlockInput');
			const btn = container.querySelector('#runeToBlockBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const blocksAfterSell = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		expect(blocksAfterSell).toBe(1000);

		// Buying 100 runes back should cost Math.ceil((100 * 10) / 0.85) = 1,177 blocks.
		// Since user has 1,000 blocks, attempting to buy 100 runes back fails.
		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#blockToRuneInput');
			const btn = container.querySelector('#blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const runesAfterFailedBuy = await page.evaluate(() => {
			const d = JSON.parse(localStorage.getItem('runesData') || '{}');
			return d.counts?.common || 0;
		});
		expect(runesAfterFailedBuy).toBe(0);

		// Now load with 1,177 blocks and test purchasing 100 runes back
		await page.evaluate(() => {
			localStorage.setItem('runeBlocks', '1177');
		});
		await page.reload();

		await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			if (!container) return;
			const input = container.querySelector('#blockToRuneInput');
			const btn = container.querySelector('#blockToRuneBtn');
			if (input && btn) {
				input.value = '100';
				btn.click();
			}
		});

		const blocksRemaining = await page.evaluate(() =>
			parseFloat(localStorage.getItem('runeBlocks') || '0')
		);
		const runesReceived = await page.evaluate(() => {
			const d = JSON.parse(localStorage.getItem('runesData') || '{}');
			return d.counts?.common || 0;
		});

		expect(blocksRemaining).toBe(0);
		expect(runesReceived).toBe(100);
	});
});
