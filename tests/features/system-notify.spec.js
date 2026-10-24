/* eslint-disable no-undef */
// Generated code starts here on 2026-03-31T12:00:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('window.renderSystemMessages sorts, escapes HTML, and tracks unread count', async ({ page }) => {
	await page.route('**/api/accounts/system-messages', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: JSON.stringify({
				messages: [
					{ id: '1', from: 'Admin', subject: '<b>Warn</b>', body: '<script>1</script>', ts: 100, read: false },
					{ id: '2', from: 'System', subject: 'New', body: 'Info', ts: 200, read: false },
				],
			}),
		})
	);
	await page.addInitScript(() => {
		if (window.self !== window.top) return;
		localStorage.setItem('authToken', 'test-token');
	});
	await page.goto(BASE_URL);

	await page.waitForFunction(() => window.getSystemUnread() === 2);
	expect(await page.evaluate(() => window.getSystemUnread())).toBe(2);

	const items = await page.evaluate(() =>
		Array.from(document.querySelectorAll('#notifList .sysmsg-item')).map((el) => ({
			id: el.dataset.id,
			subj: el.querySelector('.sysmsg-subject').textContent,
			xss: !document.querySelector('#notifList b'),
		}))
	);

	expect(items).toEqual([
		{ id: '2', subj: 'New', xss: true },
		{ id: '1', subj: '<b>Warn</b>', xss: true },
	]);

	await page.evaluate(() => window.AuthAccount.clearSession());
	await page.waitForFunction(() => window.getSystemUnread() === 0);
});
// Generated code ends here on 2026-03-31T12:00:00Z:
