/* eslint-disable no-undef */
// Generated code starts here on 2026-03-31T23:00:00Z:
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('system notifications system', () => {
	test('renders messages sorted by timestamp, escapes HTML, tracks unread counts, and clears on logout', async ({
		page,
	}) => {
		await page.route(
			'https://accounts.authsrng.xyz/api/accounts/system-messages',
			async (route) => {
				const req = route.request();
				if (req.method() === 'GET') {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							messages: [
								{
									id: 'msg-1',
									from: 'Admin',
									subject: 'Welcome',
									body: 'Old msg',
									ts: 1000,
									read: true,
								},
								{
									id: 'msg-2',
									from: '<script>alert("xss")</script>',
									subject: '<b>Alert</b>',
									body: 'New msg',
									ts: 2000,
									read: false,
								},
							],
						}),
					});
				} else {
					await route.continue();
				}
			}
		);

		await page.route(
			'https://accounts.authsrng.xyz/api/accounts/system-messages/*/read',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ ok: true }),
				});
			}
		);

		await page.addInitScript(() => {
			localStorage.setItem('seenLegalConsent', '1');
			localStorage.setItem('seenReleaseTag', 'v9.7');
			localStorage.setItem('authToken', 'test-token');
		});

		await page.goto(BASE_URL);

		await page.waitForSelector('#notifList .sysmsg-item');

		const stateAfterLoad = await page.evaluate(() => {
			const items = Array.from(document.querySelectorAll('#notifList .sysmsg-item'));
			const emptyDisp = window.getComputedStyle(document.getElementById('notifEmpty')).display;
			return {
				unreadCount: window.getSystemUnread(),
				emptyDisplay: emptyDisp,
				itemIds: items.map((el) => el.dataset.id),
				firstFromHtml: items[0].querySelector('.sysmsg-from').innerHTML,
				firstFromText: items[0].querySelector('.sysmsg-from').textContent,
				firstHasUnreadClass: items[0].classList.contains('unread'),
			};
		});

		expect(stateAfterLoad.unreadCount).toBe(1);
		expect(stateAfterLoad.emptyDisplay).toBe('none');
		expect(stateAfterLoad.itemIds).toEqual(['msg-2', 'msg-1']);
		expect(stateAfterLoad.firstHasUnreadClass).toBe(true);
		expect(stateAfterLoad.firstFromHtml).toContain('&lt;script&gt;');
		expect(stateAfterLoad.firstFromText).toBe('<script>alert("xss")</script>');

		await page.evaluate(() => {
			document.querySelector('#notifList .sysmsg-item.unread').click();
		});

		await page.waitForFunction(() => window.getSystemUnread() === 0);

		const unreadCountAfterClick = await page.evaluate(() => window.getSystemUnread());
		expect(unreadCountAfterClick).toBe(0);

		await page.evaluate(() => {
			localStorage.removeItem('authToken');
			document.dispatchEvent(new CustomEvent('authchange'));
		});

		const stateAfterLogout = await page.evaluate(() => ({
			unreadCount: window.getSystemUnread(),
			itemCount: document.querySelectorAll('#notifList .sysmsg-item').length,
		}));

		expect(stateAfterLogout.unreadCount).toBe(0);
		expect(stateAfterLogout.itemCount).toBe(0);
	});
});
// Generated code ends here on 2026-03-31T23:00:00Z:
