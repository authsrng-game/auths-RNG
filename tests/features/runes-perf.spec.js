/* global window, document */
const { test, expect } = require('@playwright/test');

test.describe('Runes System Performance & Node Reuse', () => {
	test('renderRunes updates DOM nodes in-place without destroying container children on repeat renders', async ({
		page,
	}) => {
		await page.goto('http://localhost:8080/');

		// Unlock runes in localStorage and reload page
		await page.evaluate(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem(
				'runesData',
				JSON.stringify({
					counts: { common: 10, 'mid-rare': 5, rare: 1 },
					elementals: { water: 1, fire: 0, earth: 0, wizardry: 0 },
					totalDropped: 16,
				})
			);
		});

		await page.reload();

		// Initial renderRunes call
		await page.evaluate(() => {
			if (typeof window.renderRunes === 'function') {
				window.renderRunes();
			}
		});

		// Check initial element presence
		const initialStatCard = await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			const statEl = container ? container.querySelector('#runeStatCommon') : null;
			if (statEl) {
				statEl._testMarker = 'persistent_node_marker';
			}
			return statEl ? statEl.textContent : null;
		});

		expect(initialStatCard).toBe('10');

		// Trigger subsequent renderRunes calls by dropping a common rune
		await page.evaluate(() => {
			// Sequence of float returns: 0.001 (drop chance <= 1/140), then 0.5 (elemental chance >= 1/20 -> common rune)
			let seq = [0.001, 0.5];
			let seqIdx = 0;
			window.Beacon = {
				float: () => seq[seqIdx++] ?? 0.5,
			};
			if (typeof window.tryDropRune === 'function') {
				window.tryDropRune({ chance: 1 / 10, name: 'Test Rarity' });
			}
		});

		// Verify DOM node was preserved in-place rather than destroyed/recreated via innerHTML
		const updatedNodeState = await page.evaluate(() => {
			const container = document.getElementById('runesContainer');
			const statEl = container ? container.querySelector('#runeStatCommon') : null;
			return {
				marker: statEl ? statEl._testMarker : null,
				text: statEl ? statEl.textContent : null,
			};
		});

		expect(updatedNodeState.marker).toBe('persistent_node_marker');
		expect(updatedNodeState.text).toBe('11');
	});
});
