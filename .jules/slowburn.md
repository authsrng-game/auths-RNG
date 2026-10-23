## 2026-10-21 - Active Potion Expiration During Background Catch-Up Rolls

**Gap:** Active luck potions did not expire mid-simulation during `performBackgroundRoll` catch-up calls, allowing background rolls to benefit from expired potion luck multipliers throughout the catch-up duration.

**Learning:** When catch-up simulation loop jumps across large elapsed time deltas, status effects and temporary multipliers (like active potions) evaluated against `Date.now()` remain active during simulated ticks unless evaluated against `simulatedNow`.

**Prevention:** Ensure temporary effect recalibrations (e.g. `recalcPotionLuck(now)`) accept an explicit timestamp parameter and reconcile expiration during simulated time steps.

## 2026-10-23 - Milestone Luck Boost Premature Expiration During Background Catch-Up Rolls

**Gap:** Triggering 100-roll milestone luck boosts during `performBackgroundRoll` catch-up calls invoked `startLuckBoost(simulatedNow)`, which evaluated remaining boost duration against wall-clock `Date.now()` instead of `simulatedNow`, causing the 4x luck boost to immediately expire before any catch-up rolls could benefit from it.

**Learning:** Any timer or boost activation helper called within background simulation loops must evaluate duration and timer updates against the simulated timestamp (`simulatedNow` / `now`) rather than unparameterized `Date.now()`.

**Prevention:** Always accept an optional timestamp parameter `now = Date.now()` in timer calculation functions (`updateLuckTimer(now)`) and pass `now` through from initiation helpers (`startLuckBoost(now)`).
