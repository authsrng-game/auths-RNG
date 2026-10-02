// Generated code starts here on 2026-03-31T22:30:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('cloud backup observability', () => {
	test('cloud backup manual operations emit diagnostic warning logs on failure', async ({ page }) => {
		const warnLogs = [];
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				warnLogs.push(msg.text());
			}
		});

		await page.goto(BASE_URL);

		// Mock user login session
		await page.evaluate(() => {
			localStorage.setItem('authToken', 'test-token');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('authUid', 'u123');
			localStorage.setItem('cloudBackupEnabled', 'true');
			if (window.AuthAccount) {
				document.dispatchEvent(new CustomEvent('authchange'));
			}
		});

		// Mock API failure for POST /api/backup (manual backup rejection)
		await page.route('https://backup.authsrng.xyz/api/backup', async (route) => {
			const req = route.request();
			if (req.method() === 'POST') {
				await route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'invalid payload format' }),
				});
			} else if (req.method() === 'GET') {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'server crash' }),
				});
			} else if (req.method() === 'DELETE') {
				await route.fulfill({
					status: 403,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'access denied' }),
				});
			} else {
				await route.continue();
			}
		});

		// Auto-accept confirm dialogs for restore and delete
		page.on('dialog', (dialog) => dialog.accept());

		// Trigger manual backup, restore, and delete in page context
		await page.evaluate(async () => {
			const btnBackup = document.getElementById('cloudBackupNowBtn');
			if (btnBackup) btnBackup.click();
			// Give backup fetch time to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			const btnRestore = document.getElementById('cloudRestoreBtn');
			if (btnRestore) btnRestore.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			const btnDelete = document.getElementById('cloudDeleteBtn');
			if (btnDelete) btnDelete.click();
			await new Promise((resolve) => setTimeout(resolve, 100));
		});

		// Verify console warnings were logged with [cloud-backup] prefix
		const backupWarn = warnLogs.find((m) => m.includes('[cloud-backup] backup rejected:'));
		const restoreWarn = warnLogs.find((m) => m.includes('[cloud-backup] restore rejected:'));
		const deleteWarn = warnLogs.find((m) => m.includes('[cloud-backup] delete rejected:'));

		expect(backupWarn).toBeTruthy();
		expect(backupWarn).toContain('invalid payload format');

		expect(restoreWarn).toBeTruthy();
		expect(restoreWarn).toContain('server crash');

		expect(deleteWarn).toBeTruthy();
		expect(deleteWarn).toContain('access denied');
	});
});
// Generated code ends here on 2026-03-31T22:30:00Z:
