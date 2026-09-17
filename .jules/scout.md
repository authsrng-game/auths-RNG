# Scout's Journal

## 2026-06-18 - Un-updated Last Touched Timestamp in State Decay Calculations
**Bug:** `FortuneBank.prototype.balance()` calculated idle decay from `_lastTouchedAt` to `now` and updated `_balance`, but never updated `_lastTouchedAt` to `now`. Multiple consecutive reads of `.balance()` repeatedly applied decay over the same historical time window, causing compounding balance loss on every read.
**Learning:** Functions that mutate state based on time-delta calculation (`now - lastTime`) must ensure `lastTime` is updated alongside the state mutation; otherwise, repeated reads act as repeated time-decay events.
**Prevention:** Always check time-delta calculation methods to verify that both the mutated resource and its benchmark timestamp are updated together.

## 2026-06-18 - String Coercion in Map Deserialization
**Bug:** `StreakTracker.prototype.deserialize` constructed a `Map` from `Object.entries(snap.dryRuns)` without converting values to numbers. If dryRun counters were stored or passed as strings, `this._dryRuns.get(name) + 1` caused string concatenation (e.g. `"5" + 1 = "51"`) instead of numeric addition.
**Learning:** `Object.entries()` preserves string types on object values if deserialized from sources where values might be strings; Map state classes must explicitly coerce numeric properties with `Number(val)` during `deserialize`.
**Prevention:** Always convert object entry values to expected types when initializing Map state during deserialization.
