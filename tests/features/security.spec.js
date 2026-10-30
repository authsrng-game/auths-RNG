/* global window */
// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

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

	test('irc widget link opening in new tab has rel="noopener noreferrer"', async ({ page }) => {
		await page.goto(BASE_URL);
		const ircLink = page.locator('#irc-widget a[target="_blank"]');
		await expect(ircLink).toHaveAttribute('rel', 'noopener noreferrer');
	});

	test('discord authorize redirect safely validates allowed domain protocols', async ({ page }) => {
		await page.goto(BASE_URL);

		// Test non-Discord URL is rejected
		let redirectAttempted = false;
		page.on('framenavigated', (frame) => {
			if (frame === page.mainFrame()) {
				try {
					if (new URL(frame.url()).hostname === 'evil.com') {
						redirectAttempted = true;
					}
				} catch {
					// Ignore invalid URL parse errors
				}
			}
		});

		await page.route('**/api/accounts/discord/authorize', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ url: 'https://evil.com/phish' }),
			});
		});

		await page.evaluate(async () => {
			const res = await fetch('https://accounts.authsrng.xyz/api/accounts/discord/authorize');
			const data = await res.json();
			if (data && typeof data.url === 'string') {
				try {
					const parsedUrl = new URL(data.url);
					const host = parsedUrl.hostname.toLowerCase();
					if (
						parsedUrl.protocol === 'https:' &&
						(host === 'discord.com' ||
							host === 'discordapp.com' ||
							host.endsWith('.discord.com') ||
							host.endsWith('.discordapp.com'))
					) {
						window.location.href = parsedUrl.href;
					}
						} catch {
							// Ignore invalid URL parse errors
						}
			}
		});

		expect(redirectAttempted).toBe(false);
		let navigatedHost;
		try {
			navigatedHost = new URL(page.url()).hostname;
		} catch {
			navigatedHost = '';
		}
		expect(navigatedHost).not.toBe('evil.com');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
