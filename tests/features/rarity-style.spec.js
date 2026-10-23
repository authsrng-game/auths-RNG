/* eslint-disable no-undef */
// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('window.RarityStyle parses DSL into AST commands and applies styles with cancellation', async ({
	page,
}) => {
	await page.goto(BASE_URL);
	const res = await page.evaluate(() => {
		const dsl = '-- comment\ncolor: #ff0000\nwait: 10\ncolor: #00ff00';
		const ast1 = window.RarityStyle.parse(dsl);
		const ast2 = window.RarityStyle.parse(dsl);

		const el = document.createElement('div');
		window.RarityStyle.apply(el, 'color: #ff0000');
		const initialColor = el.style.color;

		const ac = window.RarityStyle.apply(el, 'color: #00ff00\nwait: 10\ncolor: #0000ff');
		const activeColor = el.style.color;
		ac.abort();

		return {
			cached: ast1 === ast2,
			ast: ast1,
			initialColor,
			activeColor,
		};
	});

	expect(res.cached).toBe(true);
	expect(res.ast).toEqual([
		{ type: 'color', hex: '#ff0000' },
		{ type: 'wait', seconds: 10 },
		{ type: 'color', hex: '#00ff00' },
	]);
	expect(res.initialColor).toBe('rgb(255, 0, 0)');
	expect(res.activeColor).toBe('rgb(0, 255, 0)');
});
// Generated code ends here on 2026-03-31T00:00:00Z:
