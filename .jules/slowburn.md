## 2026-10-21 - Active Potion Expiration During Background Catch-Up Rolls

**Gap:** Active luck potions did not expire mid-simulation during `performBackgroundRoll` catch-up calls, allowing background rolls to benefit from expired potion luck multipliers throughout the catch-up duration.

**Learning:** When catch-up simulation loop jumps across large elapsed time deltas, status effects and temporary multipliers (like active potions) evaluated against `Date.now()` remain active during simulated ticks unless evaluated against `simulatedNow`.

**Prevention:** Ensure temporary effect recalibrations (e.g. `recalcPotionLuck(now)`) accept an explicit timestamp parameter and reconcile expiration during simulated time steps.

## 2026-10-23 - Milestone Luck Boost Premature Expiration During Background Catch-Up Rolls

**Gap:** Triggering 100-roll milestone luck boosts during `performBackgroundRoll` catch-up calls invoked `startLuckBoost(simulatedNow)`, which evaluated remaining boost duration against wall-clock `Date.now()` instead of `simulatedNow`, causing the 4x luck boost to immediately expire before any catch-up rolls could benefit from it.

**Learning:** Any timer or boost activation helper called within background simulation loops must evaluate duration and timer updates against the simulated timestamp (`simulatedNow` / `now`) rather than unparameterized `Date.now()`.

**Prevention:** Always accept an optional timestamp parameter `now = Date.now()` in timer calculation functions (`updateLuckTimer(now)`) and pass `now` through from initiation helpers (`startLuckBoost(now)`).

## 2026-10-24 - Auto-Roll Background Progression and Unload Reconciliation

**Gap:** Auto-roll background execution stalled when the tab was hidden because `tick()` returned early without running `processAutoRolls()`, and `visibilitychange` only triggered catch-up rolls when revealing the tab (`!document.hidden`). Consequently, periodic background saves, cloud sync pushes, and `pagehide` unloads that occurred while hidden persisted un-updated auto-roll counts.

**Learning:** Hidden tab interval ticks must invoke background simulation logic (`processAutoRolls()`), and transition events (`visibilitychange` and `pagehide`) must reconcile elapsed progress before state persistence or tab unload occurs.

**Prevention:** Ensure timer tick handlers process background catch-up rolls when `document.hidden` is true, and register `visibilitychange` and `pagehide` listeners to process pending progress prior to autosave or cloud sync.

## 2026-10-25 - Expedition Recovery Cooldown Calculation After Background Completion

**Gap:** Expedition recovery cooldown was set relative to `Date.now()` at resolution time (`Date.now() + len.durationMs * 0.5`) instead of completion time (`exp.startTime + exp.duration + len.durationMs * 0.5`), forcing players to wait through a full recovery cooldown starting from when they refocused the tab regardless of how long ago the expedition completed.

**Learning:** Timers or cooldowns triggered upon resolving a completed background state must evaluate their target completion timestamps relative to the actual state completion time (`exp.startTime + exp.duration`) rather than unparameterized `Date.now()`.

**Prevention:** Ensure transition and resolution handlers set post-completion timer targets derived from the completion timestamp rather than real-time invocation timestamps.

## 2026-11-03 - Dealer Recovery Cooldown Calculation After Background Session Timeout

**Gap:** Dealer encounter recovery cooldown was set relative to `Date.now()` at session resolution time (`Date.now() + ENCOUNTER_COOLDOWN`) when a session timed out in the background, forcing players who refocused hours later to wait through a full 3-hour recovery cooldown starting from tab refocus.

**Learning:** When an interactive encounter or session times out in the background, post-session recovery cooldown targets must be evaluated relative to the exact session completion timestamp (`startedAt + SESSION_DURATION`) rather than the real-time tab refocus timestamp (`Date.now()`).

**Prevention:** Always calculate post-timeout encounter cooldowns relative to `session.startedAt + SESSION_DURATION` when terminating expired sessions during tab refocus or periodic reconciliation.
