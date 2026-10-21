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

	test('reconciles dopamine attack catch-up rolls on visibilitychange', async ({ page }) => {
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeUpgrades', JSON.stringify({ dopamineAttack: true }));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const initialRolls = totalRolls;

			// Fast-forward last dopamine attack tick timestamp into the past (e.g. 30 seconds ago = ~90 rolls)
			window._lastDopamineAttackTick = Date.now() - 30000;

			// Trigger visibilitychange event to simulate tab refocus
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return {
				initialRolls,
				finalRolls: totalRolls,
				gainedRolls: totalRolls - initialRolls,
			};
		});

		expect(result.gainedRolls).toBeGreaterThanOrEqual(80);
	});
});
