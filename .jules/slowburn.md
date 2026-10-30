## 2026-10-30 - Expedition Recovery Cooldown Calculation After Background Completion

**Gap:** When an expedition completed while the tab was hidden or backgrounded, `resolveExpedition()` calculated `cooldownUntil = Date.now() + durationMs * 0.5`. Relative timestamp calculation from `Date.now()` upon refocus/render ignored elapsed time post-completion, resetting recovery cooldowns and penalizing background play.

**Learning:** Cooldown calculations for offline or background-completed tasks must be derived from the exact completion timestamp (`startTime + duration`) rather than current invocation time (`Date.now()`).

**Prevention:** When setting recovery or penalty cooldowns triggered by time-based completions, always anchor the baseline time to `completionTime = startTime + duration` so background time elapsed between completion and refocus is properly credited.
