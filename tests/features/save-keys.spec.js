/* eslint-disable no-undef */
// Generated code starts here on 2026-10-21T13:20:02Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('window.SaveKeys classifies keys, identifies volatile entries, and collects save state', async ({
	page,
}) => {
	await page.goto(BASE_URL);
	const res = await page.evaluate(() => {
		const { isSaveKey, isVolatile, collect } = window.SaveKeys;
		localStorage.clear();
		localStorage.setItem('totalRolls', '42');
		localStorage.setItem('voidUnlock_secret', 'true');
		localStorage.setItem('seenLegalConsent', '1');

		return {
			staticKey: isSaveKey('totalRolls'),
			voidPrefix: isSaveKey('voidUnlock_abyssal'),
			cosmeticPrefix: isSaveKey('cosmeticUnlock_sparkle'),
			nonSave: isSaveKey('seenLegalConsent') || isSaveKey(null) || isSaveKey(123),
			volatile: isVolatile('totalPlaytime') && !isVolatile('totalRolls'),
			collected: collect(),
		};
	});

	expect(res.staticKey).toBe(true);
	expect(res.voidPrefix).toBe(true);
	expect(res.cosmeticPrefix).toBe(true);
	expect(res.nonSave).toBe(false);
	expect(res.volatile).toBe(true);
	expect(res.collected).toEqual({ totalRolls: '42', voidUnlock_secret: 'true' });
});
// Generated code ends here on 2026-10-21T13:20:02Z:
