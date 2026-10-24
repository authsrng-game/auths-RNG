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

	// Generated code starts here on 2026-10-21T03:20:00Z:
	test('reconciles active potion expiration during background roll catch-up', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const potionState = await page.evaluate(() => {
			// Track globalLuckMultiplier used during each roll in Plush.roll
			const rollsMults = [];
			const origRoll = Plush.roll;
			Plush.roll = function (...args) {
				rollsMults.push(args[1]);
				return origRoll.apply(this, args);
			};

			// Set up active potion and adjust duration so it expires after 5 seconds (5 rolls @ 1000ms delay)
			playerPotions.luck2x = 1;
			usePotion('luck2x');
			const startSimulatedNow = Date.now() - 10 * 1000;
			activePotions[0].endTime = startSimulatedNow + 5000;

			const luckWithPotion = globalLuckMultiplier;

			// Perform 10 background rolls with 1000ms delay each (total 10 seconds simulated time)
			performBackgroundRoll(10, 1000);

			Plush.roll = origRoll;

			return {
				rollsMults,
				luckWithPotion,
				luckAfterCatchup: globalLuckMultiplier,
				activePotionsCount: activePotions.length,
			};
		});

		expect(potionState.luckWithPotion).toBeGreaterThan(potionState.luckAfterCatchup);
		expect(potionState.activePotionsCount).toBe(0);
		expect(potionState.rollsMults).toHaveLength(10);
		expect(potionState.rollsMults).toEqual([
			potionState.luckWithPotion,
			potionState.luckWithPotion,
			potionState.luckWithPotion,
			potionState.luckWithPotion,
			potionState.luckAfterCatchup,
			potionState.luckAfterCatchup,
			potionState.luckAfterCatchup,
			potionState.luckAfterCatchup,
			potionState.luckAfterCatchup,
			potionState.luckAfterCatchup,
		]);
	});
	// Generated code ends here on 2026-10-21T03:20:00Z:

	// Generated code starts here on 2026-10-23T03:08:00Z:
	test('preserves 100-roll milestone luck boost during background roll catch-up', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const boostState = await page.evaluate(() => {
			const boostActivePerRoll = [];
			const origRoll = Plush.roll;
			Plush.roll = function (...args) {
				boostActivePerRoll.push(args[4]);
				return origRoll.apply(this, args);
			};

			totalRolls = 98;
			endLuckBoost();

			// execute 5 background rolls starting 10s in the past (totalRolls hits 100 at roll 2)
			performBackgroundRoll(5, 1000);

			Plush.roll = origRoll;

			return {
				boostActivePerRoll,
				totalRolls,
			};
		});

		expect(boostState.totalRolls).toBe(103);
		expect(boostState.boostActivePerRoll).toEqual([false, false, true, true, true]);
	});
	// Generated code ends here on 2026-10-23T03:08:00Z:

	// Generated code starts here on 2026-10-24T03:23:03Z:
	test('processes auto-rolls during hidden tab tick intervals and pagehide', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.81-hf');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.reload();

		const result = await page.evaluate(() => {
			const autoBtn = document.getElementById('autoRollBtn');
			if (autoBtn && !autoBtn.classList.contains('active')) {
				autoBtn.click();
			}

			const startRolls = typeof totalRolls !== 'undefined' ? totalRolls : 0;
			const speed = typeof rollSpeed !== 'undefined' ? rollSpeed : 1;
			const delay = Math.max(500, speed * 1000 + 400);

			// Simulate hidden tab state
			Object.defineProperty(document, 'hidden', {
				value: true,
				configurable: true,
			});

			const oldNow = Date.now;
			Date.now = () => oldNow() + delay * 3;

			// Trigger visibilitychange to hidden (should process 3 rolls)
			document.dispatchEvent(new globalThis.Event('visibilitychange'));
			const rollsAfterHide = totalRolls - startRolls;

			// Advance time by another 2 delays and dispatch pagehide
			Date.now = () => oldNow() + delay * 5;
			window.dispatchEvent(new globalThis.Event('pagehide'));
			const rollsAfterPagehide = totalRolls - startRolls;

			Date.now = oldNow;
			Object.defineProperty(document, 'hidden', {
				value: false,
				configurable: true,
			});

			return {
				rollsAfterHide,
				rollsAfterPagehide,
			};
		});

		expect(result.rollsAfterHide).toBe(3);
		expect(result.rollsAfterPagehide).toBe(5);
	});
	// Generated code ends here on 2026-10-24T03:23:03Z:
});
