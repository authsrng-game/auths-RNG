const { test, expect } = require('@playwright/test');

/* global document */

test.describe('Runes UTM Exchange', () => {
	test('round-trip conversion is lossy and scales with getExchangeRate', async ({ page }) => {
		await page.goto('http://localhost:8080/');
		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runesData', JSON.stringify({ counts: { common: 100 }, totalDropped: 100 }));
			localStorage.setItem('runeBlocks', '0');
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: true }));
		});
		await page.reload();

		// Convert 100 runes -> 1,000 blocks with moreBlocks upgrade
		await page.evaluate(() => {
			document.querySelector('#runeToBlockInput').value = '100';
			document.querySelector('#runeToBlockBtn')?.click();
		});
		expect(await page.evaluate(() => parseFloat(localStorage.getItem('runeBlocks')))).toBe(1000);

		// Buying 100 runes back costs 1,177 blocks. With 1,000 blocks, purchase fails.
		await page.evaluate(() => {
			document.querySelector('#blockToRuneInput').value = '100';
			document.querySelector('#blockToRuneBtn')?.click();
		});
		expect(await page.evaluate(() => JSON.parse(localStorage.getItem('runesData')).counts.common)).toBe(0);
	});
});
