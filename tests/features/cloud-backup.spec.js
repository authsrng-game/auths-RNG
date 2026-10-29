// Generated code starts here on 2026-03-31T22:30:00Z:
const { test, expect } = require('@playwright/test');

/* global window */

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

		await page.addInitScript(() => {
			localStorage.setItem('authToken', 'test-token');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('authUid', 'u123');
			localStorage.setItem('__sync_meta', JSON.stringify({ uid: 'u123', baseRev: 1 }));
		});

		await page.goto(BASE_URL);

		// Mock API failures for GET /api/save/history and POST /api/save/restore
		await page.route('https://backup.authsrng.xyz/api/save/history', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'server crash' }),
			});
		});

		await page.route('https://backup.authsrng.xyz/api/save/restore', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'invalid restore id' }),
			});
		});

		// Trigger Sync listHistory and restoreFromHistory in page context
		await page.evaluate(async () => {
			if (window.Sync) {
				await window.Sync.listHistory();
				await window.Sync.restoreFromHistory('res_123');
			}
		});

		// Verify console warnings were logged with [sync] prefix
		const listWarn = warnLogs.find((m) => m.includes('[sync] failed to list restore history:'));
		const restoreWarn = warnLogs.find((m) => m.includes('[sync] restore from history failed:'));

		expect(listWarn).toBeTruthy();
		expect(listWarn).toContain('server crash');

		expect(restoreWarn).toBeTruthy();
		expect(restoreWarn).toContain('invalid restore id');
	});
});
// Generated code ends here on 2026-03-31T22:30:00Z:
