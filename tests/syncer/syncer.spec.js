const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Syncer state consistency tests', () => {
	// Generated code starts here on 2026-10-24T00:00:00Z:
	test('infoTipsRead is removed on resetInventory', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.setItem('infoTipsRead', JSON.stringify(['anomalies', 'mutations']));
		});
		await page.evaluate(async () => {
			globalThis.showConfirm = () => Promise.resolve(true);
			globalThis.showAlert = () => Promise.resolve();
			globalThis.location.reload = () => {};
			const resetBtn = globalThis.document.getElementById('resetBtn');
			if (resetBtn) resetBtn.click();
		});
		await page.waitForTimeout(500);
		const val = await page.evaluate(() => {
			return globalThis.localStorage.getItem('infoTipsRead');
		});
		expect(val).toBeNull();
	});
	// Generated code ends here on 2026-10-24T00:00:00Z:

	// Generated code starts here on 2026-03-31T20:00:00Z:
	test('starmap star trail cosmetic migrates from starmapData shopPurchases', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.removeItem('cosmeticUnlock_star_trail');
			globalThis.localStorage.setItem('starmapUnlocked', '1');
			globalThis.localStorage.setItem(
				'starmapData',
				JSON.stringify({
					shopPurchases: { star_trail: 1 },
				})
			);
		});
		await page.reload();
		await page.waitForTimeout(500);
		const val = await page.evaluate(() => {
			return globalThis.localStorage.getItem('cosmeticUnlock_star_trail');
		});
		expect(val).toBe('1');
	});
	// Generated code ends here on 2026-03-31T20:00:00Z:

	// Generated code starts here on 2026-03-31T21:00:00Z:
	test('_plush_v3 is included in SYNC_KEYS for cloud backup synchronization', async ({ page }) => {
		await page.goto(BASE_URL);
		const hasPlushKeyInSync = await page.evaluate(() => {
			const scriptText = Array.from(globalThis.document.querySelectorAll('script'))
				.map((s) => s.src)
				.filter(Boolean);
			return scriptText.some((src) => src.includes('sync.js'));
		});
		expect(hasPlushKeyInSync).toBe(true);

		const containsKeyInSource = await page.evaluate(async () => {
			const res = await globalThis.fetch('/assets/scripts/sync.js');
			const text = await res.text();
			return text.includes("'_plush_v3'");
		});
		expect(containsKeyInSource).toBe(true);
	});
	// Generated code ends here on 2026-03-31T21:00:00Z:

	// Generated code starts here on 2026-10-25T00:00:00Z:
	test('getTrust handles legacy array data in mutationTrust and migrates to mutationHistory', async ({
		page,
	}) => {
		const legacyArray = [
			{ a: 'Common', b: 'Uncommon', result: 'Rare', good: true, ts: Date.now() },
		];
		await page.addInitScript((items) => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('mutationsUnlocked', '1');
			localStorage.setItem('mutationTrust', JSON.stringify(items));
		}, legacyArray);
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const history = globalThis.localStorage.getItem('mutationHistory');
			const trustKey = globalThis.localStorage.getItem('mutationTrust');
			const trustAmtEl = globalThis.document.getElementById('mutationTrustAmt');
			return {
				history,
				trustKey,
				trustAmtText: trustAmtEl ? trustAmtEl.textContent : null,
			};
		});

		expect(result.history).not.toBeNull();
		expect(JSON.parse(result.history)).toEqual(legacyArray);
		expect(result.trustKey).toBeNull();
		if (result.trustAmtText !== null) {
			expect(result.trustAmtText).toBe('0');
		}
	});
	// Generated code ends here on 2026-10-25T00:00:00Z:
});
