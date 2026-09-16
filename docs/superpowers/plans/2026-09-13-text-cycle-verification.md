# Text learning cycle: implementation and verification

Branch: `codex/text-learning-cycle`, based on main `9e811e4`. No commit, PR, release or production database migration performed.

## Delivered behavior

- Existing text lessons now expose Understand → Output → Correct → Recall → Apply. Original materials and immutable submissions remain intact. Existing listen/read/speak/type drills remain available separately.
- Understanding needs a supporting quote. Output needs original writing. Correction needs a changed answer and improvement notes. Earlier out-of-order or copied drafts can be retained while starting a valid new response.
- Recall becomes due one day after correction. The learner answers before comparison and self-rates; hints/translation are recorded honestly. Assisted/failed recall retries in ten minutes; successful recall increases spacing. These are transparent initial scheduling rules, not a claim of a clinically validated adaptive model or certified proficiency.
- Application links a source expression, a genuinely new context and an example to the corrected source after successful delayed recall.
- Daily Plan creates exact stage tasks, credits matching evidence, prioritizes due recall and continuing work, retains paused tasks, prefers imported material over untouched builtins, respects minute budgets and excludes future recall. Review center includes due text recall.
- Account/source-scoped local drafts survive reload. Source edits cannot overwrite old drafts. Save failures are visible. Assistance stays recorded after comparison/reload or translation-only toggles.
- Media and import originals are stored as ArrayBuffer and exposed as Blob through Dexie. Existing native Blob records remain readable. Backup restores and recordings are tested; no data-destructive schema migration is needed. Older app versions lacking the decoding middleware should be upgraded before reading newly encoded rows.
- UI follows existing Poppins/Open Sans and indigo styling. Translations remain with their source. Mobile course outline collapses; desktop outline remains visible. No video-player functionality added.

## Verification evidence

- Full Vitest suite: 154 files / 934 tests passed.
- TypeScript, Biome and Next.js production build passed.
- Startup smoke harness: 4 Node tests passed; macOS Rust sidecar tests: 2 passed, including a canonical path containing spaces and Unicode.
- New browser suite: `pnpm exec playwright test --config=playwright.text-cycle.config.ts --output=/tmp/echo-text-cycle-final-check`; production server on 127.0.0.1:3011. Final result: **34 passed (1.9 minutes)**, 17 each in Chromium and WebKit, including the complete five-stage journey at 375px width.
- Additional production Chromium regression coverage includes typing navigation/error handling/punctuation, inline translation, v16 migration, imports, ZIP restore and legacy optional workshop history.
- Native iOS: see `docs/text-cycle-native-checks.md`. 12 unit tests and 2 UI tests, zero failures; one narrowly identified native Blob capability test skipped. Strict byte storage tests pass in both persistent and ephemeral WKWebView. Three cold launches, a 65-second stability observation and native tab navigation passed.

## Scope limits

- Windows/macOS/Linux CI matrix is configured in `.github/workflows/text-learning-cycle.yml`; Windows execution requires pushing the branch/PR. This local macOS session is not Windows runtime evidence.
- The iOS simulator is not a physical microphone/device test. Native nonpersistent QA storage remains ephemeral by design; byte compatibility does not make it survive app deletion or ephemeral store destruction.
- AI feedback is optional and requires a working provider/model. The base self-review cycle does not depend on AI credentials. Real model-feedback quality and two-device cloud synchronization were not certified by the local tests. Existing provider configuration produced a model-not-found response in unrelated recommendation requests; no credentials/settings were changed.
- This work does not publish desktop installers or deploy the previously documented sync SQL migration.

## Regression fixes found during verification

New evidence was initially excluded by a stale UI clock; source changes inherited an old draft; comparison reload could lose assistance; writing out of order could create an ineligible revision chain; task ordering reverted to IndexedDB key order; native Blob import originals were not covered by recording serialization. Each was reproduced, covered and corrected. Existing test assertions now distinguish five-stage completion from initial writing and decode the actual new stored byte representation when reading native IndexedDB fixtures.

The mobile source-material entry initially fell below the 850px viewport. Collapsing the course outline, removing redundant next-stage guidance and moving optional drills below the active task fixed the regression in both browser engines. A final 375px screenshot was also inspected manually.
