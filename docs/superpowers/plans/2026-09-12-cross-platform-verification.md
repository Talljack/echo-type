# Expanded P0/P1 verification — NOT RELEASE READY

Branch: `codex/p0-p1-learning-loop`. This report supersedes the narrower Chromium-only acceptance in the implementation log. The user subsequently authorized committing/pushing the test branch and CI execution. No merges, releases or production migrations were performed.

## September 13 follow-up

- Initial test snapshot `f542518` was pushed. Desktop/Web workflow: https://github.com/Talljack/echo-type/actions/runs/34704168103 . iOS workflow: https://github.com/Talljack/echo-type/actions/runs/34704169879 . CI results must be attributed to their exact commit, not later working-tree fixes.
- The migration failure below was reproduced with detailed rejection logging: `DatabaseClosedError: Cannot use 'in' operator to search for 'lastPracticed' in null`. Guarding the records updating hook's empty modification argument fixed the real production-browser regression. The original v16/two-tab/history/media scenario now passes.
- Review recovery also passes on Chromium and WebKit using the actual error-boundary `Try Again` button. The prior test incorrectly required only the review-local Retry label; no recovery implementation was replaced or bypassed.
- After these changes: **150 Vitest files / 892 tests passed**, TypeScript and Lint passed, production build passed, **all 34 focused production Chromium browser tests passed** (51 seconds).
- iOS CI completed with **9 native unit tests passed, 1 failed; 2 UI tests passed**. The failed test is the nonpersistent Blob probe, corroborating the earlier local finding. Persistent Blob storage, cold startup and navigation passed. This is not an all-green iOS workflow.
- The older whole-repository chat/legacy test failures and the WebKit ephemeral Blob limitation remain unresolved. The earlier migration/recovery failure descriptions below are retained as historical evidence, not current open defects.

## Verified locally

| Target | Evidence | Result |
| --- | --- | --- |
| Unit tests | `pnpm test` | 149 files, 890 passed |
| TypeScript / lint | `pnpm exec tsc --noEmit`, `pnpm lint` | Passed |
| Startup probe tests | `node --test scripts/ci/startup-smoke.test.mjs` | 4 passed |
| Rust sidecar | bundled Node + `cargo test --locked --manifest-path src-tauri/Cargo.toml --lib` | 2 passed, including Unicode/space directory |
| macOS production bundle | `pnpm build:tauri` + unsigned `tauri build --bundles app` | Passed |
| macOS application startup | Real bundle executable, isolated port 54576, 60-second observation, dashboard/library browser rendering | Passed; browser rendering is Chromium against the bundled sidecar, not full native WebView interaction |
| iOS 18.1 simulator | Fresh isolated iPhone 16 Pro simulator, current local production web build | 8 native unit tests + 3 UI tests passed: three cold launches including 65-second observation, bottom tabs, favorites grading |
| iOS persistent WKWebView storage | Actual WKWebView, Blob write/read/text round trip | Passed |
| Typing regression | Production build, Chromium and WebKit | All 5 tests passed on each engine after updating the test to enter the explicit drill tab |
| Import cancel/reload | Production Chromium | Passed after waiting for cancellation persistence before reloading |

Cross-browser production configuration: `playwright.verification.config.ts`. It deliberately keeps failures visible and does not silently skip unsupported storage tests. AI feedback, YouTube extraction and transcription in relevant browser tests use deterministic fixtures; those tests are not proof of live provider availability, billing or recognition quality.

## Unresolved failures / release gates

1. **Media storage in nonpersistent WebKit.** Standalone raw IndexedDB Blob probe fails without any application code. Playwright WebKit reports `UnknownError: Error preparing Blob/File data to be stored in object store`. Real iOS 18.1 nonpersistent WKWebView reports `DataCloneError: BlobURLs are not yet supported`. The native app intentionally uses this store for localhost QA; persistent WKWebView passes. This blocks local/native-QA media imports, recording persistence and binary backup verification. It is not evidence that production persistent iOS storage fails, but private/ephemeral contexts must receive a supported storage strategy or explicit limitation before claiming universal support. Regression probes remain red.
2. **v16 migration with two tabs — resolved in September 13 follow-up.** Initially the migrated course failed to render. Updating the version assertion alone was insufficient; the null-safe updating hook fixed the failure. Original data/history/media preservation and multi-tab restore are now verified in Chromium.
3. **Review read failure recovery — verified in September 13 follow-up.** Injected IndexedDB failure reaches the global `Something went wrong` / `Try Again` boundary. Restoring database reads and clicking the actual retry control restores all three queues in both tested engines.
4. **Legacy full-suite failures.** Initial whole-repository Chromium run stopped at 12 failures: 14 passed, 2 interrupted, 236 not run. Old sidebar expectations are obsolete; chat-agent completion/toolbar scenarios also failed. This is not an all-green full-suite run. The initial focused production run had 43 passed / 23 failed; subsequent isolated reruns cleared typing (10 cases across engines) and import cancellation. No final full all-green run exists.
5. **Windows CI — running after authentication was restored.** See linked workflow above for commit-specific results. The workflow installs NSIS to a Unicode path and launches it. Do not substitute local macOS compilation for its result.
6. **Cloud/external services.** Production Supabase migration, real two-device signed-in synchronization, real AI/STT/TTS provider access and physical-device microphones are not validated in this pass. Production data was not modified.

## Test corrections made

- Re-enter explicit legacy drills before course typing regression.
- Wait for persisted cancellation before reload, not a hidden task-list button.
- Query native favorites card by its button accessibility role.
- Query stable native-root-marker identifier and assert its changing label.
- Regenerate Xcode project to include existing StartupUITests; the checked-in project had omitted that test source.
- Add production Chromium/WebKit configuration and raw Blob capability probes on web and native iOS.
- Preserve migration failing scenario with diagnostic output and current schema version assertion.

## Local evidence

Logs: `/tmp/echo-all-tests.log`, `/tmp/echo-startup-tests.log`, `/tmp/echo-rust-tests.log`, `/tmp/echo-native-build.log`, `/tmp/echo-macos-bundle.log`, `/tmp/echo-macos-launch.log`, `/tmp/echo-all-e2e.log`, `/tmp/echo-crossbrowser.log`, `/tmp/echo-chromium-recheck.log`, `/tmp/echo-webkit-typing-recheck.log`, `/tmp/echo-import-cancel-recheck.log`, `/tmp/echo-migration-diagnostic.log`, `/tmp/echo-blob-probe.log`.

iOS results: `/tmp/echo-p01-native-recheck.xcresult` (passed), `/tmp/echo-p01-native-blob.xcresult` (nonpersistent storage failed), `/tmp/echo-p01-native-persistent-blob.xcresult` (persistent storage passed).

These temporary logs may be removed by OS cleanup. The conclusions above are retained in this repository report. The unsigned local bundle is not a published/signed release.
