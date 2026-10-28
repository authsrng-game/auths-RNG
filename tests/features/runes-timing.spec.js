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

	// Generated code starts here on 2026-10-20T00:00:00Z:
	test('reconciles dopamine attack rolls on visibilitychange', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeUpgrades', JSON.stringify({ dopamineAttack: true }));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const initialRolls = totalRolls;

			// Fast-forward last dopamine attack tick timestamp into the past by 30 seconds (approx 90 rolls at 3 rolls/s)
			window._lastDopamineAttackTick = Date.now() - 30000;

			// Trigger visibilitychange event
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return {
				initialRolls,
				finalRolls: totalRolls,
			};
		});

		expect(result.finalRolls - result.initialRolls).toBeGreaterThanOrEqual(85);
	});
	// Generated code ends here on 2026-10-20T00:00:00Z:

	// Generated code starts here on 2026-10-28T03:04:04Z:
	test('reconciles rune passive progress on pagehide and hidden visibilitychange', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeGift', 'wealth');
			localStorage.setItem('runeUpgrades', JSON.stringify({ anomalyMachine: true, dopamineAttack: true }));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			points = 0;
			anomalies = 0;
			if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
			if (typeof updateAnomalyUI === 'function') updateAnomalyUI();

			window._lastRuneWealthTick = Date.now() - 5000;
			window._lastRuneAnomalyMachineTick = Date.now() - 6000;
			window._lastDopamineAttackTick = Date.now() - 9000;

			// Trigger pagehide event
			window.dispatchEvent(new globalThis.Event('pagehide'));

			const pagehideSavedPoints = points;
			const pagehideSavedAnomalies = anomalies;
			const pagehideSavedRolls = totalRolls;

			// Fast-forward again
			window._lastRuneWealthTick = Date.now() - 5000;
			window._lastRuneAnomalyMachineTick = Date.now() - 6000;
			window._lastDopamineAttackTick = Date.now() - 9000;

			// Trigger visibilitychange to hidden
			Object.defineProperty(document, 'hidden', { value: true, configurable: true });
			Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return {
				pagehideSavedPoints,
				pagehideSavedAnomalies,
				pagehideSavedRolls,
				hiddenPoints: points,
				hiddenAnomalies: anomalies,
				hiddenRolls: totalRolls,
			};
		});

		expect(result.pagehideSavedPoints).toBeGreaterThanOrEqual(1000000);
		expect(result.pagehideSavedAnomalies).toBeGreaterThanOrEqual(150);
		expect(result.pagehideSavedRolls).toBeGreaterThanOrEqual(25);

		expect(result.hiddenPoints).toBeGreaterThanOrEqual(2000000);
		expect(result.hiddenAnomalies).toBeGreaterThanOrEqual(300);
		expect(result.hiddenRolls).toBeGreaterThanOrEqual(50);
	});
	// Generated code ends here on 2026-10-28T03:04:04Z:
});
