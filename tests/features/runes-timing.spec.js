/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Runes timing reconciliation', () => {
	test('reconciles gift of wealth points on visibilitychange when tab was throttled', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeGift', 'wealth');
			localStorage.setItem('shopPoints', '1000');
		});
		await page.goto(BASE_URL);

		await page.waitForFunction(() => typeof window.updatePointsDisplay === 'function');

		const initialPoints = await page.evaluate(() => (typeof points !== 'undefined' ? points : 0));

		// Wait 2.5 seconds and trigger visibilitychange
		await page.waitForTimeout(2500);
		await page.evaluate(() => {
			document.dispatchEvent(new Event('visibilitychange'));
		});

		const reconciledPoints = await page.evaluate(() =>
			typeof points !== 'undefined' ? points : 0
		);
		expect(reconciledPoints).toBeGreaterThanOrEqual(initialPoints + 400000);
	});

	test('reconciles anomaly machine passive generation on visibilitychange when tab was throttled', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('runesUnlocked', '1');
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
			localStorage.setItem('anomalies', '10');
		});
		await page.goto(BASE_URL);

		await page.waitForFunction(() => typeof window.updateAnomalyUI === 'function');

		const initialAnomalies = await page.evaluate(() =>
			typeof anomalies !== 'undefined' ? anomalies : 0
		);

		// Wait 4.5 seconds (2 intervals of 2s = 100 anomalies) and trigger visibilitychange
		await page.waitForTimeout(4500);
		await page.evaluate(() => {
			document.dispatchEvent(new Event('visibilitychange'));
		});

		const reconciledAnomalies = await page.evaluate(() =>
			typeof anomalies !== 'undefined' ? anomalies : 0
		);
		expect(reconciledAnomalies).toBeGreaterThanOrEqual(initialAnomalies + 100);
	});
});
