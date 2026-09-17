# Scout's Journal

## 2026-06-18 - Un-updated Last Touched Timestamp in State Decay Calculations
**Bug:** `FortuneBank.prototype.balance()` calculated idle decay from `_lastTouchedAt` to `now` and updated `_balance`, but never updated `_lastTouchedAt` to `now`. Multiple consecutive reads of `.balance()` repeatedly applied decay over the same historical time window, causing compounding balance loss on every read.
**Learning:** Functions that mutate state based on time-delta calculation (`now - lastTime`) must ensure `lastTime` is updated alongside the state mutation; otherwise, repeated reads act as repeated time-decay events.
**Prevention:** Always check time-delta calculation methods to verify that both the mutated resource and its benchmark timestamp are updated together.
