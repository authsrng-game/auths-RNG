'use strict';

(function () {
	// Generated code starts here on 2026-03-31T23:00:00Z:
	/**
	 * Registry and utilities for managing game save keys in `localStorage`.
	 *
	 * `SaveKeys` serves as the single source of truth for identifying game save data across
	 * local persistence, cloud backup sync (`sync.js`), backup envelopes (`cloud-backup.js`),
	 * and inventory resets (`main.js`).
	 *
	 * Key classifications:
	 * - `LIST`: Static registry of known `localStorage` keys belonging to game save state.
	 * - `PREFIXES`: Dynamic key prefixes (`voidUnlock_`, `cosmeticUnlock_`) for unlocked items.
	 * - `VOLATILE`: Rapidly changing keys (`totalPlaytime`, `activePotions`, etc.) excluded from
	 *   meaningful hash comparisons during sync debouncing to prevent excessive cloud pushes.
	 */
	// Generated code ends here on 2026-03-31T23:00:00Z:
	const LIST = [
		'rarityInventory',
		'totalRolls',
		'achievementsUnlocked',
		'anomalies',
		'anomaliesUsed',
		'shopPoints',
		'shopUpgrades',
		'soldOutRarities',
		'playerPotions',
		'activePotions',
		'wishingWell',
		'luckBoostState',
		'totalPlaytime',
		'daily_lastClaim',
		'daily_streak',
		'weekly_lastClaim',
		'weekly_streak',
		'gauntletData',
		'mutationsUnlocked',
		'starmapData',
		'starmapUnlocked',
		'runesData',
		'runesUnlocked',
		'runeBlocks',
		'runeGift',
		'runeUpgrades',
		'expeditionData',
		'expeditionsUnlocked',
		'dealerData',
		'dealerUnlocked',
		'catShrineUnlocked',
		'catShrineEquipped',
		'catShrineToggle',
		'mutationTrust',
		'mutationTrustOwned',
		'mutationTrustActive',
		'mutationHistory',
		'mutationBestResult',
		'rarityTimestamps',
		'notifications',
		'themeEditorPresets',
		'themeEditorActive',
		'startAnimConfig',
		'_plush_v3',
		'infoTipsRead',
	];
	const PREFIXES = ['voidUnlock_', 'cosmeticUnlock_'];
	const VOLATILE = new Set([
		'totalPlaytime',
		'activePotions',
		'luckBoostState',
		'_plush_v3',
		'notifications',
		'infoTipsRead',
		'rarityTimestamps',
	]);
	const SET = new Set(LIST);

	// Generated code starts here on 2026-03-31T23:00:00Z:
	/**
	 * Checks if a given string key corresponds to a tracked game save key.
	 *
	 * @param {string} k - The `localStorage` key name to check.
	 * @returns {boolean} True if the key is in `LIST` or starts with a registered dynamic prefix.
	 */
	// Generated code ends here on 2026-03-31T23:00:00Z:
	function isSaveKey(k) {
		if (typeof k !== 'string') return false;
		if (SET.has(k)) return true;
		for (let i = 0; i < PREFIXES.length; i++) if (k.startsWith(PREFIXES[i])) return true;
		return false;
	}

	// Generated code starts here on 2026-03-31T23:00:00Z:
	/**
	 * Collects all current game save key-value pairs present in `localStorage`.
	 *
	 * @returns {Record<string, string>} Object mapping matched save keys to their stored string values.
	 */
	// Generated code ends here on 2026-03-31T23:00:00Z:
	function collect() {
		const out = {};
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k !== null && isSaveKey(k)) {
				const v = Storage.prototype.getItem.call(localStorage, k);
				if (v !== null) out[k] = v;
			}
		}
		return out;
	}

	// Generated code starts here on 2026-03-31T23:30:00Z:
	/**
	 * Checks whether a given `localStorage` key is classified as volatile.
	 * Volatile keys (such as `totalPlaytime` or `activePotions`) change continuously during ticks
	 * and are excluded from debounced sync hash comparisons to prevent redundant cloud pushes.
	 *
	 * @param {string} k - The `localStorage` key name to check.
	 * @returns {boolean} True if the key is registered in the `VOLATILE` set.
	 */
	function isVolatile(k) {
		return VOLATILE.has(k);
	}
	// Generated code ends here on 2026-03-31T23:30:00Z:

	window.SaveKeys = {
		list: LIST,
		isSaveKey,
		isVolatile,
		collect,
	};
})();
