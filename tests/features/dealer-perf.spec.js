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
});
// Generated code ends here on 2026-10-26T00:00:00Z:
