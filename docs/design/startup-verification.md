# Startup verification

Pull requests and main pushes run `.github/workflows/startup-desktop.yml` and `startup-ios.yml`. No release is created; no signing or production secrets are used.

| Target | Automated proof |
| --- | --- |
| Windows hosted runner | Rust regressions with bundled Node; unsigned NSIS build and installation into a Unicode/space path; installed process survives, local HTTP responds, Chromium renders dashboard/library |
| macOS 15 hosted runner | Same Rust regressions; unsigned app bundle launched from a Unicode/space path; process/HTTP/Chromium checks |
| Ubuntu 22.04 hosted runner | Same Rust regressions; deb installed and executable launched under Xvfb; process/HTTP/Chromium checks |
| Web | Production build and server, actual dashboard/library headings in Chromium, no uncaught page errors |
| iOS simulator | Native app built from source against this commit's local production Web server; three cold launches, actual WKWebView dashboard content, native navigation and unit tests |

Desktop/Web observation lasts 60 seconds after readiness, beyond issue 105's original timeout. Ports must be unused before launch, preventing unrelated local servers from falsely passing. The smoke harness has tests for readiness, occupied ports, early exit and HTTP failures. Its cleanup only targets the process tree it launches.

Artifacts preserve page screenshots and Windows/Linux test installers; iOS preserves XCTest results, screenshots and logs. Process output is available in Actions logs. Use the installer from the tested commit, not an older release with the same version number.

## Limits

Desktop screenshots and page assertions come from a separate Chromium instance against the app's sidecar, not the embedded native WebView. These jobs prove packaged-process startup and server/page health, not full native-window rendering or interaction. The iOS tests do check content inside WKWebView. Unsigned CI bundles do not certify Gatekeeper/SmartScreen, release signing, physical devices, every OS version/architecture, microphones, or third-party AI services. Treat any job that has not run or failed as unverified, never as a pass.

To reproduce the harness locally: `node --test scripts/ci/startup-smoke.test.mjs`. Do not point the launch probe at an already-running user application. For application smoke checks use an isolated environment with a free port and an installed Playwright Chromium.
