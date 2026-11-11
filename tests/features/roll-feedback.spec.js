// Generated code starts here on 2026-11-09T20:25:00Z:
/* global window, document, totalRolls */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Roll button rage-click mitigation and visual feedback', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/api/ccu*', (route) => route.fulfill({ status: 200, body: '{}' }));
		await page.route('https://api.github.com/**', (route) => route.abort());
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.9');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
	});

	test('clicking roll button immediately disables it, adds rolling state, and re-enables after completion', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const rollBtn = page.locator('#rollBtn');
		await expect(rollBtn).toBeVisible();
		await expect(rollBtn).toBeEnabled();

		// Click roll button and immediately assert loading state
		await rollBtn.click();
		await expect(rollBtn).toBeDisabled();
		await expect(rollBtn).toHaveClass(/rolling/);
		await expect(rollBtn).toHaveAttribute('aria-busy', 'true');
		await expect(rollBtn).toHaveText('rolling...');

		// Wait for roll and cooldown to complete
		await expect(rollBtn).toBeEnabled({ timeout: 5000 });
		await expect(rollBtn).not.toHaveClass(/rolling/);
		await expect(rollBtn).not.toHaveAttribute('aria-busy', 'true');
		await expect(rollBtn).toHaveText('roll');
	});

	test('rapid consecutive clicks on roll button are ignored and do not double-submit', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const rollBtn = page.locator('#rollBtn');
		await expect(rollBtn).toBeVisible();
		await expect(rollBtn).toBeEnabled();

		const initialRolls = await page.evaluate(() =>
			typeof totalRolls !== 'undefined' ? totalRolls : 0
		);

		// Rapid clicks (rage click simulation)
		await page.evaluate(() => {
			const btn = document.getElementById('rollBtn');
			if (btn) {
				btn.click();
				btn.click();
				btn.click();
				btn.click();
			}
		});

		// Ensure it remains disabled during roll
		await expect(rollBtn).toBeDisabled();

		// Wait for completion
		await expect(rollBtn).toBeEnabled({ timeout: 5000 });

		const finalRolls = await page.evaluate(() =>
			typeof totalRolls !== 'undefined' ? totalRolls : 0
		);
		expect(finalRolls).toBe(initialRolls + 1);
	});

	test('early click buffer queues roll before main.js attaches performRoll and flushes upon load', async ({
		page,
	}) => {
		let fulfillMainJs = null;
		const mainJsDeferred = new Promise((resolve) => {
			fulfillMainJs = resolve;
		});

		await page.route('**/assets/scripts/main.js', async (route) => {
			await mainJsDeferred;
			await route.continue();
		});

		// Use waitUntil: 'commit' so page.goto returns before deferred scripts finish
		await page.goto(BASE_URL, { waitUntil: 'commit' });

		const rollBtn = page.locator('#rollBtn');
		await expect(rollBtn).toBeAttached();

		// Click rollBtn before main.js has loaded
		await page.evaluate(() => {
			const btn = document.getElementById('rollBtn');
			if (btn) btn.click();
		});

		// Button should immediately show disabled and rolling state
		await expect(rollBtn).toBeDisabled();
		await expect(rollBtn).toHaveClass(/rolling/);
		await expect(rollBtn).toHaveAttribute('aria-busy', 'true');

		// Now release main.js
		fulfillMainJs();

		// The queued roll should complete and eventually re-enable the button
		await expect(rollBtn).toBeEnabled({ timeout: 8000 });
		await expect(rollBtn).not.toHaveClass(/rolling/);

		const rolls = await page.evaluate(() => (typeof totalRolls !== 'undefined' ? totalRolls : 0));
		expect(rolls).toBeGreaterThanOrEqual(1);
	});
});
// Generated code ends here on 2026-11-09T20:25:00Z:
