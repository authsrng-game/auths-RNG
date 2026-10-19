// Generated code starts here on 2026-05-18T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, StorageEvent */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Check Mute Settings Performance & State Caching', () => {
	test('checkMuteSettings uses cached settings and updates accurately on settings change', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('startAnimConfig', JSON.stringify({ enabled: false }));
		});

		await page.goto(BASE_URL);

		const perfStats = await page.evaluate(async () => {
			const start1 = performance.now();
			for (let i = 0; i < 10000; i++) {
				window.checkMuteSettings?.();
			}
			const end1 = performance.now();

			if (window.applySettings) {
				await window.applySettings({ muted: true });
			} else {
				localStorage.setItem('userSettings', JSON.stringify({ muted: true }));
				window.dispatchEvent(new StorageEvent('storage', { key: 'userSettings' }));
			}

			const isMutedNow = window.checkMuteSettings?.();

			const start2 = performance.now();
			for (let i = 0; i < 10000; i++) {
				window.checkMuteSettings?.();
			}
			const end2 = performance.now();

			return {
				timeUnmuted: end1 - start1,
				timeMuted: end2 - start2,
				isMutedNow,
			};
		});

		expect(perfStats.isMutedNow).toBe(true);
		expect(perfStats.timeUnmuted).toBeLessThan(50);
		expect(perfStats.timeMuted).toBeLessThan(50);
	});
});
// Generated code ends here on 2026-05-18T00:00:00Z:
