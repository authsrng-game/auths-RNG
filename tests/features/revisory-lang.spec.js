/* global window */
// Generated code starts here on 2026-03-31T00:00:00Z:
const { test, expect } = require('@playwright/test');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('RevisoryLang interpreter runtime execution', () => {
	test('evaluates variable binding, arithmetic, control flow, functions, and pipelines', async ({
		page,
	}) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(async () => {
			const script = `
				$total = 0
				func accumulate($items) {
					for $x in $items {
						if ($x % 2 == 0) {
							$total = $total + $x
						}
					}
					return $total
				}
				[1, 2, 3, 4, 5, 6] | accumulate()
			`;
			const builtins = {
				len: (arr) => (arr ? arr.length : 0),
			};
			const evaluated = await window.RevisoryLang.run(script, builtins);
			const pipeEval = await window.RevisoryLang.run('[10, 20, 30] | len()', builtins);
			return { evaluated, pipeEval };
		});

		expect(result.evaluated).toBe(12); // 2 + 4 + 6 = 12
		expect(result.pipeEval).toBe(3);
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
