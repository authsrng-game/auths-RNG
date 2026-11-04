/* global window, document */
// Generated code starts here on 2026-11-04T13:35:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('applyIconSettings resolves packs, custom overrides, and updates DOM and events', async ({ page }) => {
	await page.goto(BASE_URL);

	expect(await page.evaluate(() => window.getIcon('notifBell'))).toBe('🔔');
	expect(await page.evaluate(() => document.querySelector('#wellVisual')?.textContent)).toBe('🌊');

	const updated = await page.evaluate(() => {
		let receivedDetail = null;
		document.addEventListener('authsrng:iconsUpdated', (e) => { receivedDetail = e.detail; }, { once: true });

		window.applyIconSettings({ iconPack: 'retro', iconOverrides: { wellVisual: '🛸' } });

		const retroBell = window.getIcon('notifBell');
		const overriddenWell = window.getIcon('wellVisual');
		const domWell = document.querySelector('#wellVisual')?.textContent;
		const domBellPrefix = document.querySelector('#notifBell')?.childNodes[0]?.textContent?.trim();

		window.applyIconSettings({ iconPack: 'nonexistent' });
		const fallbackSpring = window.getIcon('seasonSpring');

		return { retroBell, overriddenWell, fallbackSpring, detailSeason: receivedDetail?.seasonWinter, domWell, domBellPrefix };
	});

	expect(updated.retroBell).toBe('📯');
	expect(updated.overriddenWell).toBe('🛸');
	expect(updated.fallbackSpring).toBe('🌸');
	expect(updated.detailSeason).toBe('🌨️');
	expect(updated.domWell).toBe('🛸');
	expect(updated.domBellPrefix).toBe('📯');
});
// Generated code ends here on 2026-11-04T13:35:00Z:
