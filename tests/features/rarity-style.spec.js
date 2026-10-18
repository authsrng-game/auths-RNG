/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('RarityStyle DSL Parser', () => {
	test('parses rarity style DSL into AST, handles comments, loops, edge cases, and caching', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const rs = window.RarityStyle;
			if (!rs || typeof rs.parse !== 'function') return { error: 'RarityStyle not loaded' };

			const empty = rs.parse('');
			const nullVal = rs.parse(null);
			const invalidStr = rs.parse('invalid_cmd_line\n-- comment line');

			const code = `-- header comment
color: #ff0000
switch color: #00ff00
transition color: #123456
pulse (0.5, 1, 0.5): #aabbcc
wait: 2.5
loop {
  color: #ffffff
}`;

			const ast1 = rs.parse(code);
			const ast2 = rs.parse(code);

			return {
				empty,
				nullVal,
				invalidStr,
				ast1,
				isSameRef: ast1 === ast2,
			};
		});

		expect(result.error).toBeUndefined();
		expect(result.empty).toEqual([]);
		expect(result.nullVal).toEqual([]);
		expect(result.invalidStr).toEqual([]);
		expect(result.isSameRef).toBe(true);
		expect(result.ast1).toEqual([
			{ type: 'color', hex: '#ff0000' },
			{ type: 'color', hex: '#00ff00' },
			{ type: 'transition', hex: '#123456' },
			{ type: 'pulse', fadeIn: 0.5, hold: 1, fadeOut: 0.5, hex: '#aabbcc' },
			{ type: 'wait', seconds: 2.5 },
			{ type: 'loop', body: [{ type: 'color', hex: '#ffffff' }] },
		]);
	});
});
