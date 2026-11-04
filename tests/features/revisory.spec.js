/* global window */
// Generated code starts here on 2026-11-02T13:40:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('revisory core state transition and quarantine', () => {
	test('quarantines catastrophic key loss and recovers via additive merge', async ({ page }) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(async () => {
			window.localStorage.setItem('totalRolls', '1000');
			window.localStorage.setItem('shopPoints', '5000');
			window.localStorage.setItem('totalPlaytime', '3000');
			window.localStorage.setItem('userSettings', '{}');
			const rev1 = await window.Revisory.createRevisionFromCurrentState('test_init');

			const badSnap = { totalRolls: '1005' };
			const evalLoss = await window.Revisory.evaluateIncoming(badSnap, { parentId: rev1.id });
			const ingestBad = await window.Revisory.ingestSync(badSnap, { parentId: rev1.id });
			const qList = await window.Revisory.listQuarantine(false);

			const resolved = await window.Revisory.resolveQuarantine(
				ingestBad.quarantineId,
				'merge_additive'
			);

			return {
				evalClassification: evalLoss.classification,
				applied: ingestBad.applied,
				quarantineCount: qList.length,
				resolvedAction: resolved.action,
				rolls: window.localStorage.getItem('totalRolls'),
				points: window.localStorage.getItem('shopPoints'),
			};
		});

		expect(result.evalClassification).toBe('catastrophic_overwrite');
		expect(result.applied).toBe(false);
		expect(result.quarantineCount).toBe(1);
		expect(result.resolvedAction).toBe('merged_additive');
		expect(result.rolls).toBe('1005');
		expect(result.points).toBe('5000');
	});
});
// Generated code ends here on 2026-11-02T13:40:00Z:
