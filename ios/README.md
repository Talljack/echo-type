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

## Scope

Today settings, LearningUnit/Lesson courses (`/learn`) and the pronunciation studio reuse the same web implementation as desktop. The native Home section owns course routes and supplies lesson titles/back navigation. Updating source and building the shell does **not** publish web changes: installed production iOS apps receive them after the website is deployed. New native navigation changes require an updated iOS binary as well. Local/unsigned builds are not TestFlight releases.

This directory replaces the previous React Native `mobile/` implementation.

## Auth Setup

The iOS host expects Supabase OAuth providers to allow:

- `echotype://auth-callback`

Without that redirect URI, Google/GitHub login inside the iOS app cannot return to the native shell.
