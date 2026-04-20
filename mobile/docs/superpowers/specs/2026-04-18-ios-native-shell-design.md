# iOS Native Shell — Design Spec

**Date:** 2026-04-18
**Branch:** feat/mobile-native-app-plan
**Phase:** A.1 (Foundation — iOS native infrastructure)
**Status:** Approved, ready for implementation plan

---

## 1. Goal

Upgrade the mobile app's outer shell to feel native on iOS while keeping `react-native-paper` for internal content. This is Phase A.1 in a larger roadmap (A→D: infrastructure → dark mode → settings completion → practice enhancements → chat upgrade).

Out of scope for this spec: business-logic changes, dark-mode audit, settings additions, practice-mode feature work, chat upgrade.

## 2. Decisions (locked)

| # | Decision | Chosen |
|---|---|---|
| Q1 | Paper strategy | **A** — pragmatic: keep Paper for content, swap iOS shell only |
| Q2 | Tab count | **A** — keep 6 tabs (Home / Listen / Speak / Read / Write / More) |
| Q3 | Icon system | **A** — SF Symbols in tab bar only; MCI elsewhere |
| Q4 | Background audio | **A** — full: Now Playing + Control Center + AirPods gestures |

## 3. Scope — 7 workstreams

1. **NativeTabs** replaces `CustomTabBar` (iOS), falls back to Tabs (Android)
2. **Large Title + swipe-back** on Home / Library / Vocabulary / Wordbooks / Settings / Review / More
3. **iOS Sheet detents** for ImportModal / EditContentModal / VoiceSelector / TranslationPanel / RatingButtons bottom panel
4. **ContextMenu (long-press)** on ContentCard / Vocabulary cards / ConversationList
5. **Haptics semantic API** — 6 levels: `tap / light / medium / success / warning / error`
6. **Dynamic Type** — typography tokens scale with `PixelRatio.getFontScale()`, capped at 1.4× for headings
7. **Background audio** — `react-native-track-player` with Now Playing metadata, Control Center controls, AirPods double-tap / long-press bindings, lock-screen artwork

## 4. Architecture

```
mobile/
├── app/
│   └── (tabs)/_layout.tsx              [modify] NativeTabs (iOS) / Tabs (Android)
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── CustomTabBar.tsx        [delete]
│   │   │   ├── LargeTitleHeader.tsx    [new]
│   │   │   └── TabBarIcon.tsx          [new] SF Symbols (iOS) / MCI (Android)
│   │   └── ui/
│   │       ├── Sheet.tsx               [new] @gorhom/bottom-sheet wrapper, detents=['medium','large']
│   │       └── ContextMenuItem.tsx     [new] react-native-ios-context-menu wrapper
│   ├── lib/
│   │   ├── haptics.ts                  [new] 6-level semantic API
│   │   ├── audio-session.ts            [new] TrackPlayer init + Now Playing metadata
│   │   └── platform.ts                 [new] isIOS / iosMajor
│   └── theme/
│       └── typography.ts               [modify] add scaleFont()
├── app.json                            [modify] UIBackgroundModes, audio session
└── package.json                        [modify] new deps
```

**New dependencies:**
- `expo-symbols` — SF Symbols
- `@gorhom/bottom-sheet` — sheet detents (JS-only, Reanimated-backed)
- `react-native-ios-context-menu` — native UIMenu
- `react-native-track-player` — background audio + Now Playing

**Platform branching rule:** every iOS-only behavior gates through `lib/platform.ts`. Android falls back to Paper/current implementation — zero regression.

## 5. Component behaviors

### 5.1 NativeTabs
- Uses `expo-router/unstable-native-tabs`
- 6 `NativeTabs.Trigger`, each with `Icon sf={...}` (iOS) + `drawable` (Android MCI name)
- SF Symbol mapping:
  - Home → `house.fill`
  - Listen → `headphones`
  - Speak → `waveform`
  - Read → `book.fill`
  - Write → `pencil`
  - More → `ellipsis.circle.fill`
- Hidden routes (`library`, `vocabulary`, `settings`) accessed via `more.tsx` menu, unchanged

### 5.2 Large Title + swipe-back
- Applied to root scroll screens via `Stack.Screen` options
- `headerLargeTitle: true`, `headerTransparent: true`, blur background on scroll
- Practice inner screens keep compact header
- `gestureEnabled: true` (system default, explicit for clarity)

### 5.3 Sheet
- `<Sheet detents={['medium','large']}>`, Paper content preserved inside
- Targets: ImportModal, EditContentModal, VoiceSelector, TranslationPanel overlay, RatingButtons bottom panel
- Android fallback: full-screen Paper Modal

### 5.4 ContextMenu
- ContentCard: Play / Favorite / Edit / Delete
- Vocabulary card: Mark known / Reset SRS / Remove
- ConversationList: Rename / Pin / Delete
- Android fallback: existing overflow menu

