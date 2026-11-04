# Marshal's Journal

## 2026-03-31 - RevisoryLang Interpreter Coverage Gap
**Gap:** `assets/scripts/services/revisory/revisory-lang.js` contained an entire embedded DSL interpreter (custom tokenizer, AST parser, scope hierarchy, function definitions, loop constructs, pipelines, and async runtime) with zero automated tests.
**Learning:** Core engine services in `assets/scripts/services/` are loaded on `index.html` but rarely exercised in automated feature specs unless a dedicated spec verifies their execution via `window.*`.
**Prevention:** Survey service layer utilities and internal DSL interpreters in `assets/scripts/services/` periodically for complex execution logic lacking test coverage.

## 2026-11-02 - Revisory Save State Transition and Quarantine Resolution Coverage Gap
**Gap:** `assets/scripts/services/revisory/revisory.js` managed save snapshot versioning, catastrophic overwrite classification, and IndexedDB quarantine isolation without any automated feature test verifying that data loss transitions get quarantined and recovered.
**Learning:** Critical persistence guards in client-side storage services often operate silently in the background; testing them via `window.Revisory` ensures catastrophic sync payloads are correctly intercepted and quarantined.
**Prevention:** Test storage integrity and quarantine resolution paths whenever reviewing sync and backup resilience services.
