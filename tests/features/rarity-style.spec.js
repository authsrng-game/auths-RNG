/* eslint-disable no-undef */
// Generated code starts here on 2026-11-03T00:00:00Z:
const { test, expect } = require('@playwright/test');

test.describe('RarityStyle DSL Parser', () => {
	test('parses commands, strips comments, and caches AST results', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
		});
		await page.goto(process.env.BASE_URL || 'http://localhost:8080/');

		const res = await page.evaluate(() => {
			const RS = window.RarityStyle;
			const src = '-- comment\ncolor: #ff0000\nswitch color: #00ff00\ntransition color: #0000ff\npulse(0.2,0.5,0.3): #123456\nwait: 1.5\nloop {\ncolor: #ffffff\n}';
			const p1 = RS.parse(src);
			const p2 = RS.parse(src);
			return { empty: RS.parse(''), nullVal: RS.parse(null), p1, same: p1 === p2 };
		});

		expect(res.empty).toEqual([]);
		expect(res.nullVal).toEqual([]);
		expect(res.same).toBe(true);
		expect(res.p1).toEqual([
			{ type: 'color', hex: '#ff0000' },
			{ type: 'color', hex: '#00ff00' },
			{ type: 'transition', hex: '#0000ff' },
			{ type: 'pulse', fadeIn: 0.2, hold: 0.5, fadeOut: 0.3, hex: '#123456' },
			{ type: 'wait', seconds: 1.5 },
			{ type: 'loop', body: [{ type: 'color', hex: '#ffffff' }] },
		]);
	});
});
// Generated code ends here on 2026-11-03T00:00:00Z:
