# Native P0 Parity Implementation Plan

> Use subagent-driven-development for iOS navigation and sequential spec/quality reviews. Root handles the independent desktop artifact. Continue in the user-requested checkout on codex/learning-units-pronunciation.

**Goal:** Ship locally verifiable native-host parity for the approved P0 UI.

**Architecture:** Shared Next UI; Tauri bundled standalone; UIKit managed web routes.

**Tech Stack:** Next, Tauri/Rust, UIKit/WebKit, XCTest, Playwright.

- [x] iOS worker: extend NativeNavigationUITests with /learn navigation title, course-detail back to shelf, native tab restoration, Today settings and pronunciation rendering checks. Run new tests RED against http://127.0.0.1:3005. Modify only WebContainerViewController route ownership/section/title branches: /learn belongs to Home, /learn root title My Courses, /learn/* title Lesson, nested back returns /learn. Run GREEN on iPhone 16 Pro simulator. Use existing makeApp/local origin helpers. No production URL change. Fix only parity failures in scope; report other gaps.
- [x] Root: build `pnpm exec tauri build --debug --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'`; this regenerates ignored standalone resources and debug app only. Verify routes in produced bundle and runtime if safe. Do not replace /Applications app or kill user processes.
- [x] Inspect native screenshots and run shared regression tests. Read exact build/test outputs before claiming success.
- [x] Independent spec review followed by quality review; fix findings.
- [x] Update ios/README.md runtime-override instructions (override is a launch environment, not embedded by xcodebuild). Record actual artifact paths, test results and release boundaries in docs/design/native-parity-notes.md. Commit source/docs locally only.

Validation follow-through: native screenshot inspection added a minimal top-safe-area backdrop and a RED/GREEN frame-coverage test. Final native suite4/4, packaged web9/9, shared unit780/780. Local origin49935 used for native tests; real speech and production release remain excluded.
