const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('auths-RNG smoke tests', () => {
	test('index.html returns 200', async ({ page }) => {
		const res = await page.goto(BASE_URL);
		expect(res.status()).toBe(200);
	});

	test('no uncaught JS errors on load', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (err) => {
			if (!err.message.includes('Failed to fetch')) {
				errors.push(err.message);
			}
		});
		await page.goto(BASE_URL);
		await page.waitForTimeout(3000);
		expect(errors).toHaveLength(0);
	});

	test('no failed network requests', async ({ page }) => {
		const failed = [];
		page.on('response', (res) => {
			if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
		});
		await page.goto(BASE_URL);
		await page.waitForTimeout(2000);
		expect(failed).toHaveLength(0);
	});

	test('inventory list exists', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#inventoryList')).toBeAttached();
	});

	test('total rolls counter exists', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.locator('#totalRolls')).toBeAttached();
	});

	test('404 page loads', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/404.html`);
		expect(res.status()).toBe(200);
	});

	test('overrides.css loads', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/assets/scripts/styles/overrides.css`);
		expect(res.status()).toBe(200);
	});

	test('manifest.json is valid JSON', async ({ page }) => {
		const res = await page.goto(`${BASE_URL}/manifest.json`);
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(() => JSON.parse(body)).not.toThrow();
	});

	// Generated code starts here on 2026-06-18T00:28:00Z:
	test('devOverlayPanel is a singleton', async ({ page }) => {
		await page.goto(BASE_URL);
		const count = await page.evaluate(() => {
			/* global document */
			return document.querySelectorAll('#devOverlayPanel').length;
		});
		expect(count).toBe(1);
	});
	// Generated code ends here on 2026-06-18T00:28:00Z:

	// Generated code starts here on 2026-06-18T01:00:00Z:
	test('FortuneBank balance does not double-decay on multiple reads', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			/* global window */
			const bank = new window.FortuneBank();
			const startTime = 1000000;
			for (let i = 0; i < 300; i++) {
				bank.deposit(startTime);
			}
			const initialBalance = bank.serialize().balance;

			const oneHourLater = startTime + 3600000;
			const origNow = Date.now;
			Date.now = () => oneHourLater;

			const balance1 = bank.balance();
			const balance2 = bank.balance();
			const balance3 = bank.balance();

			Date.now = origNow;

			return { initialBalance, balance1, balance2, balance3 };
		});

		expect(result.balance1).toBeCloseTo(result.initialBalance - 1 / 12, 5);
		expect(result.balance2).toBe(result.balance1);
		expect(result.balance3).toBe(result.balance1);
	});
	// Generated code ends here on 2026-06-18T01:00:00Z:

	// Generated code starts here on 2026-06-18T01:10:00Z:
	test('StreakTracker deserializes dryRuns values as numbers', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const tracker = new window.StreakTracker();
			tracker.deserialize({
				dryRuns: { Rare: '5' },
			});
			tracker.record(1, 'Rare', false);
			return tracker.serialize().dryRuns.Rare;
		});

		expect(result).toBe(6);
	});
	// Generated code ends here on 2026-06-18T01:10:00Z:

	// Generated code starts here on 2026-06-18T01:30:00Z:
	test('PityTracker deserializes counters and mastery values as numbers', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const tracker = new window.PityTracker();
			tracker.deserialize({
				counters: { Common: '5' },
				mastery: { Common: '0.0015' },
			});
			tracker.increment('Common');
			return {
				counter: tracker.get('Common'),
				counterType: typeof tracker.get('Common'),
				mastery: tracker.getMastery('Common'),
				masteryType: typeof tracker.getMastery('Common'),
			};
		});

		expect(result.counter).toBe(6);
		expect(result.counterType).toBe('number');
		expect(result.mastery).toBe(0.0015);
		expect(result.masteryType).toBe('number');
	});
	// Generated code ends here on 2026-06-18T01:30:00Z:

	// Generated code starts here on 2026-06-18T02:00:00Z:
	test('MomentumTracker deserializes combo, lastRollAt and peakCombo as numbers', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const tracker = new window.MomentumTracker();
			const now = 10000;
			tracker.deserialize({
				combo: '5',
				lastRollAt: '9000',
				peakCombo: '5',
			});
			tracker.record(now);
			return {
				combo: tracker.combo(),
				comboType: typeof tracker.combo(),
				serialized: tracker.serialize(),
			};
		});

		expect(result.combo).toBe(6);
		expect(result.comboType).toBe('number');
		expect(result.serialized.combo).toBe(6);
		expect(result.serialized.lastRollAt).toBe(10000);
	});

	test('ResistanceTracker deserializes active cooldowns as numbers', async ({ page }) => {
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			const tracker = new window.ResistanceTracker();
			tracker.deserialize({
				Legendary: '10',
			});
			return {
				remaining: tracker.remaining('Legendary'),
				remainingType: typeof tracker.remaining('Legendary'),
			};
		});

		expect(result.remaining).toBe(10);
		expect(result.remainingType).toBe('number');
	});
	// Generated code ends here on 2026-06-18T02:00:00Z:

	// Generated code starts here on 2026-06-18T03:00:00Z:
	test('doubleClover rune upgrade correctly increases state anomalies variable', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('runesUnlocked', '1');
			localStorage.setItem('runeBlocks', '100000');
		});
		await page.goto(BASE_URL);
		const result = await page.evaluate(() => {
			/* global anomalies */
			const initialAnomalies = typeof anomalies !== 'undefined' ? anomalies : null;
			if (typeof window.renderRunes === 'function') {
				window.renderRunes();
			}
			const buyBtn = document.querySelector('.rune-buy-btn[data-key="doubleClover"]');
			if (buyBtn) buyBtn.click();

			const updatedAnomalies = typeof anomalies !== 'undefined' ? anomalies : null;
			const windowAnomalies = window.anomalies;
			const savedAnomalies = localStorage.getItem('anomalies');

			return { initialAnomalies, updatedAnomalies, windowAnomalies, savedAnomalies };
		});

		expect(result.updatedAnomalies).toBe(result.initialAnomalies + 50000000);
		expect(result.windowAnomalies).toBeUndefined();
		expect(result.savedAnomalies).toBe(String(result.initialAnomalies + 50000000));
	});
	// Generated code ends here on 2026-06-18T03:00:00Z:

	// Generated code starts here on 2026-09-21T12:55:00Z:
	test('updateActivePotionsDisplay handles missing or custom potionData safely and shows correct multiplier', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (err) => {
			if (!err.message.includes('Failed to fetch')) {
				errors.push(err.message);
			}
		});

		await page.addInitScript(() => {
			const futureTime = Date.now() + 60000;
			localStorage.setItem(
				'activePotions',
				JSON.stringify({
					active: [{ type: '_g_easy', endTime: futureTime, multiplier: 2.5 }],
					duplicateLeft: 0,
				})
			);
		});

		await page.goto(BASE_URL);

		const text = await page.locator('#activePotionsList').innerText();
		expect(errors).toHaveLength(0);
		expect(text).toContain('2.5x luck');
	});
	// Generated code ends here on 2026-09-21T12:55:00Z:

	// Generated code starts here on 2026-06-18T14:00:00Z:
	test('Cloud Backup displays correct date for ISO timestamp strings', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('cloudBackupEnabled', 'true');
			localStorage.setItem('lastCloudBackup', '2026-06-18T12:34:56.000Z');
		});

		await page.goto(BASE_URL);

		const text = await page.evaluate(() => {
			localStorage.setItem('cloudBackupEnabled', 'true');
			localStorage.setItem('lastCloudBackup', '2026-06-18T12:34:56.000Z');
			window.AuthAccount = { isLoggedIn: () => true };
			document.dispatchEvent(new CustomEvent('authchange'));
			return document.getElementById('cloudLastBackup')?.innerText || '';
		});

		expect(text).not.toContain('1970');
		expect(text).toContain('2026');
	});
	// Generated code ends here on 2026-06-18T14:00:00Z:

	// Generated code starts here on 2026-06-18T15:00:00Z:
	test('Leaderboard submit correctly parses array-formatted rarityInventory', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'rarityInventory',
				JSON.stringify([
					{ name: 'Common', chance: 0.5, count: 10 },
					{ name: 'Rare', chance: 0.01, count: 2 },
				])
			);
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			if (!window.LeaderboardSubmit) return null;
			const payload = window.LeaderboardSubmit.buildPayload();
			const rarest = window.LeaderboardSubmit.getRarest();
			return { payload, rarest };
		});

		expect(result).not.toBeNull();
		expect(result.payload.rarities).toBe(12);
		expect(result.rarest.name).toBe('Rare');
		expect(result.rarest.denom).toBe(100);
	});
	// Generated code ends here on 2026-06-18T15:00:00Z:

	// Generated code starts here on 2026-09-22T00:00:00Z:
	test('renderHistory escapes HTML characters in rarity names in mutation log', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('mutationsUnlocked', '1');
			localStorage.setItem(
				'rarityInventory',
				JSON.stringify([
					{ name: 'Common', chance: 0.5, count: 1 },
					{ name: 'Uncommon', chance: 0.25, count: 1 },
				])
			);
			localStorage.setItem(
				'mutationHistory',
				JSON.stringify([
					{
						a: '<b id="injectedA">test</b>',
						b: 'Common',
						result: '<b id="injectedRes">test</b>',
						good: true,
						ts: Date.now(),
					},
				])
			);
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			if (typeof window.renderMutations === 'function') {
				window.renderMutations();
			}
			const injectedA = !!document.getElementById('injectedA');
			const injectedRes = !!document.getElementById('injectedRes');
			const formula = document.querySelector('.mh-formula')?.innerHTML || '';
			const resText = document.querySelector('.mh-result')?.innerHTML || '';
			return { injectedA, injectedRes, formula, resText };
		});

		expect(result.injectedA).toBe(false);
		expect(result.injectedRes).toBe(false);
		expect(result.formula).toContain('&lt;b id="injectedA"&gt;test&lt;/b&gt;');
		expect(result.resText).toContain('&lt;b id="injectedRes"&gt;test&lt;/b&gt;');
	});
	// Generated code ends here on 2026-09-22T00:00:00Z:

	// Generated code starts here on 2026-09-25T12:46:00Z:
	test('auto-mutate upgrade uses MutationSystem methods and executes without errors', async ({ page }) => {
		const pageErrors = [];
		page.on('pageerror', (err) => {
			if (!err.message.includes('Failed to fetch')) {
				pageErrors.push(err.message);
			}
		});

		await page.addInitScript(() => {
			localStorage.setItem('mutationsUnlocked', '1');
			localStorage.setItem('mutationTrustOwned', JSON.stringify(['upgrade_automutate']));
			localStorage.setItem(
				'rarityInventory',
				JSON.stringify([
					{ name: 'Common', chance: 0.5, count: 5 },
					{ name: 'Uncommon', chance: 0.25, count: 5 },
				])
			);
		});

		await page.goto(BASE_URL);

		const result = await page.evaluate(() => {
			if (!window.MutationSystem) return { hasSystem: false };

			const initialHistory = JSON.parse(localStorage.getItem('mutationHistory') || '[]');
			const ms = window.MutationSystem;
			const inv = ms.getInventoryRarities();
			if (!inv || inv.length < 2) return { invLength: inv ? inv.length : 0 };

			const a = inv[0];
			const b = inv[1];
			const res = ms.mutate(a.name, b.name);
			if (res) {
				const idxA = ms.getRarityIndex(a.name);
				const idxB = ms.getRarityIndex(b.name);
				const resIdx = ms.getRarityIndex(res.name);
				const wasGood = resIdx < Math.min(idxA, idxB);
				const delta = ms.getTrustDelta(wasGood, resIdx, idxA, idxB);
				ms.addTrust(delta);
				ms.addToHistory(a.name, b.name, res, wasGood);
			}

			const updatedHistory = JSON.parse(localStorage.getItem('mutationHistory') || '[]');
			return {
				hasSystem: true,
				hasMutate: typeof ms.mutate === 'function',
				historyAdded: updatedHistory.length > initialHistory.length,
			};
		});

		expect(pageErrors).toHaveLength(0);
		expect(result.hasSystem).toBe(true);
		expect(result.hasMutate).toBe(true);
		expect(result.historyAdded).toBe(true);
	});
	// Generated code ends here on 2026-09-25T12:46:00Z:
	// Generated code starts here on 2026-06-18T16:00:00Z:
	test('system-notify render does not duplicate sysmsg-item elements in notifList', async ({ page }) => {
		await page.goto(BASE_URL);

		const result = await page.evaluate(async () => {
			const origFetch = window.fetch;
			window.fetch = async (url, opts) => {
				if (typeof url === 'string' && url.includes('/system-messages')) {
					return {
						ok: true,
						json: async () => ({
							messages: [
								{ id: '1', from: 'System', subject: 'Hello', body: 'World', ts: Date.now(), read: false },
							],
						}),
					};
				}
				return origFetch(url, opts);
			};

			window.AuthAccount = {
				isLoggedIn: () => true,
				getToken: () => 'fake-token',
			};

			document.dispatchEvent(new CustomEvent('authchange'));
			await new Promise((resolve) => setTimeout(resolve, 200));

			const countFirstRender = document.querySelectorAll('.sysmsg-item').length;

			document.dispatchEvent(new CustomEvent('authchange'));
			await new Promise((resolve) => setTimeout(resolve, 200));

			const countSecondRender = document.querySelectorAll('.sysmsg-item').length;

			return { countFirstRender, countSecondRender };
		});

		expect(result.countFirstRender).toBe(1);
		expect(result.countSecondRender).toBe(1);
	});
	// Generated code ends here on 2026-06-18T16:00:00Z:
});
