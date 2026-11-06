/* global window */
// Generated code starts here on 2026-11-06T10:14:48Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Mutations system error logging and observability', () => {
	test('logs a warning when mutationHistory contains corrupted JSON', async ({ page }) => {
		const warnings = [];
		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				warnings.push(msg.text());
			}
		});

		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('startAnimConfig', '{"enabled":false}');
			localStorage.setItem('mutationHistory', '{not valid json');
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			const ms = window.MutationSystem;
			if (!ms) return { error: 'MutationSystem not loaded' };
			return {
				trust: typeof ms.renderTrustBalance === 'function',
			};
		});

		expect(result.error).toBeUndefined();
		const hasExpectedWarning = warnings.some((w) =>
			w.includes('[mutations] failed to parse mutation history:')
		);
		expect(hasExpectedWarning).toBe(true);
	});
});
// Generated code ends here on 2026-11-06T10:14:48Z:
