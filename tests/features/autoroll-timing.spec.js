/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Auto-roll timing reconciliation', () => {
	test('triggers roll on visibilitychange when delay has elapsed', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		// Toggle auto-roll ON
		const autoRollBtn = page.locator('#autoRollBtn');
		await autoRollBtn.click();

		const rollClicked = await page.evaluate(() => {
			let clicked = false;
			const btn = document.getElementById('rollBtn');
			if (btn) {
				const origClick = btn.click;
				btn.click = function () {
					clicked = true;
					return origClick.apply(this, arguments);
				};
			}

			// Advance time past nextRollAt to simulate delay elapsed
			const rollDelay = typeof getAutoRollDelay === 'function' ? getAutoRollDelay() : 1000;
			const oldNow = Date.now;
			Date.now = () => oldNow() + rollDelay + 2000;

			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			Date.now = oldNow;
			return clicked;
		});

		expect(rollClicked).toBe(true);
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

		const rollClicked = await page.evaluate(() => {
			let clicked = false;

			const autoBtn = document.getElementById('autoRollBtn');
			if (autoBtn && !autoBtn.classList.contains('active')) {
				autoBtn.click();
			}

			const btn = document.getElementById('rollBtn');
			if (btn) {
				const origClick = btn.click;
				btn.click = function () {
					clicked = true;
					return origClick.apply(this, arguments);
				};
			}

			// Dispatch visibilitychange immediately while nextRollAt is still in the future
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			return clicked;
		});

		expect(rollClicked).toBe(false);
	});
});
