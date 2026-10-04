// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');
/* global renderExpeditions, startExpedition, totalRolls */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Expeditions system lifecycle logic', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('expeditionsUnlocked', '1');
			localStorage.setItem('totalRolls', '10000');
			localStorage.removeItem('expeditionData');
		});
		await page.reload();
	});

	test('startExpedition persists active state and blocks double launch', async ({ page }) => {
		const res = await page.evaluate(() => {
			startExpedition('short', false);
			const d1 = JSON.parse(localStorage.getItem('expeditionData') || '{}');
			startExpedition('long', true);
			const d2 = JSON.parse(localStorage.getItem('expeditionData') || '{}');
			return { d1, d2 };
		});
		expect(res.d1.active?.lengthId).toBe('short');
		expect(res.d2.active?.lengthId).toBe('short');
	});

	test('renderExpeditions resolves expired expedition and sets cooldown', async ({ page }) => {
		const res = await page.evaluate(() => {
			const initialRolls = totalRolls;
			localStorage.setItem('expeditionData', JSON.stringify({
				active: { lengthId: 'short', startTime: Date.now() - 360000, duration: 300000, riskMode: false, lockedLuck: 1 },
				cooldownUntil: 0
			}));
			globalThis.reloadExpeditionsCache?.();
			renderExpeditions();
			const d = JSON.parse(localStorage.getItem('expeditionData') || '{}');
			return { initialRolls, finalRolls: totalRolls, active: d.active, cooldown: d.cooldownUntil };
		});
		expect(res.active).toBeNull();
		expect(res.finalRolls).toBeGreaterThan(res.initialRolls);
		expect(res.cooldown).toBeGreaterThan(Date.now());
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
