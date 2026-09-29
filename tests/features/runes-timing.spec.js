/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes passive generation timing reconciliation', () => {
	test('reconciles gift of wealth and anomaly machine on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeGift', 'wealth');
			localStorage.setItem(
				'runeUpgrades',
				JSON.stringify({
					tripleLuck: false,
					moreBlocks: false,
					anomalyMachine: true,
					dopamineAttack: false,
					doubleClover: false,
				})
			);
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			points = 0;
			anomalies = 0;
			updatePointsDisplay();
			updateAnomalyUI();

			// Fast-forward _lastRuneWealthTick and _lastRuneAnomalyMachineTick 10 seconds into the past
			window._lastRuneWealthTick = Date.now() - 10000;
			window._lastRuneAnomalyMachineTick = Date.now() - 10000;

			// Trigger visibilitychange to visible
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return { points, anomalies };
		});

		// 10s of wealth gift = 10 * 200,000 = 2,000,000 points
		expect(result.points).toBeGreaterThanOrEqual(2000000);
		// 10s of anomaly machine (2s per tick) = 5 ticks * 50 = 250 anomalies
		expect(result.anomalies).toBeGreaterThanOrEqual(250);
	});
});
