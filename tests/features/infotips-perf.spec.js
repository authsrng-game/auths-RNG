// Generated code starts here on 2026-10-27T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';

test.describe('Infotips System Performance & State Caching', () => {
	test('_scanInfoTips executes efficiently and maintains correct icon display state', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		// Verify info-tip icons exist for page elements
		const anomalyCount = page.locator('#anomalyCount');
		await expect(anomalyCount).toBeVisible();

		// Run performance check on _scanInfoTips
		const metrics = await page.evaluate(() => {
			const start = performance.now();

			// Run 1,000 scan iterations
			for (let i = 0; i < 1000; i++) {
				if (window._scanInfoTips) window._scanInfoTips();
			}

			const duration = performance.now() - start;

			// Verify tooltip icons are present
			const tips = document.querySelectorAll('.info-tip');
			const visibleTips = Array.from(tips).filter((t) => t.style.display !== 'none');

			return { duration, tipCount: tips.length, visibleCount: visibleTips.length };
		});

		// 1,000 scan cycles should finish well under 100ms with cached containers and guarded style assignments
		expect(metrics.duration).toBeLessThan(100);
		expect(metrics.tipCount).toBeGreaterThan(0);
		expect(metrics.visibleCount).toBeGreaterThan(0);
	});
});
// Generated code ends here on 2026-10-27T00:00:00Z:
