// Generated code starts here on 2026-10-26T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window */

const BASE_URL = 'http://localhost:8080/';

test.describe('Dealer System Performance & State Caching', () => {
	test('reloadDealerCache re-reads dealerData and timer updates target text element', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Unlock dealer system, setup active session, and navigate to dealer page (index 4)
		await page.evaluate(() => {
			localStorage.setItem('dealerUnlocked', '1');
			const sessionData = {
				cooldownUntil: 0,
				session: {
					deck: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
					discard: [],
					tier: 1,
					handsPlayed: 2,
					correctReads: 2,
					active: null,
					startedAt: Date.now(),
				},
				metWelcome: true,
				log: [],
			};
			localStorage.setItem('dealerData', JSON.stringify(sessionData));
			if (window.unlockPageDot) window.unlockPageDot(4);
			if (window.reloadDealerCache) window.reloadDealerCache();
			if (window.goToPage) window.goToPage(4);
			if (window.renderDealer) window.renderDealer();
		});

		const container = page.locator('#dealerContainer');
		await expect(container).toBeVisible();

		// Verify session timer element is rendered
		const timerEl = page.locator('#dealerContainer .dealer-session-timer');
		await expect(timerEl).toContainText('leaves in');

		// Modify localStorage externally and ensure reloadDealerCache refreshes in-memory state
		await page.evaluate(() => {
			const data = JSON.parse(localStorage.getItem('dealerData'));
			data.session.tier = 3;
			localStorage.setItem('dealerData', JSON.stringify(data));
			window.reloadDealerCache();
			window.renderDealer();
		});

		const statsEl = page.locator('#dealerContainer .dealer-session-stats');
		await expect(statsEl).toContainText('his attention: tier 3');
	});

	// Generated code starts here on 2026-11-01T03:30:00Z:
	test('accounts for elapsed background time when calculating encounter cooldown after session timeout', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const res = await page.evaluate(() => {
			const now = Date.now();
			// Session started 35 minutes ago (SESSION_DURATION is 5 minutes = 300,000ms).
			// Expired at now - 30 minutes. Encounter cooldown is 3 hours (10,800,000ms).
			// Expected cooldown base is sessionEnd = now - 30 min, so cooldownUntil should be
			// (now - 30 min) + 3 hours = now + 2.5 hours (now + 9,000,000ms).
			const sessionData = {
				cooldownUntil: 0,
				session: {
					deck: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
					discard: [],
					tier: 0,
					handsPlayed: 1,
					correctReads: 1,
					active: null,
					startedAt: now - 35 * 60 * 1000,
				},
				metWelcome: true,
				log: [],
			};
			localStorage.setItem('dealerUnlocked', '1');
			localStorage.setItem('dealerData', JSON.stringify(sessionData));
			if (window.reloadDealerCache) window.reloadDealerCache();
			if (window.renderDealer) window.renderDealer();

			const updated = JSON.parse(localStorage.getItem('dealerData') || '{}');
			const expectedMaxCooldown = now - 30 * 60 * 1000 + 3 * 60 * 60 * 1000 + 5000;
			const expectedMinCooldown = now - 30 * 60 * 1000 + 3 * 60 * 60 * 1000 - 5000;

			return {
				session: updated.session,
				cooldownUntil: updated.cooldownUntil,
				expectedMaxCooldown,
				expectedMinCooldown,
			};
		});

		expect(res.session).toBeNull();
		expect(res.cooldownUntil).toBeLessThanOrEqual(res.expectedMaxCooldown);
		expect(res.cooldownUntil).toBeGreaterThanOrEqual(res.expectedMinCooldown);
	});
	// Generated code ends here on 2026-11-01T03:30:00Z:
});
// Generated code ends here on 2026-10-26T00:00:00Z:
