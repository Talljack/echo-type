# Cross-platform startup verification implementation plan

> **For agentic workers:** Use executing-plans for desktop/Web and a bounded iOS worker. Steps use checkbox syntax for tracking.

**Goal:** Verify production startup on Windows, macOS, Linux, Web and the iOS simulator without publishing releases.

**Architecture:** Independent pull-request workflows with read-only repository permissions build the current commit. Desktop jobs install/open actual bundles and probe their local server while checking process survival. Web checks use the production server. iOS uses native simulator UI tests. Artifacts preserve diagnostics; no release secrets are required.

**Tech Stack:** GitHub Actions, Rust tests, Node process/HTTP checks, Playwright, Xcode simulator.

### Desktop and Web

- [ ] Add `scripts/ci/startup-smoke.mjs`: accept an executable and args, reject an occupied port, launch without a shell, wait at most 30 seconds for HTTP success, check dashboard and library in Chromium, observe the process for 60 seconds, kill only the spawned process tree in cleanup.
- [ ] Add `scripts/ci/startup-smoke.test.mjs`: exercise successful fixture server, immediate exit, occupied port and HTTP failure with short test deadlines. Run `node --test scripts/ci/startup-smoke.test.mjs`.
- [ ] Add `.github/workflows/startup-desktop.yml`: Windows/macOS/Linux build matrix, `cargo test --locked --manifest-path src-tauri/Cargo.toml --lib`, unsigned packaging, real bundle launch, failure logs/screenshots and installer artifacts. Windows installs NSIS into a path with spaces and Chinese; Linux installs deb under Xvfb; macOS opens the bundle executable.
- [ ] Add a production Web job using `pnpm build` and the same browser startup probe with `next start`.

### iOS

- [ ] Add `.github/workflows/startup-ios.yml` and focused simulator tests, reusing native project conventions. Test local current-commit web content, not the deployed site.

### Verification and delivery

- [ ] Run local smoke harness tests and existing Rust tests. Validate workflow syntax.
- [ ] Commit scoped changes and push the existing MR branch. Observe each GitHub job; distinguish runner/billing/network blockers from code failures.
- [ ] Document actual results and remaining limits: hosted OS versions, no physical-device certification, no guarantee of every machine or external AI service.
