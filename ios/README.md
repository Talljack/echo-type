# EchoType iOS

Swift-native iOS host for EchoType.

## Architecture

- Native shell: Swift + UIKit + `WKWebView`
- App experience: reuses the full EchoType web app at `https://echo-type.app` by default
- Native capabilities: iOS speech recognition, microphone permissions, haptics, share sheet, document picker
- Auth callback: custom URL scheme `echotype://auth-callback`
- Bridge model: the web app detects the iOS host and routes selected interactions through `window.EchoTypeNative`

## Run

```bash
cd ios
xcodegen generate
open EchoTypeiOS.xcodeproj
```

To build from CLI:

```bash
cd ios
xcodebuild -project EchoTypeiOS.xcodeproj -scheme EchoType -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build
```

## Web Target Override

The app loads `https://echo-type.app` by default.

The override is read from the **running app's environment**, not embedded by `xcodebuild`. In Xcode, add `ECHOTYPE_WEB_URL=http://127.0.0.1:3005` under Scheme → Run → Arguments → Environment Variables. Start the web app on that port first.

For an already built and installed simulator app, launch with:

```bash
SIMCTL_CHILD_ECHOTYPE_WEB_URL=http://127.0.0.1:3005 xcrun simctl launch booted com.talljack.echotype.ios
```

If the app is already running, stop that simulator instance before relaunching with a different environment. A physical phone cannot use your Mac's loopback address; use an accessible development HTTPS origin instead. Production continues to default to `https://echo-type.app`.

For command-line UI tests, use the `TEST_RUNNER_` prefix so Xcode forwards the origin into the test runner (which sets the tested app's launch environment):

```bash
TEST_RUNNER_ECHOTYPE_UI_TEST_WEB_ORIGIN=http://127.0.0.1:3005 xcodebuild test -project EchoTypeiOS.xcodeproj -scheme EchoType -destination 'platform=iOS Simulator,name=iPhone 16 Pro' -parallel-testing-enabled NO
```

## Startup CI

Native tabs initialize on first selection instead of eagerly starting five web bootstraps against the same database. This keeps first-run database seeding on the visible screen from competing with hidden tabs; previously selected tabs remain mounted for restoration. Startup UI tests also check that the Library renders when first selected and that returning to Today restores its content.

`.github/workflows/startup-ios.yml` builds the web app from the same commit and serves it on loopback, then builds and launches the native app in an iPhone simulator. It runs native unit tests, a three-launch dashboard smoke test (including a 65-second liveness check), and the five-tab navigation test. No production web deployment, Apple signing credentials, or release publication is involved. Logs, screenshots, and the Xcode result bundle are uploaded as `ios-startup-results` even when tests fail.

The workflow regenerates the Xcode project from `project.yml`, so new test files are included. For local startup tests, run `xcodegen generate` first and use the `TEST_RUNNER_ECHOTYPE_UI_TEST_WEB_ORIGIN` override documented above. The startup test deliberately requires a loopback origin to avoid accidentally validating the deployed site instead of your changes. Simulator checks do not cover physical-device installation, signing, hardware microphone behavior, or every iOS version.

## Feature Scope

Today settings, LearningUnit/Lesson courses (`/learn`) and the pronunciation studio reuse the same web implementation as desktop. Five native tabs provide Today (`/dashboard`), Courses (`/learn`), Materials (`/library`), Review (`/review`) and Notes (`/favorites`). Courses owns legacy skill and pronunciation deep links; Notes includes expressions (`/journal`); Review owns `/review/today`, `/favorites/review` and `/weak-spots`. Each tab preserves its own WebView and supplies section back navigation. Same-origin links across sections select the destination tab, preserve the clicked URL's query, and leave the source page available for restoration. Root navigation drops route-specific queries such as `lesson`. Native QA fixture routes default to the local server on port 3005. Updating source and building the shell does **not** publish web changes: installed production iOS apps receive them after the website is deployed. New native navigation changes require an updated iOS binary as well. Local/unsigned builds are not TestFlight releases.

This directory replaces the previous React Native `mobile/` implementation.

## Auth Setup

The iOS host expects Supabase OAuth providers to allow:

- `echotype://auth-callback`

Without that redirect URI, Google/GitHub login inside the iOS app cannot return to the native shell.
