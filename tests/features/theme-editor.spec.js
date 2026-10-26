/* global document, window */
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('Theme Editor undo history and custom script import safety', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('seenLegalConsent', '1');
	});
	await page.goto(BASE_URL);

	await page.evaluate(() => document.getElementById('openThemeEditorBtn').click());

	expect(await page.evaluate(() => document.getElementById('te-undo').disabled)).toBe(true);

	await page.evaluate(() => {
		const el = document.getElementById('te-bgColor');
		el.value = '#123456';
		el.dispatchEvent(new Event('change', { bubbles: true }));
	});

	expect(await page.evaluate(() => !document.getElementById('te-undo').disabled)).toBe(true);
	await page.evaluate(() => document.getElementById('te-undo').click());
	expect(await page.evaluate(() => document.getElementById('te-bgColor').value)).not.toBe(
		'#123456'
	);

	const themeData = JSON.stringify({
		name: 'custom-anim',
		vars: {},
		settings: { startAnim: { preset: 'custom', customCode: 'alert(1)' } },
	});

	await page.evaluate((json) => {
		window.showPrompt = async () => json;
		window.showConfirm = async (msg) => (window._confirmMsg = msg);
	}, themeData);

	await page.evaluate(() => document.getElementById('importThemeBtn').click());
	const confirmMsg = await page.evaluate(() => window._confirmMsg);
	expect(confirmMsg).toContain('custom start animation script');
});