### 5.5 Haptics API (`lib/haptics.ts`)
```ts
export const tap      = () => Haptics.selectionAsync();                  // tab switch, toggle
export const light    = () => Haptics.impactAsync('light');              // button press
export const medium   = () => Haptics.impactAsync('medium');             // open sheet
export const success  = () => Haptics.notificationAsync('success');      // practice complete
export const warning  = () => Haptics.notificationAsync('warning');      // recording fail
export const error    = () => Haptics.notificationAsync('error');        // hard failure
```
All existing `Haptics.*` direct calls across the app are replaced with these semantic imports.

### 5.6 Dynamic Type
- `typography.ts` adds `scaleFont(baseSize: number)` using `PixelRatio.getFontScale()`
- All `<Text>` consumes tokens, no hard-coded `fontSize`
- Heading-level tokens pass `maxFontSizeMultiplier={1.4}` to prevent layout break at XXL

### 5.7 Background audio
- `TrackPlayer` initialized in `app/_layout.tsx` effect (before store hydration completes)
- Listen practice `play()` writes Now Playing: title = content.title, artist = "EchoType", artwork = content.thumbnail
- Remote events bound: play / pause / seek / skip-forward 15s / skip-backward 15s
- AirPods: double-tap → play-pause, long-press → skip
- `app.json`: `ios.infoPlist.UIBackgroundModes = ['audio']`, `expo-build-properties` sets `audioSessionCategory: playback`

## 6. Testing

| Area | iPhone 15 Pro (iOS 18) | iPhone SE (iOS 17) | Pixel (Android) |
|---|---|---|---|
| 6 tabs render + tap | liquid-glass, SF Symbols | compact, labels not truncated | Material fallback |
| Large Title scroll collapse | blur bg | same | plain header |
| Swipe-back gesture | ✅ | ✅ | system back |
| Sheet detents drag | medium/large + damping | same | full-screen Modal |
| ContextMenu long-press | native UIMenu + preview | same | overflow menu |
| Haptics 6 levels differentiation | feel | feel | Android vibrate fallback |
| Dynamic Type | XXL does not break | same | n/a |
| Background audio | lock-screen controls + Control Center + AirPods | same | Android notification |

**Automated:**
- `src/lib/haptics.test.ts` + `src/lib/audio-session.test.ts` with native-module mocks
- Existing Vitest suite stays green (no regression)
- `tsc --noEmit` zero errors

**Acceptance checklist:**
1. No imports of deleted `CustomTabBar.tsx`
2. No direct `Haptics.*` call sites remain (grep verified)
3. All targeted Modals render as Sheet on iOS
4. Listen practice: lock phone → pause/play from lock screen works
5. AirPods double-tap advances 15s
6. Settings → system font XXL → no broken layouts

## 7. Rollout order (7 PRs)

1. **PR #1** — `lib/platform.ts` + `lib/haptics.ts` + replace all `Haptics.*` call sites. Zero risk, pure refactor.
2. **PR #2** — `typography.ts` `scaleFont`, `<Text>` baseline update. Risk: global font-size shift; walk through all screens.
3. **PR #3** — NativeTabs in `app/(tabs)/_layout.tsx`, delete CustomTabBar. Risk: `href: null` hidden-tab semantics differ under NativeTabs — verify drawer/stack access to Library / Vocabulary / Settings.
4. **PR #4** — Large Title + swipe-back via `Stack.Screen` options on root screens. Low risk, big visual change.
5. **PR #5** — `Sheet.tsx` wrapper, migrate Modals one-by-one (ImportModal → EditContentModal → VoiceSelector → TranslationPanel). Risk: `@gorhom/bottom-sheet` ↔ Reanimated 4.x compatibility.
6. **PR #6** — ContextMenu on ContentCard / Vocabulary / ConversationList. `react-native-ios-context-menu` requires `expo prebuild`.
7. **PR #7** — `track-player` + `audio-session.ts` + `app.json` mods. Biggest piece; config plugin + prebuild + real-device testing.

## 8. Known risks

- `@gorhom/bottom-sheet` requires `react-native-reanimated` ≥ 3.16 (current 4.x ✅)
- `react-native-ios-context-menu` requires prebuild (iOS folder exists ✅)
- NativeTabs is still under `unstable-` prefix — lock to a specific version
- TrackPlayer init must precede app root render; wire in `_layout.tsx` effect before store hydration

## 9. Time estimate

Sequential execution: **3.5–5 days**
- PR #1-2: 0.5 day
- PR #3-4: 1 day
- PR #5-6: 1.5 days
- PR #7: 1-2 days

## 10. Rollback

Each PR merges independently; any PR can be reverted in isolation without breaking the others.
