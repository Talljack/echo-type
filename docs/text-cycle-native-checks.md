# Native media storage checks — 2026-09-13

## Scope

The hosted iOS unit tests exercise IndexedDB in real WKWebViews. The two ArrayBuffer tests verify the application's storage representation: binary bytes and encoding metadata survive IndexedDB, then reconstruct a Blob with the original content and MIME type. They cover both persistent and ephemeral stores. These probes do not import or invoke the Dexie middleware; application-level coverage belongs to `e2e/media-recording-storage.spec.ts`.

The persistent direct-Blob test remains strict. The ephemeral direct-Blob capability probe skips only when the IndexedDB write produces the exact known error: `DataCloneError: Failed to store record in an IDBObjectStore: BlobURLs are not yet supported.` Other errors remain failures.

## Development server result

- Simulator: iPhone 16 Pro, iOS 18.1, `D048815E-E5A6-4D01-962B-F3A3BA1B3417`.
- Origin: `http://127.0.0.1:3010`.
- Result: 12 tests executed, 1 capability test skipped, 0 failures; `xcodebuild` exited 0.
- Both ArrayBuffer roundtrips and the persistent direct-Blob roundtrip passed.
- Log: `/tmp/echo-text-cycle-native-dev.log`.
- Result bundle: `/tmp/echo-text-cycle-native-dev.xcresult`.
- Xcode logged AppIntents metadata warnings and simulator WebProcess teardown diagnostics; these did not fail tests.

Invocation follows `.github/workflows/startup-ios.yml`:

```sh
TEST_RUNNER_ECHOTYPE_WEB_URL=http://127.0.0.1:3010/dashboard \
TEST_RUNNER_ECHOTYPE_UI_TEST_WEB_ORIGIN=http://127.0.0.1:3010 \
xcodebuild test \
  -project ios/EchoTypeiOS.xcodeproj \
  -scheme EchoType \
  -destination 'platform=iOS Simulator,id=D048815E-E5A6-4D01-962B-F3A3BA1B3417' \
  -parallel-testing-enabled NO \
  -resultBundlePath /tmp/echo-text-cycle-native-dev.xcresult \
  -only-testing:EchoTypeTests \
  CODE_SIGNING_ALLOWED=NO
```

## Production build result

- Origin: `http://127.0.0.1:3011`, freshly built local production server; same simulator.
- Result: 12 unit tests (1 known capability skip) and 2 UI tests, 0 failures; `xcodebuild` exited 0.
- Both ArrayBuffer roundtrips and persistent direct-Blob storage passed again.
- Bottom-tab navigation passed in 42.284 seconds.
- Repeated cold launch passed in 88.797 seconds: three hydrated dashboard launches, a 65-second stability observation, lazy Materials rendering, and return to Today. Three startup screenshots are attached to the result bundle.
- Log: `/tmp/echo-text-cycle-native-prod.log`.
- Result bundle: `/tmp/echo-text-cycle-native-prod.xcresult`.

The production invocation uses the command above with port `3011`, result bundle `echo-text-cycle-native-prod.xcresult`, and these additions:

```sh
TEST_RUNNER_ECHOTYPE_UI_TEST_LOCAL_WEB_ORIGIN=http://127.0.0.1:3011
# Additional xcodebuild arguments:
-only-testing:EchoTypeUITests/StartupUITests
-only-testing:EchoTypeUITests/NativeNavigationUITests/testBottomTabsNavigateAcrossPrimaryModules
```

These runs do not verify Windows, physical iOS devices, native microphone capture, or the complete text-cycle user flow.
