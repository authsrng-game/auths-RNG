// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

test.describe('Runes Universal Transaction Machine (UTM) exchange logic', () => {
	test('converts runes to blocks and blocks to runes with exchange rates and limits', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			if (!localStorage.getItem('runesInitialized')) {
				localStorage.setItem('seenLegalConsent', '1');
				localStorage.setItem('seenReleaseTag', 'v9.7');
				localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
				localStorage.setItem('runesUnlocked', '1');
				localStorage.setItem(
					'runesData',
					JSON.stringify({ counts: { common: 10 }, elementals: {}, totalDropped: 10 })
				);
				localStorage.setItem('runeBlocks', '0');
				localStorage.setItem('runeUpgrades', JSON.stringify({}));
				localStorage.setItem('runesInitialized', '1');
			}
		});
		await page.goto('http://localhost:8080/');

		// 1. Exchange 4 runes -> 5 blocks (1.25x base rate)
		await page.fill('#runeToBlockInput', '4');
		await page.click('#runeToBlockBtn');
		expect(await page.evaluate(() => localStorage.getItem('runeBlocks'))).toBe('5');

		// 2. Reject unaffordable block exchange (5 runes out costs 6 blocks, only 5 available)
		await page.fill('#blockToRuneInput', '5');
		await page.click('#blockToRuneBtn');
		expect(await page.evaluate(() => localStorage.getItem('runeBlocks'))).toBe('5');

		// 3. Exchange 3 blocks -> 2 runes (lossy 0.85 rate)
		await page.fill('#blockToRuneInput', '2');
		await page.click('#blockToRuneBtn');
		expect(await page.evaluate(() => localStorage.getItem('runeBlocks'))).toBe('2');

		// 4. Upgraded rate (10x with moreBlocks upgrade)
		await page.evaluate(() =>
			localStorage.setItem('runeUpgrades', JSON.stringify({ moreBlocks: true }))
		);
		await page.reload();
		await page.fill('#runeToBlockInput', '3');
		await page.click('#runeToBlockBtn');
		expect(await page.evaluate(() => localStorage.getItem('runeBlocks'))).toBe('32');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
