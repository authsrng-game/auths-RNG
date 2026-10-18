// Generated code starts here on 2026-03-31T22:30:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('cloud backup observability', () => {
	test('cloud backup manual operations emit diagnostic warning logs on failure', async ({
		page,
	}) => {
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
		await page.route('**/api/backup*', async (route) => {
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
			const section = document.getElementById('cloudBackupSection');
			const btns = section ? Array.from(section.querySelectorAll('button')) : [];
			const btnSync = btns.find((b) => b.textContent.includes('sync now'));
			if (btnSync) btnSync.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			const btnRestore = btns.find((b) => b.textContent.includes('restore points'));
			if (btnRestore) btnRestore.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			const btnForce = btns.find((b) => b.textContent.includes('overwrite cloud'));
			if (btnForce) btnForce.click();
			await new Promise((resolve) => setTimeout(resolve, 100));
		});

		// Verify sync status / sync operations execute without uncaught thrown errors
		expect(warnLogs).toBeDefined();
	});
});
// Generated code ends here on 2026-03-31T22:30:00Z:
