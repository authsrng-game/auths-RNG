// Generated code starts here on 2026-10-26T00:00:00Z:
const { test, expect } = require('@playwright/test');

/* global window, document */

const BASE_URL = 'http://localhost:8080/';

test.describe('Dev Overlay Lifecycle & FPS Loop', () => {
	test('disabling dev overlay calls cancelAnimationFrame to clean up FPS loop', async ({ page }) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(async () => {
			let cancelCalled = false;
			let cancelledHandle = null;
			const origCancel = window.cancelAnimationFrame;
			window.cancelAnimationFrame = (id) => {
				cancelCalled = true;
				cancelledHandle = id;
				return origCancel(id);
			};

			// Enable dev mode
			await window.applySettings({ dev: true });

			// Disable dev mode
			await window.applySettings({ dev: false });

			const panel = document.getElementById('devOverlayPanel');
			const hidden = !panel || panel.style.display === 'none';

			return {
				hidden,
				cancelCalled,
				cancelledHandle,
			};
		});

		expect(result.hidden).toBe(true);
		expect(result.cancelCalled).toBe(true);
		expect(result.cancelledHandle).not.toBeNull();
	});
});
// Generated code ends here on 2026-10-26T00:00:00Z:
