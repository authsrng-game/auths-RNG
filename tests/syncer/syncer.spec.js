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

	// Generated code starts here on 2026-03-31T22:00:00Z:
	test('trustCosmetics getTrust migrates legacy mutationTrust array data to mutationHistory', async ({
		page,
	}) => {
		const legacyArray = [{ a: 'Uncommon', b: 'Rare', result: 'Epic', good: true, ts: Date.now() }];
		await page.addInitScript((items) => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('mutationsUnlocked', '1');
			localStorage.setItem('mutationTrust', JSON.stringify(items));
		}, legacyArray);
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const mount = globalThis.document.createElement('div');
			globalThis.document.body.appendChild(mount);
			globalThis.trustCosmetics?.renderShop?.(mount);
			const history = globalThis.localStorage.getItem('mutationHistory');
			const trustKey = globalThis.localStorage.getItem('mutationTrust');
			mount.remove();
			return {
				history,
				trustKey,
			};
		});

		expect(result.history).not.toBeNull();
		expect(JSON.parse(result.history)).toEqual(legacyArray);
		expect(result.trustKey).toBeNull();
	});
	// Generated code ends here on 2026-03-31T22:00:00Z:

	// Generated code starts here on 2026-10-27T00:00:00Z:
	test('server sync endpoint rejects sync payload with implausible roll count for playtime', async () => {
		const { onRequest } = await import('../../functions/api/sync.js');

		const makeReq = (body) => ({
			method: 'POST',
			url: 'https://example.com/api/sync',
			json: async () => body,
		});

		const validRes = await onRequest({
			request: makeReq({ totalRolls: 500, totalPlaytime: 600, userId: 'u1' }),
		});
		expect(validRes.status).toBe(200);

		const implausibleRes = await onRequest({
			request: makeReq({ totalRolls: 50000, totalPlaytime: 10, userId: 'u2' }),
		});
		expect(implausibleRes.status).toBe(400);
		const implausibleBody = await implausibleRes.json();
		expect(implausibleBody.error).toBe('implausible progress');

		const negativeRes = await onRequest({
			request: makeReq({ totalRolls: -10, totalPlaytime: 600, userId: 'u3' }),
		});
		expect(negativeRes.status).toBe(400);
		const negativeBody = await negativeRes.json();
		expect(negativeBody.error).toBe('implausible progress');

		const invalidJsonReq = {
			method: 'POST',
			url: 'https://example.com/api/sync',
			json: async () => {
				throw new SyntaxError('Unexpected token');
			},
		};
		const invalidJsonRes = await onRequest({ request: invalidJsonReq });
		expect(invalidJsonRes.status).toBe(400);
		const invalidJsonBody = await invalidJsonRes.json();
		expect(invalidJsonBody.error).toBe('invalid json');
	});

	test('server sync endpoint validates shopPoints plausibility', async () => {
		const { onRequest } = await import('../../functions/api/sync.js');

		const makeReq = (body) => ({
			method: 'POST',
			url: 'https://example.com/api/sync',
			json: async () => body,
		});

		const validRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, shopPoints: 5000, userId: 'u4' }),
		});
		expect(validRes.status).toBe(200);

		const negativePointsRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, shopPoints: -50, userId: 'u5' }),
		});
		expect(negativePointsRes.status).toBe(400);
		expect((await negativePointsRes.json()).error).toBe('implausible progress');

		const nonNumericPointsRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, shopPoints: 'invalid', userId: 'u6' }),
		});
		expect(nonNumericPointsRes.status).toBe(400);
		expect((await nonNumericPointsRes.json()).error).toBe('implausible progress');

		const implausiblePointsRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				shopPoints: '1000000000000000000000000',
				userId: 'u7',
			}),
		});
		expect(implausiblePointsRes.status).toBe(400);
		expect((await implausiblePointsRes.json()).error).toBe('implausible progress');
	});
	// Generated code ends here on 2026-10-27T00:00:00Z:

	// Generated code starts here on 2026-10-28T00:00:00Z:
	test('catShrineToggle defaults to enabled when key is missing in localStorage', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('catShrineUnlocked', '1');
			localStorage.setItem('catShrineEquipped', 'https://cataas.com/cat/testcat');
			localStorage.removeItem('catShrineToggle');
		});
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const bodyOff = globalThis.document.body.classList.contains('cat-shrine-off');
			const toggle = globalThis.document.getElementById('catShrineEnabled');
			const pin = globalThis.document.getElementById('catShrinePin');
			return {
				bodyOff,
				checked: toggle ? toggle.checked : null,
				pinVisible: pin ? pin.style.display !== 'none' : false,
			};
		});

		expect(result.bodyOff).toBe(false);
		expect(result.checked).toBe(true);
		expect(result.pinVisible).toBe(true);
	});
	// Generated code ends here on 2026-10-28T00:00:00Z:

	// Generated code starts here on 2026-10-29T00:00:00Z:
	test('server sync endpoint validates mutationTrust plausibility', async () => {
		const { onRequest } = await import('../../functions/api/sync.js');

		const makeReq = (body) => ({
			method: 'POST',
			url: 'https://example.com/api/sync',
			json: async () => body,
		});

		const validRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, mutationTrust: 200, userId: 'u8' }),
		});
		expect(validRes.status).toBe(200);

		const negativeTrustRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, mutationTrust: -10, userId: 'u9' }),
		});
		expect(negativeTrustRes.status).toBe(400);
		expect((await negativeTrustRes.json()).error).toBe('implausible progress');

		const nonNumericTrustRes = await onRequest({
			request: makeReq({ totalRolls: 10, totalPlaytime: 100, trust: 'invalid', userId: 'u10' }),
		});
		expect(nonNumericTrustRes.status).toBe(400);
		expect((await nonNumericTrustRes.json()).error).toBe('implausible progress');

		const implausibleTrustRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				mutationTrust: 100000,
				userId: 'u11',
			}),
		});
		expect(implausibleTrustRes.status).toBe(400);
		expect((await implausibleTrustRes.json()).error).toBe('implausible progress');
	});
	// Generated code ends here on 2026-10-29T00:00:00Z:

	// Generated code starts here on 2026-10-30T00:00:00Z:
	test('themeEditorPresets, themeEditorActive, and startAnimConfig are removed on resetInventory', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.setItem('themeEditorPresets', JSON.stringify([{ name: 'custom' }]));
			globalThis.localStorage.setItem('themeEditorActive', JSON.stringify({ name: 'custom' }));
			globalThis.localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});
		await page.evaluate(async () => {
			globalThis.showConfirm = () => Promise.resolve(true);
			globalThis.showAlert = () => Promise.resolve();
			globalThis.location.reload = () => {};
			const resetBtn = globalThis.document.getElementById('resetBtn');
			if (resetBtn) resetBtn.click();
		});
		await page.waitForTimeout(500);
		const result = await page.evaluate(() => {
			return {
				presets: globalThis.localStorage.getItem('themeEditorPresets'),
				active: globalThis.localStorage.getItem('themeEditorActive'),
				anim: globalThis.localStorage.getItem('startAnimConfig'),
			};
		});
		expect(result.presets).toBeNull();
		expect(result.active).toBeNull();
		expect(result.anim).toBeNull();
	});
	// Generated code ends here on 2026-10-30T00:00:00Z:
	// Generated code starts here on 2026-03-31T00:00:00Z:
	test('server sync endpoint validates anomalies and anomaliesUsed plausibility', async () => {
		const { onRequest } = await import('../../functions/api/sync.js');

		const makeReq = (body) => ({
			method: 'POST',
			url: 'https://example.com/api/sync',
			json: async () => body,
		});

		const validRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				anomalies: 500,
				anomaliesUsed: 10,
				userId: 'u12',
			}),
		});
		expect(validRes.status).toBe(200);

		const negativeAnomaliesRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				anomalies: -5,
				userId: 'u13',
			}),
		});
		expect(negativeAnomaliesRes.status).toBe(400);
		expect((await negativeAnomaliesRes.json()).error).toBe('implausible progress');

		const nonNumericAnomaliesRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				anomaliesUsed: 'invalid',
				userId: 'u14',
			}),
		});
		expect(nonNumericAnomaliesRes.status).toBe(400);
		expect((await nonNumericAnomaliesRes.json()).error).toBe('implausible progress');

		const implausibleAnomaliesRes = await onRequest({
			request: makeReq({
				totalRolls: 10,
				totalPlaytime: 100,
				anomalies: 99999999999,
				userId: 'u15',
			}),
		});
		expect(implausibleAnomaliesRes.status).toBe(400);
		expect((await implausibleAnomaliesRes.json()).error).toBe('implausible progress');
	});
	// Generated code ends here on 2026-03-31T00:00:00Z:

	// Generated code starts here on 2026-10-31T00:00:00Z:
	test('starmap cosmetic and void unlock keys are removed on resetInventory', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.evaluate(() => {
			globalThis.localStorage.setItem('cosmeticUnlock_star_trail', '1');
			globalThis.localStorage.setItem('voidUnlock_crystallized_unlock', '1');
			globalThis.localStorage.setItem('voidUnlock_shattered_unlock', '1');
		});
		await page.evaluate(async () => {
			globalThis.showConfirm = () => Promise.resolve(true);
			globalThis.showAlert = () => Promise.resolve();
			globalThis.location.reload = () => {};
			const resetBtn = globalThis.document.getElementById('resetBtn');
			if (resetBtn) resetBtn.click();
		});
		await page.waitForTimeout(500);
		const result = await page.evaluate(() => {
			return {
				starTrail: globalThis.localStorage.getItem('cosmeticUnlock_star_trail'),
				crystallized: globalThis.localStorage.getItem('voidUnlock_crystallized_unlock'),
				shattered: globalThis.localStorage.getItem('voidUnlock_shattered_unlock'),
			};
		});
		expect(result.starTrail).toBeNull();
		expect(result.crystallized).toBeNull();
		expect(result.shattered).toBeNull();
	});
	// Generated code ends here on 2026-10-31T00:00:00Z:
});
