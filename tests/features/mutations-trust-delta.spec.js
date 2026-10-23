/* eslint-disable no-undef */
// Generated code starts here on 2026-11-03T12:00:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test('MutationSystem.getTrustDelta calculates correct trust gains and losses across gap boundaries', async ({
	page,
}) => {
	await page.goto(BASE_URL);

	const res = await page.evaluate(() => {
		const fn = window.MutationSystem?.getTrustDelta;
		return {
			good50: fn(true, 10, 60, 80), // gap 50 => 16
			good49: fn(true, 11, 60, 80), // gap 49 => 8
			good15: fn(true, 45, 60, 80), // gap 15 => 8
			good14: fn(true, 46, 60, 80), // gap 14 => 4
			bad30: fn(false, 110, 60, 80), // gap 30 => -7
			bad29: fn(false, 109, 60, 80), // gap 29 => -5
			bad10: fn(false, 90, 60, 80), // gap 10 => -5
			bad9: fn(false, 89, 60, 80), // gap 9 => -2
			orderSwapped: fn(true, 10, 80, 60), // order swapped
		};
	});

	expect(res.good50).toBe(16);
	expect(res.good49).toBe(8);
	expect(res.good15).toBe(8);
	expect(res.good14).toBe(4);
	expect(res.bad30).toBe(-7);
	expect(res.bad29).toBe(-5);
	expect(res.bad10).toBe(-5);
	expect(res.bad9).toBe(-2);
	expect(res.orderSwapped).toBe(16);
});
// Generated code ends here on 2026-11-03T12:00:00Z:
