/* eslint-disable no-undef */
// Generated code starts here on 2026-04-03T00:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Mutations timing reconciliation', () => {
	test('reconciles mutation cooldown on visibilitychange when tab was backgrounded', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('mutationsUnlocked', '1');
			const inv = [
				{ name: 'Common', chance: 0.5, count: 5 },
				{ name: 'Uncommon', chance: 0.25, count: 5 },
			];
			localStorage.setItem('rarityInventory', JSON.stringify(inv));
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			if (typeof renderMutations === 'function') renderMutations();

			// Bypass roll choice modal for deterministic testing
			const origChoice = window.showRollChoice;
			window.showRollChoice = (_res, onDone) => onDone();

			const btn = document.getElementById('mutateBtn');
			if (btn && !btn.disabled) {
				btn.click();
			}

			window.showRollChoice = origChoice;

			const cdEl = document.getElementById('mutationCooldown');
			const initialText = cdEl ? cdEl.textContent : '';
			const initialDisabled = btn ? btn.disabled : false;

			// Fast-forward time by 16 seconds (past 15s cooldown)
			const realNow = Date.now;
			Date.now = () => realNow() + 16000;

			// Trigger visibilitychange event
			document.dispatchEvent(new globalThis.Event('visibilitychange'));

			const reconciledText = cdEl ? cdEl.textContent : '';
			const reconciledDisabled = btn ? btn.disabled : true;

			Date.now = realNow;

			return {
				initialText,
				initialDisabled,
				reconciledText,
				reconciledDisabled,
			};
		});

		expect(result.initialText).toContain('cooldown:');
		expect(result.initialDisabled).toBe(true);
		expect(result.reconciledText).toBe('');
		expect(result.reconciledDisabled).toBe(false);
	});
});
// Generated code ends here on 2026-04-03T00:00:00Z:
