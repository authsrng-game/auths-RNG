/* global window */
// Generated code starts here on 2026-11-05T13:30:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Mutation trust delta reward and penalty calculation', () => {
	test('calculates tiered trust rewards and penalties across rarity boundary gaps', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('startAnimConfig', '{"enabled":false}');
		});
		await page.goto(BASE_URL);

		const deltas = await page.evaluate(() => {
			const ms = window.MutationSystem;
			return {
				// successful mutations (better - resultIdx): gap >= 50, gap >= 15, gap < 15
				goodHigh: ms.getTrustDelta(true, 10, 60, 80),
				goodMid: ms.getTrustDelta(true, 45, 60, 70),
				goodLow: ms.getTrustDelta(true, 55, 60, 65),
				// input pair symmetry: math.min(idxA, idxB) regardless of argument order
				goodOrderSwapped: ms.getTrustDelta(true, 10, 80, 60),
				// failed mutations (resultIdx - worse): gap >= 30, gap >= 10, gap < 10
				badHigh: ms.getTrustDelta(false, 90, 50, 60),
				badMid: ms.getTrustDelta(false, 70, 50, 60),
				badLow: ms.getTrustDelta(false, 65, 50, 60),
				badOrderSwapped: ms.getTrustDelta(false, 90, 60, 50),
			};
		});

		expect(deltas.goodHigh).toBe(16);
		expect(deltas.goodMid).toBe(8);
		expect(deltas.goodLow).toBe(4);
		expect(deltas.goodOrderSwapped).toBe(16);
		expect(deltas.badHigh).toBe(-7);
		expect(deltas.badMid).toBe(-5);
		expect(deltas.badLow).toBe(-2);
		expect(deltas.badOrderSwapped).toBe(-7);
	});
});
// Generated code ends here on 2026-11-05T13:30:00Z:
