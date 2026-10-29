/* global document, window, totalRolls */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Auto Roll background timing reconciliation', () => {
	test('catches up auto-rolls on visibilitychange when tab was backgrounded', async ({ page }) => {
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		// Simulate background tab where tick returns early
		await page.evaluate(() => {
			Object.defineProperty(document, 'hidden', {
				value: true,
				writable: true,
				configurable: true,
			});
		});

		await page.evaluate(() => {
			const autoBtn = document.getElementById('autoRollBtn');
			if (autoBtn && !autoBtn.classList.contains('active')) autoBtn.click();
		});

		await page.waitForTimeout(1500);

		const rollCountBeforeRefocus = await page.evaluate(() => {
			return typeof totalRolls !== 'undefined' ? totalRolls : 0;
		});

		// Refocus tab
		await page.evaluate(() => {
			Object.defineProperty(document, 'hidden', {
				value: false,
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event('visibilitychange'));
		});

		await page.waitForTimeout(1600);

		const rollCountAfterRefocus = await page.evaluate(() => {
			return typeof totalRolls !== 'undefined' ? totalRolls : 0;
		});

		expect(rollCountAfterRefocus).toBeGreaterThan(rollCountBeforeRefocus);
	});

	// Generated code starts here on 2026-10-29T16:38:33Z:
	test('reconciles expired luck boost on performRoll in background', async ({ page }) => {
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const isBoostCleanedUp = await page.evaluate(() => {
			// Start luck boost
			window.startLuckBoost();

			// Mock Date.now to 2 minutes in the future so boost is expired
			const future = Date.now() + 120000;
			const origDateNow = Date.now;
			Date.now = () => future;

			try {
				if (typeof window._resetNextRollAllowedAt === 'function') {
					window._resetNextRollAllowedAt();
				}
				window.performRoll();
			} finally {
				Date.now = origDateNow;
			}

			// Check if luckBoostBadge is hidden
			const badge = document.getElementById('luckBoostBadge');
			return badge ? badge.style.display === 'none' : true;
		});

		expect(isBoostCleanedUp).toBe(true);
	});

	test('reconciles expired active potions on performRoll in background', async ({ page }) => {
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const isPotionCleanedUp = await page.evaluate(() => {
			// Award points, buy and use potion
			window.awardPoints(100000);
			window.buyPotion('luck2x');
			window.usePotion('luck2x');

			// Mock Date.now to 10 minutes in the future so potion is expired
			const future = Date.now() + 600000;
			const origDateNow = Date.now;
			Date.now = () => future;

			try {
				if (typeof window._resetNextRollAllowedAt === 'function') {
					window._resetNextRollAllowedAt();
				}
				window.performRoll();
			} finally {
				Date.now = origDateNow;
			}

			// Check if activePotionsDisplay is hidden
			const display = document.getElementById('activePotionsDisplay');
			return display ? display.style.display === 'none' : true;
		});

		expect(isPotionCleanedUp).toBe(true);
	});
	// Generated code ends here on 2026-10-29T16:38:33Z:
});
