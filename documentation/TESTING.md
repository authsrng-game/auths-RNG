# testing guide

this document is for contributors who want to test features without grinding for weeks.

## quick start

open the game in your browser, open devtools (`F12`), go to the **console** tab, and paste the script below. it will inject max stats, all rarities, all upgrades, and all unlocks directly into the live game — no reload needed.

> **note:** this wipes your existing save first. if you care about your save, export it via settings > save data transfer before running this!!!!!!!!!!!!!

## cheat script

```javascript
(function() {
  if (typeof rarities === 'undefined' || !rarities.length) {
    alert('rarities not loaded yet, try again in a second');
    return;
  }

  Object.keys(localStorage).forEach(k => localStorage.removeItem(k));

  const now = Date.now();

  totalRolls = 999999;
  points = 999999999;
  anomalies = 99999;
  anomaliesUsed = 500;
  totalSeconds = 999999;
  shopUpgrades.luck = 100;
  shopUpgrades.speed = 3;
  shopUpgrades.pointMult = 10;
  shopUpgrades.magnet = 5;
  shopUpgrades.printer = 99;
  shopUpgrades.duplicate = 10;
  Object.keys(playerPotions).forEach(k => playerPotions[k] = 99);
  soldOutRarities.clear();
  activePotions.length = 0;
  duplicateRollsLeft = 0;
  potionLuckMultiplier = 1;
  rollSpeed = 0.25;
  pointDivisor = 1.0;
  shopLuckMultiplier = 11.0;

  inventoryData.clear();
  inventoryList.innerHTML = '';
  rarities.forEach(r => {
    const li = document.createElement('li');
    inventoryData.set(r.name, { rarityObj: r, count: 99999, liElement: li });
    inventoryList.appendChild(li);
  });
  rarityTimestamps = new Map(rarities.map(r => [r.name, now]));
  window.rarityTimestamps = rarityTimestamps;

  achievementsUnlocked.clear();
  ['roller','gambler','discordMod','touchGrass','addicted','insane','joel',
   'crazyAddicted','funkyTown','outsideTime','actually-addicted','what','devoted',
   'get-a-job','genuinely-insane','roll-factory','just-one-more-roll','got-no-life',
   'introverted','holy-hell','dude','please-just-stop','you-will-pay',
   'startingOut','lucky','spammin','leftHanded','insanelyLucky','lunar','jackpot',
   'antimatter','oh-my-god','market-crash','phenomenon','ok-bro','summer'
  ].forEach(id => achievementsUnlocked.add(id));

  localStorage.setItem('mutationsUnlocked', '1');
  localStorage.setItem('starmapUnlocked', '1');
  window.unlockPageDot?.(3);
  window.unlockPageDot?.(4);

  localStorage.setItem('daily_lastClaim', '2000-01-01');
  localStorage.setItem('weekly_lastClaim', '0');
  localStorage.setItem('daily_streak', '9999');
  localStorage.setItem('weekly_streak', '9999');

  localStorage.setItem('starmapData', JSON.stringify({
    constellations: [], voidShards: 999999, lastShardCalc: now,
    shopPurchases: {}, permanentLuckStacks: 99, voidMarketLuck: 0
  }));
  localStorage.setItem('gauntletData', JSON.stringify({ lastSeenRot: 0 }));
  localStorage.setItem('notifications', JSON.stringify([]));
  localStorage.setItem('wishingWell', JSON.stringify({
    lastThrow: 0, totalThrown: 0, totalReceived: 0, timesThrown: 0, successes: 0
  }));

  saveAllData();

  recalcLuckMultiplier();
  updateTotalRolls();
  updatePointsDisplay();
  updateShopUI();
  updateAnomalyUI();
  updateAchievementsUI();
  updatePotionUI();
  updateCollectedCounter();
  renderSortedInventory(document.getElementById('sortSelect')?.value || 'rare');
  window.refreshAllDisplays?.();
  window.renderGauntlets?.();
  window.renderStarmap?.();
  window.renderMutations?.();

  console.log(`done! injected ${rarities.length} rarities into live memory`);
})();
```

## what it gives you

| thing | value |
|---|---|
| all rarities | 99,999x each |
| points | 999,999,999 |
| anomalies | 99,999 (500 consumed for luck) |
| total rolls | 999,999 |
| all shop upgrades | maxed |
| all potions | 99 of each |
| all achievements | unlocked |
| mutations page | unlocked |
| starmap page | unlocked |
| void shards | 999,999 |
| starmap permanent luck stacks | 99 |
| daily / weekly | claimable |

## what it does NOT do

- does not touch settings or theme preferences
- does not affect cloud backups
- does not unlock void market items (those are bought manually with the shards)
- does not add gauntlet claims (gauntlets re-check inventory on their own timer, they'll register as claimable within ~4 seconds)

## if the script says "rarities not loaded yet"

the game's scripts haven't finished running. wait a second and try again. this usually only happens if you open devtools and paste immediately after a hard refresh.

## if something breaks after running it

the script calls `saveAllData()` at the end, so everything is written to localStorage. if the UI looks wrong, try navigating between pages (the arrow buttons) to force a re-render, or do a manual page refresh — your injected save will persist.

## keeping this script up to date

if new shop upgrades, potions, or achievements are added to the game, update this script to match. the relevant places to check are:

- `shopUpgrades` object in `main.js`
- `playerPotions` object in `main.js`
- `potionData` object in `main.js`
- `achievementsList` array in `main.js`
- gauntlet tier `id` fields in `gauntlets.js`
