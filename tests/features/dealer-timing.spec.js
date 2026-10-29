/* global window */
// Generated code starts here on 2026-11-03T00:00:00Z:
const { test, expect } = require('@playwright/test');

test.describe('Dealer System Timing Reconciliation', () => {
	test('accounts for elapsed background time when calculating recovery cooldown on session timeout', async ({
		page,
	}) => {
		await page.goto('http://localhost:8080/index.html');

		// Unlock dealer system and setup initial state
		await page.evaluate(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
			localStorage.setItem('dealerUnlocked', '1');
			window.unlockPageDot?.(4);
		});

		await page.reload();

		// Start a dealer session at a controlled timestamp
		const sessionStart = 1000000; // arbitrary base timestamp
		await page.evaluate((startTime) => {
			const data = {
				cooldownUntil: 0,
				session: {
					deck: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
					discard: [],
					tier: 0,
					handsPlayed: 0,
					correctReads: 0,
					active: null,
					startedAt: startTime,
				},
				metWelcome: false,
				log: [],
			};
			localStorage.setItem('dealerData', JSON.stringify(data));
			if (window.reloadDealerCache) window.reloadDealerCache();
		}, sessionStart);

		// Simulate tab hidden/refocus after 1 hour (3600 seconds) has elapsed since session started.
		// SESSION_DURATION is 5 minutes (300,000 ms), ENCOUNTER_COOLDOWN is 3 hours (10,800,000 ms).
		// Expiration timestamp = 1,000,000 + 300,000 = 1,300,000 ms.
		// Expected cooldownUntil = 1,300,000 + 10,800,000 = 12,100,000 ms.
		// At refocus time (1,000,000 + 3,600,000 = 4,600,000 ms), remaining cooldown should be 12,100,000 - 4,600,000 = 7,500,000 ms (2h 5m).
		const refocusTime = sessionStart + 3600 * 1000;

		const cooldownUntil = await page.evaluate((nowTime) => {
			const origNow = Date.now;
			Date.now = () => nowTime;
			try {
				if (window.renderDealer) window.renderDealer();
				const saved = JSON.parse(localStorage.getItem('dealerData') || '{}');
				return saved.cooldownUntil;
			} finally {
				Date.now = origNow;
			}
		}, refocusTime);

		const expectedExpiration = sessionStart + 5 * 60 * 1000;
		const expectedCooldownUntil = expectedExpiration + 3 * 60 * 60 * 1000;

		expect(cooldownUntil).toBe(expectedCooldownUntil);
	});
});
// Generated code ends here on 2026-11-03T00:00:00Z:
