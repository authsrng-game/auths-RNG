// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window */

const BASE_URL = 'http://localhost:8080/';

test.describe('MutationSystem getTrustDelta calculation', () => {
	test('calculates correct trust delta across good/bad gap boundaries and input ordering', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const results = await page.evaluate(() => {
			const fn = window.MutationSystem.getTrustDelta;
			return {
				// Good mutation boundaries (better = min(idxA, idxB))
				goodMajorGain: fn(true, 10, 60, 80), // gap = 50 -> 16
				goodMidGain: fn(true, 45, 60, 80), // gap = 15 -> 8
				goodMinorGain: fn(true, 46, 60, 80), // gap = 14 -> 4
				orderInvarianceGood: fn(true, 10, 80, 60), // order flipped -> 16

				// Bad mutation boundaries (worse = max(idxA, idxB))
				badMajorLoss: fn(false, 110, 60, 80), // gap = 30 -> -7
				badMidLoss: fn(false, 90, 60, 80), // gap = 10 -> -5
				badMinorLoss: fn(false, 89, 60, 80), // gap = 9 -> -2
				orderInvarianceBad: fn(false, 110, 80, 60), // order flipped -> -7
			};
		});

		expect(results.goodMajorGain).toBe(16);
		expect(results.goodMidGain).toBe(8);
		expect(results.goodMinorGain).toBe(4);
		expect(results.orderInvarianceGood).toBe(16);

		expect(results.badMajorLoss).toBe(-7);
		expect(results.badMidLoss).toBe(-5);
		expect(results.badMinorLoss).toBe(-2);
		expect(results.orderInvarianceBad).toBe(-7);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
