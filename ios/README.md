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

To point the native shell at a local web build during development:

```bash
ECHOTYPE_WEB_URL=http://127.0.0.1:3100 xcodebuild -project EchoTypeiOS.xcodeproj -scheme EchoType -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build
```

You can also set `ECHOTYPE_WEB_URL` in Xcode scheme environment variables.

For UI tests, prefer setting `ECHOTYPE_UI_TEST_WEB_ORIGIN` explicitly when multiple local Next.js apps are running, for example:

```bash
ECHOTYPE_UI_TEST_WEB_ORIGIN=http://127.0.0.1:3100 xcodebuild test -project EchoTypeiOS.xcodeproj -scheme EchoType -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

## Scope

This directory replaces the previous React Native `mobile/` implementation.

## Auth Setup

The iOS host expects Supabase OAuth providers to allow:

- `echotype://auth-callback`

Without that redirect URI, Google/GitHub login inside the iOS app cannot return to the native shell.
