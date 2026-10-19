/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Auto-roll timing reconciliation', () => {
	test('catches up multiple missed rolls on visibilitychange when auto-roll is active', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const deltaRolls = await page.evaluate(() => {
			const autoBtn = document.getElementById('autoRollBtn');
			if (autoBtn && !autoBtn.classList.contains('active')) {
				autoBtn.click();
			}

			const startRolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
			const speed = typeof rollSpeed !== 'undefined' ? rollSpeed : 1;
			const delay = Math.max(500, speed * 1000 + 400);

			const oldNow = Date.now;
			Date.now = () => oldNow() + delay * 5;

			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			Date.now = oldNow;
			return totalRolls - startRolls;
		});

		expect(deltaRolls).toBe(5);
	});

	test('caps catchup rolls at MAX_AUTO_ROLL_CATCHUP', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const autoRollBtn = page.locator('#autoRollBtn');
		await autoRollBtn.click();

		const deltaRolls = await page.evaluate(() => {
			const startRolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
			const delay = typeof getAutoRollDelay === 'function' ? getAutoRollDelay() : 1000;

			const oldNow = Date.now;
			Date.now = () => oldNow() + delay * 10000;

			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			Date.now = oldNow;
			return totalRolls - startRolls;
		});

		expect(deltaRolls).toBe(3600);
	});

	test('does not trigger roll on visibilitychange when delay has not elapsed', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const deltaRolls = await page.evaluate(() => {
			const autoBtn = document.getElementById('autoRollBtn');
			if (autoBtn && !autoBtn.classList.contains('active')) {
				autoBtn.click();
			}

			const startRolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return totalRolls - startRolls;
		});

		expect(deltaRolls).toBe(0);
	});
});
