/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes timing reconciliation', () => {
	test('reconciles gift of wealth and anomaly machine on visibilitychange', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeGift', 'wealth');
			localStorage.setItem('runeUpgrades', JSON.stringify({ anomalyMachine: true }));
		});
		await page.reload();

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

	// Generated code starts here on 2026-10-23T16:20:00Z:
	test('reconciles dopamine attack background rolls on visibilitychange', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeUpgrades', JSON.stringify({ dopamineAttack: true }));
		});
		await page.reload();

		const rollCount = await page.evaluate(() => {
			const initialRolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;

			// Fast-forward last tick timestamp 3 seconds into the past (3,000ms = ~9 rolls at 333ms interval)
			window._lastDopamineAttackTick = Date.now() - 3000;

			// Trigger visibilitychange event
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return {
				before: initialRolls,
				after: typeof totalRolls !== 'undefined' ? totalRolls : 0,
			};
		});

		expect(rollCount.after - rollCount.before).toBeGreaterThanOrEqual(8);
	});
	// Generated code ends here on 2026-10-23T16:20:00Z:
});
