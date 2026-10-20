// Generated code starts here on 2026-10-19T20:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('cloud backup observability', () => {
	test('cloud backup operations emit diagnostic warning logs on failure', async ({ page }) => {
		const warnLogs = [];
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				warnLogs.push(msg.text());
			}
		});

		await page.goto(BASE_URL);

		// Mock logged in user session, showConfirm, and window.Sync error scenarios
		await page.evaluate(() => {
			localStorage.setItem('authToken', 'test-token');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('authUid', 'u123');

			// Auto-confirm custom DOM popups
			window.showConfirm = async () => true;
			window.showAlert = async () => {};

			// Mock window.AuthAccount
			window.AuthAccount = {
				isLoggedIn: () => true,
				getToken: () => 'test-token',
			};

			// Ensure Sync mock handles operations with failures
			if (window.Sync) {
				window.Sync.syncNow = async () => {
					throw new Error('network timeout on sync');
				};
				window.Sync.listHistory = async () => null;
				window.Sync.forcePush = async () => false;
				window.Sync.restoreFromHistory = async (id) => ({
					ok: false,
					error: 'corrupt snapshot ' + id,
				});
			}

			// Trigger re-render of cloudBackupSection UI
			document.dispatchEvent(new CustomEvent('authchange'));
		});

		// 1. Trigger "sync now" button
		await page.evaluate(async () => {
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			const syncBtn = btns.find((b) => b.textContent.trim().includes('sync now'));
			if (syncBtn) syncBtn.click();
		});
		await page.waitForTimeout(100);

		// 2. Trigger "restore points" button when listHistory returns null
		await page.evaluate(async () => {
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			const histBtn = btns.find((b) => b.textContent.trim().includes('restore points'));
			if (histBtn) histBtn.click();
		});
		await page.waitForTimeout(100);

		// 3. Mock listHistory returning an item, click "restore points", wait for "restore" button, and click it
		await page.evaluate(async () => {
			window.Sync.listHistory = async () => [
				{ id: 'item_1', kind: 'auto', rolls: 100, createdAt: Date.now() - 60000 },
			];
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			const histBtn = btns.find((b) => b.textContent.trim().includes('restore points'));
			if (histBtn) histBtn.click();
		});

		await page.waitForFunction(() => {
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			return btns.some((b) => b.textContent.trim() === 'restore');
		}, { timeout: 5000 });

		await page.evaluate(async () => {
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			const restoreBtn = btns.find((b) => b.textContent.trim() === 'restore');
			if (restoreBtn) restoreBtn.click();
		});
		await page.waitForTimeout(100);

		// 4. Trigger "overwrite cloud with this device" button when forcePush returns false
		await page.evaluate(async () => {
			const btns = Array.from(document.querySelectorAll('#cloudBackupSection button'));
			const overwriteBtn = btns.find((b) => b.textContent.trim().includes('overwrite cloud'));
			if (overwriteBtn) overwriteBtn.click();
		});
		await page.waitForTimeout(100);

		// Verify console warnings were logged with [cloud-backup] prefix
		const syncWarn = warnLogs.find((m) => m.includes('[cloud-backup] manual sync failed:'));
		const listWarn = warnLogs.find((m) =>
			m.includes('[cloud-backup] restore points list is null or request failed')
		);
		const restoreWarn = warnLogs.find((m) => m.includes('[cloud-backup] restore failed:'));
		const overwriteWarn = warnLogs.find((m) =>
			m.includes('[cloud-backup] overwrite cloud with this device failed')
		);

		expect(syncWarn).toBeTruthy();
		expect(listWarn).toBeTruthy();
		expect(restoreWarn).toBeTruthy();
		expect(overwriteWarn).toBeTruthy();
	});
});
// Generated code ends here on 2026-10-19T20:00:00Z:
