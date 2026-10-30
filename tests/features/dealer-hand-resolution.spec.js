/* global window, document */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Dealer Hand Resolution & Tier Ramping Logic', () => {
	test('resolves hand, tracks read accuracy, and ramps tier after 3 correct calls', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('startAnimConfig', '{"enabled":false}');
			localStorage.setItem('dealerUnlocked', '1');
			const sessionData = {
				cooldownUntil: 0,
				session: {
					deck: [2, 3, 4, 5],
					discard: [],
					tier: 0,
					handsPlayed: 2,
					correctReads: 2,
					active: {
						playerHand: [14, 4, 2],
						dealerHand: [5, 3, 2],
						dealerBest: 5,
						tell: "he doesn't blink.",
						chosenIdx: null,
						stake: 1,
					},
					startedAt: Date.now(),
				},
				metWelcome: true,
				log: [],
			};
			localStorage.setItem('dealerData', JSON.stringify(sessionData));
		});

		await page.goto(BASE_URL);

		await page.evaluate(() => {
			if (window.unlockPageDot) window.unlockPageDot(4);
			if (window.reloadDealerCache) window.reloadDealerCache();
			if (window.goToPage) window.goToPage(4);
			if (window.renderDealer) window.renderDealer();
		});

		// Select the first card (rank 14, Ace) via in-page click
		await page.evaluate(() => {
			const card = document.querySelector('#dealerContainer .dealer-ascii-card');
			if (card) card.click();
		});

		// Click "call"
		const callBtn = page.locator('#dealerContainer button:has-text("call")');
		await expect(callBtn).toBeVisible();
		await page.evaluate(() => {
			const btn = Array.from(document.querySelectorAll('#dealerContainer button')).find(
				(b) => b.textContent === 'call'
			);
			if (btn) btn.click();
		});

		const modalText = page.locator('.dealer-modal h3');
		await expect(modalText).toHaveText('you win.');

		await page.evaluate(() => {
			const closeBtn = document.querySelector('#dealerResultClose');
			if (closeBtn) closeBtn.click();
		});

		const finalData = await page.evaluate(() => {
			return JSON.parse(localStorage.getItem('dealerData') || '{}');
		});

		expect(finalData.session.handsPlayed).toBe(3);
		expect(finalData.session.correctReads).toBe(3);
		expect(finalData.session.tier).toBe(1);
	});
});
