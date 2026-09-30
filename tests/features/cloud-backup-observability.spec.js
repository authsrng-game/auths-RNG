// Generated code starts here on 2026-10-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Cloud Backup Observability & Error Visibility', () => {
	test('emits console warning on cloud restore or delete failure', async ({ page }) => {
		const consoleWarnings = [];
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});

		// Intercept fetch API calls to backup endpoint and return 500 error
		await page.route('https://backup.authsrng.xyz/api/backup', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'internal server error' }),
			});
		});

		await page.goto(BASE_URL);

		// Setup auth state & mock window.confirm
		await page.evaluate(() => {
			window.confirm = () => true;
			localStorage.setItem('authToken', 'test-token');
			localStorage.setItem('authUid', 'test-uid');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('cloudBackupEnabled', 'true');
			document.dispatchEvent(new CustomEvent('authchange'));
		});

		// Trigger restore button click
		await page.evaluate(() => {
			const restoreBtn = document.getElementById('cloudRestoreBtn');
			if (restoreBtn) restoreBtn.click();
		});

		// Verify console warning with [cloud-backup] prefix was emitted
		await expect
			.poll(() => consoleWarnings.some((w) => w.includes('[cloud-backup] restore rejected:')))
			.toBe(true);
	});
});
// Generated code ends here on 2026-10-31T00:00:00Z:
