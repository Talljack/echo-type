# Native P0 parity verification

## Desktop

Built from the shared P0 source with:

```sh
pnpm exec tauri build --debug --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

Artifact: `src-tauri/target/debug/bundle/macos/EchoType.app` (local debug app, not a signed/notarized release or updater upload). The command regenerates ignored standalone resources. No signing key was read; production configuration and installed /Applications app remain unchanged. Cargo refreshed the root lockfile package version from 1.3.1 to the existing manifest's 1.3.2.

Actual native WKWebView navigation was checked: Dashboard → Learning settings expanded → Pronunciation studio. Both new UI and the 48-entry teaching chart/evidence/next-sound controls were present. No microphone or paid acoustic call was triggered.

The package's own bundled Node/standalone server was additionally tested using:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:49935 pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts e2e/dashboard-learning-settings.spec.ts e2e/learning-workspace.spec.ts e2e/pronunciation.spec.ts --workers=1
```

Result: **9 passed**. These browser tests use isolated fixture data and mocked speech, and do not establish native microphone quality. Updated design screenshots are from this packaged web runtime.

The existing port 54576 was occupied by an older server. It was not stopped; the native app used its existing fallback behavior (50482 on the verified launch). IndexedDB is origin-scoped, so a fallback port may show a different local profile. No existing data was cleared or moved.

## iOS, verified 2026-09-09

The Swift host now owns `/learn` in Home, uses My Courses/Lesson titles, restores course state after a tab switch, and returns a deep lesson route to the shelf. A noninteractive opaque top-safe-area backdrop prevents scrolled text from overlapping status icons. Its light appearance matches the shell's existing fixed `.darkContent` icons and light web surface. Web layout, insets, native tabs and saved data are unchanged.

Build and native UI tests ran on the iPhone 16 Pro iOS 18.1 simulator:

```sh
TEST_RUNNER_ECHOTYPE_UI_TEST_WEB_ORIGIN=http://127.0.0.1:49935 xcodebuild test \
  -project ios/EchoTypeiOS.xcodeproj -scheme EchoType \
  -destination 'platform=iOS Simulator,id=D048815E-E5A6-4D01-962B-F3A3BA1B3417' \
  -parallel-testing-enabled NO \
  -only-testing:EchoTypeUITests/NativeNavigationUITests/testCourseShelfUsesHomeChromeAndRestoresAfterTabSwitch \
  -only-testing:EchoTypeUITests/NativeNavigationUITests/testLessonDeepLinkBackReturnsToCourseShelf \
  -only-testing:EchoTypeUITests/NativeNavigationUITests/testTodayLearningSettingsRenderInNativeShell \
  -only-testing:EchoTypeUITests/NativeNavigationUITests/testPronunciationStudioRendersInNativeShell
```

Result: **4 passed, 0 failures, 69.2 seconds**, Xcode `TEST SUCCEEDED`. Evidence: `/tmp/echotype-ios-safearea-final.xcresult` and matching `.log`. Both native screenshots were inspected: status time remains readable and scrolled content is masked below it. Tests handle the simulator's Chinese locale as well as English.

The lesson deep link uses an unavailable ID to verify fallback navigation; full lesson practice is covered separately by the packaged web test, not by this native smoke suite. Native microphone recording, real acoustic assessment and physical-phone behavior remain unverified. A recoverable React hydration mismatch was observed during temporary diagnostics; the content rendered successfully. All temporary diagnostic code was removed.

Spec and independent quality reviews passed, including the safe-area correction. The default production origin is unchanged. See `ios/README.md` for launch-time overrides; a build-time environment alone does not change an installed app's URL.

## Release boundary

Desktop source/build parity is local, not an automatic update to every installed copy. iOS loads the production website by default; website deployment is required for current production users to receive shared web changes, and native navigation updates require a new iOS binary. This task does not deploy, upload to TestFlight, change cloud data, or distribute signed releases.

Shared verification: `pnpm test` **132 files / 780 tests passed**. Desktop standalone production compile and TypeScript check succeeded.
