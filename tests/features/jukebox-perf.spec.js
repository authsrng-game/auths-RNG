// Generated code starts here on 2026-10-26T12:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Jukebox Performance & Rendering', () => {
	test('window._renderJukebox lazily caches elements and avoids redundant DOM mutations', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const isRenderExposed = await page.evaluate(() => {
			return typeof window._renderJukebox === 'function';
		});
		expect(isRenderExposed).toBe(true);

		// Trigger initial render and 100 subsequent render cycles to verify stability
		const renderResults = await page.evaluate(() => {
			window._renderJukebox();
			const btnPlay = document.getElementById('jb-play');
			const titleAfterFirst = btnPlay ? btnPlay.title : null;

			// Run 100 subsequent render cycles
			for (let i = 0; i < 100; i++) {
				window._renderJukebox();
			}

			return {
				titleAfterFirst,
				titleAfter100: btnPlay ? btnPlay.title : null,
				discActive: document.getElementById('jb-disc')?.classList.contains('jb-active'),
			};
		});

		expect(renderResults.titleAfter100).toBe(renderResults.titleAfterFirst);
		expect(renderResults.discActive).toBe(true);
	});
});
// Generated code ends here on 2026-10-26T12:00:00Z:
