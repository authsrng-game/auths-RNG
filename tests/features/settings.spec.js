/* global window, document */
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('window.applySettings updates savedSettings, applies visual styles, sets globals, and updates localStorage', async ({
	page,
}) => {
	await page.goto(BASE_URL);

	const res = await page.evaluate(async () => {
		await window.applySettings({
			legacyMode: true,
			compactMode: true,
			rawNumbers: true,
			rareThreshold: 5000,
		});

		const saved = window.savedSettings;
		const current = window.getCurrentSettings();
		const bodyClasses = {
			legacy: document.body.classList.contains('legacy-mode'),
			compact: document.body.classList.contains('compact-mode'),
		};
		const globals = {
			rawNumbers: window.rawNumbers,
			rareThreshold: window.rareThreshold,
		};
		const stored = JSON.parse(localStorage.getItem('userSettings') || '{}');

		return { saved, current, bodyClasses, globals, stored };
	});

	expect(res.saved.legacyMode).toBe(true);
	expect(res.saved.compactMode).toBe(true);
	expect(res.saved.rawNumbers).toBe(true);
	expect(res.saved.rareThreshold).toBe(5000);

	expect(res.current.legacyMode).toBe(true);
	expect(res.current.rawNumbers).toBe(true);
	expect(res.current.rareThreshold).toBe(5000);

	expect(res.bodyClasses.legacy).toBe(true);
	expect(res.bodyClasses.compact).toBe(true);

	expect(res.globals.rawNumbers).toBe(true);
	expect(res.globals.rareThreshold).toBe(5000);

	expect(res.stored.legacyMode).toBe(true);
	expect(res.stored.rawNumbers).toBe(true);
	expect(res.stored.rareThreshold).toBe(5000);
});
