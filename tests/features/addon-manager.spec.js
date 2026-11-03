/* global document, window */
// Generated code starts here on 2026-03-31T14:00:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('AddonManager tracks installation, uninstallation, limit, and events', async ({ page }) => {
	await page.goto(BASE_URL);

	const result = await page.evaluate(async () => {
		const mgr = window.AddonManager;
		localStorage.removeItem('installedAddonIds');
		let events = 0;
		document.addEventListener('addonPendingChange', () => events++);

		const installed = mgr.install({ id: 'addon-1' });
		const hasPending = mgr.hasPendingChanges();

		const fill = Array.from({ length: 20 }, (_, i) => `addon-${i + 1}`);
		localStorage.setItem('installedAddonIds', JSON.stringify(fill));
		const blocked = mgr.install({ id: 'addon-21' });

		await new Promise((r) => setTimeout(r, 450));
		const uninstalled = mgr.uninstall('addon-1');
		const isStillInstalled = mgr.isInstalled('addon-1');

		return { installed, hasPending, blocked, uninstalled, isStillInstalled, events };
	});

	expect(result.installed).toBe(true);
	expect(result.hasPending).toBe(true);
	expect(result.blocked).toBe(false);
	expect(result.uninstalled).toBe(true);
	expect(result.isStillInstalled).toBe(false);
	expect(result.events).toBe(2);
});
// Generated code ends here on 2026-03-31T14:00:00Z:
