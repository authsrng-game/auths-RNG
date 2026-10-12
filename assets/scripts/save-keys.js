'use strict';

(function () {
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

	function isSaveKey(k) {
		if (typeof k !== 'string') return false;
		if (SET.has(k)) return true;
		for (let i = 0; i < PREFIXES.length; i++) if (k.startsWith(PREFIXES[i])) return true;
		return false;
	}

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

	window.SaveKeys = {
		list: LIST,
		isSaveKey,
		isVolatile: (k) => VOLATILE.has(k),
		collect,
	};
})();
