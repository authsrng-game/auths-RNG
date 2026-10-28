// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Security tests', () => {
	test('legal consent popup link has rel="noopener noreferrer"', async ({ page }) => {
		await page.goto(BASE_URL);
		const consentLink = page.locator('#legalConsentInner a[target="_blank"]');
		await expect(consentLink).toBeVisible();
		await expect(consentLink).toHaveAttribute('rel', 'noopener noreferrer');
	});

	test('credits page contributor links have rel="noopener noreferrer" and sanitize input', async ({
		page,
	}) => {
		await page.route(
			'https://api.github.com/repos/authsrng-game/auths-RNG/contributors?per_page=100',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([
						{
							login: '<script>alert(1)</script>hacker',
							html_url: 'https://github.com/hacker',
							avatar_url: 'https://github.com/avatar.png',
							contributions: 42,
						},
					]),
				});
			}
		);

		await page.goto(`${BASE_URL}/assets/frontend/credits.html`);
		const contribLink = page.locator('.contributor');
		await expect(contribLink).toBeVisible();
		await expect(contribLink).toHaveAttribute('rel', 'noopener noreferrer');
		await expect(contribLink.locator('.name')).toHaveText('<script>alert(1)</script>hacker');
	});

	test('auth modal links opening in new tab have rel="noopener noreferrer"', async ({ page }) => {
		await page.goto(BASE_URL);
		const targetBlankLinks = page.locator(
			'.altcha-attribution a[target="_blank"], .auth-legal-note a[target="_blank"]'
		);
		const count = await targetBlankLinks.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i++) {
			await expect(targetBlankLinks.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
		}
	});

	test('discord OAuth authorize URL validation blocks non-HTTPS or non-Discord hosts', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('authToken', 'test-token');
			localStorage.setItem('authUsername', 'testuser');
			localStorage.setItem('authUid', 'u123');
		});

		await page.route('https://accounts.authsrng.xyz/api/accounts/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					username: 'testuser',
					createdAt: Date.now(),
					backupKeysRemaining: 3,
					activeSessions: 1,
					discordId: null,
				}),
			});
		});

		let redirectAttempt = '';
		await page.route('https://accounts.authsrng.xyz/api/accounts/discord/authorize', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ url: redirectAttempt }),
			});
		});

		await page.goto(BASE_URL);

		// Open dashboard connections tab
		await page.evaluate(() => {
			if (window.AuthAccount) {
				window.AuthAccount.openDashboard('connections');
			}
		});

		const connectBtn = page.locator('#discordConnectBtn');
		await expect(connectBtn).toBeVisible();

		// Case 1: Insecure HTTP Discord URL
		redirectAttempt = 'http://discord.com/oauth2/authorize';
		await connectBtn.click({ force: true });
		await page.waitForTimeout(300);
		expect(page.url()).not.toContain('discord.com');

		// Case 2: Third-party domain
		redirectAttempt = 'https://attacker.com/login';
		await connectBtn.click({ force: true });
		await page.waitForTimeout(300);
		expect(page.url()).not.toContain('attacker.com');

		// Case 3: Domain spoofing attempt
		redirectAttempt = 'https://evil.discord.com.attacker.com/oauth2';
		await connectBtn.click({ force: true });
		await page.waitForTimeout(300);
		expect(page.url()).not.toContain('attacker.com');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
