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
			localStorage.setItem(
				'expeditionData',
				JSON.stringify({
					active: {
						lengthId: 'short',
						startTime: Date.now() - 360000,
						duration: 300000,
						riskMode: false,
						lockedLuck: 1,
					},
					cooldownUntil: 0,
				})
			);
			globalThis.reloadExpeditionsCache?.();
			renderExpeditions();
			const d = JSON.parse(localStorage.getItem('expeditionData') || '{}');
			return { initialRolls, finalRolls: totalRolls, active: d.active, cooldown: d.cooldownUntil };
		});
		expect(res.active).toBeNull();
		expect(res.finalRolls).toBeGreaterThan(res.initialRolls);
		expect(res.cooldown).toBeGreaterThan(Date.now());
	});

	test('cooldownUntil accounts for background time elapsed since completion', async ({ page }) => {
		const res = await page.evaluate(() => {
			const duration = 300000; // 5 minutes
			const cooldown = duration * 0.5; // 2.5 minutes (150,000 ms)
			// Expedition started 10 minutes ago (600,000 ms ago).
			// Finished 5 minutes ago (300,000 ms ago).
			// Cooldown should have ended 2.5 minutes ago (150,000 ms ago).
			const startTime = Date.now() - 600000;
			const expectedCooldownUntil = startTime + duration + cooldown;

			localStorage.setItem(
				'expeditionData',
				JSON.stringify({
					active: {
						lengthId: 'short',
						startTime,
						duration,
						riskMode: false,
						lockedLuck: 1,
					},
					cooldownUntil: 0,
				})
			);
			globalThis.reloadExpeditionsCache?.();
			renderExpeditions();
			const d = JSON.parse(localStorage.getItem('expeditionData') || '{}');
			return { cooldownUntil: d.cooldownUntil, expectedCooldownUntil, now: Date.now() };
		});

		expect(res.cooldownUntil).toBe(res.expectedCooldownUntil);
		expect(res.cooldownUntil).toBeLessThan(res.now);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
