## 2026-10-21 - Active Potion Expiration During Background Catch-Up Rolls

**Gap:** Active luck potions did not expire mid-simulation during `performBackgroundRoll` catch-up calls, allowing background rolls to benefit from expired potion luck multipliers throughout the catch-up duration.

**Learning:** When catch-up simulation loop jumps across large elapsed time deltas, status effects and temporary multipliers (like active potions) evaluated against `Date.now()` remain active during simulated ticks unless evaluated against `simulatedNow`.

**Prevention:** Ensure temporary effect recalibrations (e.g. `recalcPotionLuck(now)`) accept an explicit timestamp parameter and reconcile expiration during simulated time steps.
