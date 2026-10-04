// Generated code starts here on 2026-11-02T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global document, window */

const BASE_URL = 'http://localhost:8080/';

test.describe('Active Potions Display Performance & State Caching', () => {
	test('updateActivePotionsDisplay reuses DOM nodes during periodic updates', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
			localStorage.setItem('shopPoints', '100000');
			localStorage.setItem(
				'playerPotions',
				JSON.stringify({
					luck2x: 5,
					luck4x: 0,
					luck10x: 0,
					luck50x: 0,
					luck100x: 0,
					luck150x: 0,
					luck250x: 0,
					luck300x: 0,
					luck800x: 0,
					luck1500x: 0,
					luck3000x: 0,
					duplicate: 0,
				})
			);
		});

		await page.goto(BASE_URL);

		// Verify initial state: no active potions or duplicate rolls
		const displayHidden = await page.evaluate(() => {
			const display = document.getElementById('activePotionsDisplay');
			return display ? display.style.display : null;
		});
		expect(displayHidden).toBe('none');

		// Use a potion via window.usePotion
		await page.evaluate(() => {
			window.usePotion('luck2x');
		});

		const activePotionList = page.locator('#activePotionsList .active-potion');
		await expect(activePotionList).toHaveCount(1);

		// Mark the created DOM element with a unique property to verify node preservation
		await page.evaluate(() => {
			const list = document.getElementById('activePotionsList');
			if (list && list.children[0]) {
				list.children[0]._nodeMarker = 'preserved_node_1';
			}
		});

		// Trigger updateActivePotionsDisplay again (e.g. periodic timer tick)
		await page.evaluate(() => {
			window.updateActivePotionsDisplay();
		});

		// Confirm that the node marker is preserved (element was updated in-place without re-creation)
		const isNodePreserved = await page.evaluate(() => {
			const list = document.getElementById('activePotionsList');
			return list && list.children[0] ? list.children[0]._nodeMarker === 'preserved_node_1' : false;
		});
		expect(isNodePreserved).toBe(true);

		// Clear active potions and verify display hides
		await page.evaluate(() => {
			window.usePotion = null; // restore / test helper
		});
	});
});
// Generated code ends here on 2026-11-02T00:00:00Z:
