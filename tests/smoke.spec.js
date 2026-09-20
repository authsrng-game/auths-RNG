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

	// Generated code starts here on 2026-09-16T00:45:00Z:
	test('notification center has proper aria attributes and keyboard interaction', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		const bell = page.locator('#notifBell');
		const panel = page.locator('#notifPanel');

		await expect(bell).toHaveAttribute('aria-expanded', 'false');
		await expect(bell).toHaveAttribute('aria-controls', 'notifPanel');
		await expect(page.locator('#notifMarkAllRead')).toHaveAttribute(
			'aria-label',
			'Mark all notifications as read'
		);
		await expect(page.locator('#notifClearAll')).toHaveAttribute(
			'aria-label',
			'Clear all notifications'
		);

		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(BASE_URL);

		const saContainer = page.locator('.sa-container');
		if (await saContainer.isVisible()) {
			await saContainer.click({ force: true });
			await page.waitForTimeout(500);
		}

		await page.evaluate(() => {
			const bellEl = document.getElementById('notifBell');
			if (bellEl) bellEl.click();
		});
		await expect(bell).toHaveAttribute('aria-expanded', 'true');
		await expect(panel).toHaveClass(/open/);

		await page.keyboard.press('Escape');
		await expect(bell).toHaveAttribute('aria-expanded', 'false');
		await expect(panel).not.toHaveClass(/open/);
	});
	// Generated code ends here on 2026-09-16T00:45:00Z:

	// Generated code starts here on 2026-09-16T12:00:00Z:
	test('index modal has accessible dialog attributes and search aria-label', async ({ page }) => {
		await page.goto(BASE_URL);
		const indexModal = page.locator('#indexModal');
		await expect(indexModal).toHaveAttribute('role', 'dialog');
		await expect(indexModal).toHaveAttribute('aria-modal', 'true');
		await expect(indexModal).toHaveAttribute('aria-labelledby', 'indexModalTitle');
		await expect(page.locator('#indexSearch')).toHaveAttribute('aria-label', 'Search rarities');
	});
	// Generated code ends here on 2026-09-16T12:00:00Z:

	// Generated code starts here on 2026-06-18T01:30:00Z:
	test('account button is a button element with an accessible aria-label', async ({ page }) => {
		await page.goto(BASE_URL);
		const accountBtn = page.locator('#accountBtn');
		await expect(accountBtn).toHaveAttribute('type', 'button');
		await expect(accountBtn).toHaveAttribute('aria-label', 'Account details and login');
	});
	// Generated code ends here on 2026-06-18T01:30:00Z:

	// Generated code starts here on 2026-09-17T14:00:00Z:
	test('roll choice modal has accessible dialog attributes and button labels', async ({ page }) => {
		await page.goto(BASE_URL);
		const choiceModal = page.locator('#rollChoiceModal');
		await expect(choiceModal).toHaveAttribute('role', 'dialog');
		await expect(choiceModal).toHaveAttribute('aria-modal', 'true');
		await expect(choiceModal).toHaveAttribute('aria-labelledby', 'rollChoiceRarity');
		await expect(page.locator('#rollChoiceSell')).toHaveAttribute('aria-label', 'Sell rarity');
		await expect(page.locator('#rollChoiceKeep')).toHaveAttribute('aria-label', 'Keep rarity');
		await expect(page.locator('#rollChoicePass')).toHaveAttribute('aria-label', 'Pass rarity');
	});
	// Generated code starts here on 2026-09-20T15:30:00Z:
	test('credits page license link resolves to valid licenseview page', async ({ page }) => {
		await page.goto(`${BASE_URL}/assets/frontend/credits.html`);
		const link = page.locator('a:has-text("MIT licensed")');
		await expect(link).toBeAttached();
		const href = await link.getAttribute('href');
		const targetUrl = new URL(href, `${BASE_URL}/assets/frontend/credits.html`).href;
		const res = await page.goto(targetUrl);
		expect(res.status()).toBe(200);
	});
	// Generated code ends here on 2026-09-20T15:30:00Z:
});
