/* global document */
// Generated code starts here on 2026-10-27T13:25:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('HTMLSelectElement Property Patching', () => {
	test('programmatic value and selectedIndex dispatches change event only when changed', async ({
		page,
	}) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const select = document.createElement('select');
			select.innerHTML = '<option value="a">A</option><option value="b">B</option>';
			document.body.appendChild(select);
			let valueEvents = 0,
				indexEvents = 0;
			select.addEventListener('change', () => {
				if (select.value === 'b') valueEvents++;
				if (select.selectedIndex === 1) indexEvents++;
			});

			select.value = 'b'; // 1st update -> fires event
			select.value = 'b'; // identical -> no event
			select.selectedIndex = 0; // index change -> fires event
			select.selectedIndex = 0; // identical -> no event
			select.remove();
			return { valueEvents, indexEvents };
		});

		expect(result.valueEvents).toBe(1);
		expect(result.indexEvents).toBe(1);
	});
});
// Generated code ends here on 2026-10-27T13:25:00Z:
