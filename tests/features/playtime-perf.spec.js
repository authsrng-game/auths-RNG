// Generated code starts here on 2026-11-08T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global document, window, Node */

const BASE_URL = 'http://localhost:8080/';

test.describe('Playtime Display Performance & Storage Flushing', () => {
	test('updatePlaytimeDisplay updates display efficiently and saveAllData flushes playtime', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			if (window.self !== window.top) return;
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
			localStorage.setItem('totalPlaytime', '120');
		});

		await page.goto(BASE_URL);

		// Verify initial display text
		const initialText = await page.evaluate(() => {
			const el = document.getElementById('playtimeDisplay');
			return el ? el.textContent : '';
		});
		expect(initialText).toContain('total playtime');

		// Verify saveAllData flushes current playtime to localStorage
		const initialPlaytime = await page.evaluate(() => {
			window.saveAllData();
			return localStorage.getItem('totalPlaytime');
		});
		expect(parseInt(initialPlaytime, 10)).toBeGreaterThanOrEqual(120);

		// Verify beforeunload flushes current playtime to localStorage
		const beforeUnloadPlaytime = await page.evaluate(() => {
			window.dispatchEvent(new Event('beforeunload'));
			return localStorage.getItem('totalPlaytime');
		});
		expect(parseInt(beforeUnloadPlaytime, 10)).toBeGreaterThanOrEqual(120);

		// Test state guard by spying on textContent property assignments
		const wasUpdatedInHiddenState = await page.evaluate(() => {
			const el = document.getElementById('playtimeDisplay');
			if (!el) return false;
			let setterCalled = false;
			const originalDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
			Object.defineProperty(el, 'textContent', {
				set(val) {
					setterCalled = true;
					originalDescriptor.set.call(this, val);
				},
				get() {
					return originalDescriptor.get.call(this);
				},
			});

			// Mock document.hidden = true and call updatePlaytimeDisplay
			Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
			window.updatePlaytimeDisplay();
			Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });

			return setterCalled;
		});

		expect(wasUpdatedInHiddenState).toBe(false);
	});
});
// Generated code ends here on 2026-11-08T00:00:00Z:
