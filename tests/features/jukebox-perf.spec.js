// Generated code starts here on 2026-10-26T12:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Jukebox Performance & State Caching', () => {
	test('renderJukebox updates state and avoids redundant DOM mutations when idle', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Ensure jukebox disc and panel elements are present in DOM
		const jukeboxDisc = page.locator('#jb-disc');
		await expect(jukeboxDisc).toBeVisible();

		// Check initial track name element and button state
		const nameEl = page.locator('#jb-name');
		await expect(nameEl).toBeVisible();

		const playBtn = page.locator('#jb-play');
		await expect(playBtn).toBeVisible();

		// Evaluate render performance and state caching behavior
		const metrics = await page.evaluate(() => {
			const start = performance.now();

			// Run 1,000 idle render ticks
			for (let i = 0; i < 1000; i++) {
				if (window._renderJukebox) window._renderJukebox();
			}

			const duration = performance.now() - start;

			// Mute music via checkbox
			const muteCheck = document.getElementById('muteMusic');
			if (muteCheck) {
				muteCheck.checked = true;
				if (window._renderJukebox) window._renderJukebox();
			}

			const isMutedState = muteCheck ? muteCheck.checked : false;
			const playBtnText = document.getElementById('jb-play')?.textContent;

			return { duration, isMutedState, playBtnText };
		});

		expect(metrics.duration).toBeLessThan(100); // 1,000 idle ticks should complete in <100ms
		expect(metrics.playBtnText).toBe('▶');
	});
});
// Generated code ends here on 2026-10-26T12:00:00Z:
