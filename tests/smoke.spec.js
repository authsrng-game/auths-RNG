const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('auths-RNG smoke tests', () => {
	test('index.html returns 200', async ({ page }) => {
		const res = await page.goto(BASE_URL);
		expect(res.status()).toBe(200);
	});

	test('no uncaught JS errors on load', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (err) => {
			if (!err.message.includes('Failed to fetch')) {
				errors.push(err.message);
			}
		});
		await page.goto(BASE_URL);
		await page.waitForTimeout(3000);
		expect(errors).toHaveLength(0);
	});

	test('no failed network requests', async ({ page }) => {
		const failed = [];
		page.on('response', (res) => {
			if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
		});
		await page.goto(BASE_URL);
		await page.waitForTimeout(2000);
		expect(failed).toHaveLength(0);
	});

	test('inventory list exists', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#inventoryList')).toBeAttached();
	});

	test('total rolls counter exists', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#totalRolls')).toBeAttached();
	});

	test('404 page loads', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/404.html`);
		expect(res.status()).toBe(200);
	});

	test('overrides.css loads', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/assets/scripts/styles/overrides.css`);
		expect(res.status()).toBe(200);
	});

	test('manifest.json is valid JSON', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/manifest.json`);
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(() => JSON.parse(body)).not.toThrow();
	});

	// Generated code starts here on 2026-06-18T00:28:00Z:
	test('devOverlayPanel is a singleton', async ({ page }) => {
		await page.goto(BASE_URL);
		const count = await page.evaluate(() => {
			/* global document */
			return document.querySelectorAll('#devOverlayPanel').length;
		});
		expect(count).toBe(1);
	});
	// Generated code ends here on 2026-06-18T00:28:00Z:

	// Generated code starts here on 2026-06-18T01:00:00Z:
	test('FortuneBank balance does not double-decay on multiple reads', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			/* global window */
			const bank = new window.FortuneBank();
			const startTime = 1000000;
			for (let i = 0; i < 300; i++) {
				bank.deposit(startTime);
			}
			const initialBalance = bank.serialize().balance;

			const oneHourLater = startTime + 3600000;
			const origNow = Date.now;
			Date.now = () => oneHourLater;

			const balance1 = bank.balance();
			const balance2 = bank.balance();
			const balance3 = bank.balance();

			Date.now = origNow;

			return { initialBalance, balance1, balance2, balance3 };
		});

		expect(result.balance1).toBeCloseTo(result.initialBalance - 1 / 12, 5);
		expect(result.balance2).toBe(result.balance1);
		expect(result.balance3).toBe(result.balance1);
	});
	// Generated code ends here on 2026-06-18T01:00:00Z:

	// Generated code starts here on 2026-06-18T01:10:00Z:
	test('StreakTracker deserializes dryRuns values as numbers', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const tracker = new window.StreakTracker();
			tracker.deserialize({
				dryRuns: { Rare: '5' },
			});
			tracker.record(1, 'Rare', false);
			return tracker.serialize().dryRuns.Rare;
		});

		expect(result).toBe(6);
	});
	// Generated code ends here on 2026-06-18T01:10:00Z:
});
