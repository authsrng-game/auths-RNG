# Scout's Journal

## 2026-06-18 - Un-updated Last Touched Timestamp in State Decay Calculations
**Bug:** `FortuneBank.prototype.balance()` calculated idle decay from `_lastTouchedAt` to `now` and updated `_balance`, but never updated `_lastTouchedAt` to `now`. Multiple consecutive reads of `.balance()` repeatedly applied decay over the same historical time window, causing compounding balance loss on every read.
**Learning:** Functions that mutate state based on time-delta calculation (`now - lastTime`) must ensure `lastTime` is updated alongside the state mutation; otherwise, repeated reads act as repeated time-decay events.
**Prevention:** Always check time-delta calculation methods to verify that both the mutated resource and its benchmark timestamp are updated together.

## 2026-06-18 - String Coercion in Map Deserialization
**Bug:** `StreakTracker.prototype.deserialize` constructed a `Map` from `Object.entries(snap.dryRuns)` without converting values to numbers. If dryRun counters were stored or passed as strings, `this._dryRuns.get(name) + 1` caused string concatenation (e.g. `"5" + 1 = "51"`) instead of numeric addition.
**Learning:** `Object.entries()` preserves string types on object values if deserialized from sources where values might be strings; Map state classes must explicitly coerce numeric properties with `Number(val)` during `deserialize`.
**Prevention:** Always convert object entry values to expected types when initializing Map state during deserialization.

## 2026-06-18 - Top-level `let` Declarations vs `window` Property Access
**Bug:** `runes.js` attempted to grant 50M anomalies on upgrade via `window.anomalies = (window.anomalies || 0) + 50000000;`. Because `anomalies` was declared with `let anomalies = 0;` at the script top-level in `main.js`, it was not attached as a property of `window`, resulting in `window.anomalies` creating an isolated property while the actual `anomalies` state variable remained unchanged and unsaved.
**Learning:** In non-module scripts, top-level `let` and `const` declarations do NOT create properties on `window` (unlike `var` or `function`). Writing to `window.varName` fails to modify top-level `let` variables.
**Prevention:** Access global state variables directly by identifier (e.g., `anomalies`) rather than through `window.anomalies` unless explicitly assigned to `window`.

## 2026-09-21 - Unhandled Undefined Lookup in Active Potion Display
**Bug:** `updateActivePotionsDisplay()` in `main.js` accessed `data.emoji` and `data.mult` directly from `potionData[p.type]`. When `activePotions` contained potion types not statically registered in `potionData` at initial script execution (such as gauntlet luck potions like `_g_easy` loaded from `localStorage` before `gauntlets.js` ran), `data` was `undefined`, causing an uncaught `TypeError` that broke potion UI rendering and displays `1x luck` instead of `p.multiplier`.
**Learning:** UI rendering functions that map stored state to static lookup dictionaries must safely handle missing dictionary keys and prefer inline state values (`p.multiplier`) over static metadata (`data.mult`).
**Prevention:** Use optional chaining (`data?.emoji || fallback`) and nullish coalescing (`p.multiplier ?? data?.mult ?? fallback`) when rendering state-backed lookup items.

## 2026-06-18 - ISO Date String Parsing with parseInt Coercion
**Bug:** `buildUI()` in `cloud-backup.js` parsed `localStorage.getItem('lastCloudBackup')` using `parseInt(lastTs)` before passing it to `new Date()`. When the backup timestamp was stored as an ISO 8601 string (e.g., `"2026-06-18T12:34:56.000Z"` returned by the API), `parseInt` extracted only the leading year (`2026`), causing `new Date(2026)` to evaluate to 2026 ms after the Unix Epoch (`1970-01-01`).
**Learning:** `parseInt()` on an ISO date string extracts the leading digits as integer milliseconds since epoch, causing dates to reset to 1970. Date parsing from stored strings must check if the value is numeric (`!isNaN(val) ? Number(val) : val`) before passing it to `new Date()`.
**Prevention:** Avoid calling `parseInt()` directly on string timestamps that can be either numeric millisecond strings or ISO date strings.

## 2026-06-18 - Storage Format Mismatch in Rarity Inventory Deserialization
**Bug:** `leaderboard-submit.js` assumed `rarityInventory` in `localStorage` was an Object mapping `{ [name]: count }`, but `main.js` stores `rarityInventory` as an Array of objects `[{ name, chance, count }]`. Array lookups like `inv[r.name]` evaluated to `undefined` and `Object.values(inv)` returned objects whose `parseInt` evaluated to `NaN` -> `0`, causing leaderboard submission payloads to report `rarities: 0` and `rarestName: 'none'`.
**Learning:** Secondary consumers of `localStorage` state must verify whether array or object schemas are written by primary state-saving scripts (`main.js`) and gracefully support both formats (`Array.isArray(inv)`).
**Prevention:** Always check `Array.isArray()` when reading complex structured state from `localStorage` before attempting object property access or array-based reductions.
