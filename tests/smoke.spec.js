const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('auths-RNG smoke tests', () => {

	test('index.html returns 200', async ({ page }) => {
		const res = await page.goto(BASE_URL);
		expect(res.status()).toBe(200);
	});

	test('no uncaught JS errors on load', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (err) => errors.push(err.message));
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

	test('roll button is visible', async ({ page }) => {
		await page.goto(BASE_URL);
		const rollBtn = page.locator('#rollBtn');
		await expect(rollBtn).toBeVisible({ timeout: 5000 });
	});

	test('roll button is clickable and does not crash', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto(BASE_URL);
		await page.locator('#rollBtn').waitFor({ state: 'visible', timeout: 5000 });
		await page.locator('#rollBtn').click();
		await page.waitForTimeout(1000);
		expect(errors).toHaveLength(0);
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

	test('styles.css loads', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/styles.css`);
		expect(res.status()).toBe(200);
	});

	test('manifest.json is valid JSON', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/manifest.json`);
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(() => JSON.parse(body)).not.toThrow();
	});

});
