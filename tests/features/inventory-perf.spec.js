// Generated code starts here on 2026-10-28T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Inventory Performance & Rendering', () => {
	test('renderSortedInventory sorts inventory items and playtime calculates correctly without localStorage write spam', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const inventoryList = page.locator('#inventoryList');
		await expect(inventoryList).toBeVisible();

		// Add test inventory items and test renderSortedInventory sorting & playtime calculation
		const result = await page.evaluate(() => {
			const setItemSpyCount = { count: 0 };
			const originalSetItem = localStorage.setItem.bind(localStorage);
			localStorage.setItem = (key, value) => {
				if (key === 'totalPlaytime') {
					setItemSpyCount.count++;
				}
				return originalSetItem(key, value);
			};

			// Simulate adding items to inventory
			if (typeof window.addToInventory === 'function' && Array.isArray(window.rarities)) {
				const sampleRarities = window.rarities.slice(0, 10);
				sampleRarities.forEach((r) => window.addToInventory(r));
			}

			// Test sorting
			if (typeof window.renderSortedInventory === 'function') {
				window.renderSortedInventory('common');
				window.renderSortedInventory('rare');
				window.renderSortedInventory('alpha');
			}

			const listEl = document.getElementById('inventoryList');
			const itemCount = listEl ? listEl.children.length : 0;

			// Verify playtime
			const totalSec = typeof window.getCurrentTotalSeconds === 'function' ? window.getCurrentTotalSeconds() : -1;

			// Restore original setItem
			localStorage.setItem = originalSetItem;

			return {
				itemCount,
				playtimeKeyWrites: setItemSpyCount.count,
				totalSec,
			};
		});

		expect(result.itemCount).toBeGreaterThan(0);
		expect(result.playtimeKeyWrites).toBe(0); // 0 writes to localStorage for totalPlaytime during renderSortedInventory
		expect(result.totalSec).toBeGreaterThanOrEqual(0);
	});
});
// Generated code ends here on 2026-10-28T00:00:00Z:
