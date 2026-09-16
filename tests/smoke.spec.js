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

	// Generated code starts here on 2026-06-18T00:30:00Z:
	test('navigation arrows have accessible aria-labels', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#prevPage')).toHaveAttribute('aria-label', 'Previous page');
		await expect(page.locator('#nextPage')).toHaveAttribute('aria-label', 'Next page');
	});
	// Generated code ends here on 2026-06-18T00:30:00Z:

	// Generated code starts here on 2026-06-18T00:35:00Z:
	test('page dots and close buttons have accessible aria-labels', async ({ page }) => {
		await page.goto(BASE_URL);
		const firstDot = page.locator('.page-dot').first();
		await expect(firstDot).toHaveAttribute('aria-label', 'Page 1');
		await expect(firstDot).toHaveAttribute('aria-current', 'page');

		const closeBtn = page.locator('#indexClose');
		await expect(closeBtn).toHaveAttribute('aria-label', 'Close');
	});
	// Generated code ends here on 2026-06-18T00:35:00Z:

	// Generated code starts here on 2026-06-18T00:40:00Z:
	test('confirm modal has accessible dialog attributes', async ({ page }) => {
		await page.goto(BASE_URL);
		const confirmModal = page.locator('#confirmModal');
		await expect(confirmModal).toHaveAttribute('role', 'dialog');
		await expect(confirmModal).toHaveAttribute('aria-modal', 'true');
		await expect(confirmModal).toHaveAttribute('aria-labelledby', 'modalTitle');
	});
	// Generated code ends here on 2026-06-18T00:40:00Z:

	// Generated code starts here on 2026-06-18T01:00:00Z:
	test('shop upgrade buttons and data transfer buttons have accessible aria-labels', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#buyLuckBtn')).toHaveAttribute('aria-label', 'Upgrade luck boost');
		await expect(page.locator('#exportSettingsBtn')).toHaveAttribute('aria-label', 'Copy settings');
		await expect(page.locator('#exportSaveBtn')).toHaveAttribute('aria-label', 'Copy save data');
	});
	// Generated code ends here on 2026-06-18T01:00:00Z:

	// Generated code starts here on 2026-09-16T00:34:27Z:
	test('theme editor button has accessible aria-label', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#openThemeEditorBtn')).toHaveAttribute(
			'aria-label',
			'Open theme editor'
		);
	});
	// Generated code ends here on 2026-09-16T00:34:27Z:
});
