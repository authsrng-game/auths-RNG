// Generated code starts here on 2026-10-26T12:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('social features observability', () => {
	test('refreshBadges logs warning when API calls fail', async ({ page }) => {
		const warnLogs = [];
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				warnLogs.push(msg.text());
			}
		});

		// Mock network route failures for social endpoints
		await page.route('https://accounts.authsrng.xyz/api/friends', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'internal server error' }),
			});
		});

		await page.route('https://accounts.authsrng.xyz/api/messages/unread-count', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'internal server error' }),
			});
		});

		await page.addInitScript(() => {
			localStorage.setItem('authToken', 'mock-token-123');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('authUid', 'u123');
		});

		await page.goto(BASE_URL);

		await page.evaluate(async () => {
			if (window.SocialFeatures) {
				document.dispatchEvent(new CustomEvent('authchange'));
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		});

		const socialWarn = warnLogs.find((m) => m.includes('[social] failed to refresh badges:'));
		expect(socialWarn).toBeTruthy();
	});
});
// Generated code ends here on 2026-10-26T12:00:00Z:
