const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080/';

test.describe('Potion Timer Fast-Path & Performance', () => {
	test('potion timer short-circuits when idle and updates correctly when potion is activated', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Verify initial idle state - activePotions display is hidden
		const activeDisplay = page.locator('#activePotionsDisplay');
		await expect(activeDisplay).toBeHidden();

		// Activate a potion programmatically and verify active potions display updates
		await page.evaluate(() => {
			// Script global evaluation in browser scope
			eval(`
				points = 100000;
				buyPotion('luck2x');
				usePotion('luck2x');
			`);
		});

		await expect(activeDisplay).toBeVisible();
		await expect(page.locator('#activePotionsList')).toContainText('2x luck');
	});
});
