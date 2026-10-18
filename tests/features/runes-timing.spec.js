/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes timing reconciliation', () => {
	test('reconciles gift of wealth and anomaly machine on visibilitychange', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeGift', 'wealth');
			localStorage.setItem('runeUpgrades', JSON.stringify({ anomalyMachine: true }));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			points = 0;
			anomalies = 0;
			if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
			if (typeof updateAnomalyUI === 'function') updateAnomalyUI();

			// Fast-forward last tick timestamps into the past (10 seconds ago for wealth, 10 seconds ago [5 ticks] for anomaly machine)
			window._lastRuneWealthTick = Date.now() - 10000;
			window._lastRuneAnomalyMachineTick = Date.now() - 10000;

			// Trigger visibilitychange to visible
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return {
				points,
				anomalies,
			};
		});

		expect(result.points).toBeGreaterThanOrEqual(2000000);
		expect(result.anomalies).toBeGreaterThanOrEqual(250);
	});

	test('reconciles dopamine attack auto-rolls on visibilitychange and respects cap', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeUpgrades', JSON.stringify({ dopamineAttack: true }));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			let clicks = 0;
			const btn = document.getElementById('rollBtn');
			if (btn) {
				const origClick = btn.click;
				btn.click = function () {
					clicks++;
					return origClick.apply(this, arguments);
				};
			}

			// Simulate 6 seconds elapsed background time (18 rolls at 3 rolls/s)
			window._lastDopamineAttackTick = Date.now() - 6000;
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return clicks;
		});

		expect(result).toBeGreaterThanOrEqual(17);
	});
});
