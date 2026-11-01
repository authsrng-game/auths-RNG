/* global window */
// Generated code starts here on 2026-11-01T13:35:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('LeaderboardSubmit computes rarest items and builds valid submission payload', async ({
	page,
}) => {
	await page.goto(BASE_URL);
	const res = await page.evaluate(() => {
		const { getRarest, buildPayload } = window.LeaderboardSubmit;
		const empty = getRarest([]);
		const byDenom = getRarest([
			{ name: 'A', denom: 2 },
			{ name: 'B', denom: 50 },
		]);
		const byChance = getRarest([
			{ name: 'A', chance: 0.5 },
			{ name: 'C', chance: 0.001 },
		]);

		localStorage.setItem('totalRolls', '150');
		localStorage.setItem('totalPlaytime', '3600');
		localStorage.setItem('shopPoints', '420');
		localStorage.setItem('achievementsUnlocked', JSON.stringify(['rich']));
		localStorage.setItem(
			'rarityInventory',
			JSON.stringify([
				{ name: 'A', count: 10, denom: 2 },
				{ name: 'B', count: 2, denom: 50 },
			])
		);
		return { empty, byDenom, byChance, payload: buildPayload() };
	});

	expect(res.empty).toEqual({ name: null, denom: 0 });
	expect(res.byDenom).toEqual({ name: 'B', denom: 50 });
	expect(res.byChance).toEqual({ name: 'C', denom: 1000 });
	expect(res.payload).toEqual({
		rolls: 150,
		rarities: 12,
		rarestName: 'B',
		rarestDenom: 50,
		playtime: 3600,
		points: 420,
		achievements: ['rich'],
	});
});
// Generated code ends here on 2026-11-01T13:35:00Z:
