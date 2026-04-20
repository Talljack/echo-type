# iOS Native Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile app's outer shell with iOS-native primitives (NativeTabs, Large Title, Sheet, ContextMenu, Haptics API, Dynamic Type, background audio) while preserving `react-native-paper` for internal content.

**Architecture:** Platform-gated upgrades. iOS-only behaviors branch through `src/lib/platform.ts`; Android falls back to current Paper-based implementation. 7 independent PRs land sequentially, each leaves the app green.

**Tech Stack:** Expo 54 (SDK 54, RN 0.81.5), expo-router 6, react-native-paper 5.15, Reanimated 4.1.7, react-native-track-player, @gorhom/bottom-sheet, react-native-ios-context-menu, expo-symbols.

**Spec:** `mobile/docs/superpowers/specs/2026-04-18-ios-native-shell-design.md`

All commands assume `cwd = mobile/`. Package manager is **pnpm**.

---

## PR #1 — Haptics semantic API + platform util

### Task 1: Create `platform.ts`

**Files:**
- Create: `mobile/src/lib/platform.ts`

- [ ] **Step 1: Write the file**

```ts
import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const iosMajor = (): number => {
  if (!isIOS) return 0;
  const v = Platform.Version;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : 0;
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/platform.ts
git commit -m "feat(mobile): add platform detection utility"
```

### Task 2: Create `haptics.ts` semantic API

**Files:**
- Create: `mobile/src/lib/haptics.ts`
- Create: `mobile/src/lib/haptics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import * as Haptics from 'expo-haptics';
import { haptics } from './haptics';

describe('haptics semantic API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tap → selectionAsync', async () => {
    await haptics.tap();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('light → impactAsync light', async () => {
    await haptics.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('medium → impactAsync medium', async () => {
    await haptics.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('success → notificationAsync success', async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warning → notificationAsync warning', async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('error → notificationAsync error', async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

Run: `pnpm vitest run src/lib/haptics.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// mobile/src/lib/haptics.ts
import * as H from 'expo-haptics';

export const haptics = {
  tap: () => H.selectionAsync(),
  light: () => H.impactAsync(H.ImpactFeedbackStyle.Light),
  medium: () => H.impactAsync(H.ImpactFeedbackStyle.Medium),
  success: () => H.notificationAsync(H.NotificationFeedbackType.Success),
  warning: () => H.notificationAsync(H.NotificationFeedbackType.Warning),
  error: () => H.notificationAsync(H.NotificationFeedbackType.Error),
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/lib/haptics.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/haptics.ts src/lib/haptics.test.ts
git commit -m "feat(mobile): add semantic haptics API"
```

### Task 3: Replace direct `Haptics.*` call sites

**Files (25 to modify):**
- `app/(tabs)/index.tsx`, `listen.tsx`, `speak.tsx`, `read.tsx`, `write.tsx`, `library.tsx`, `more.tsx`, `settings.tsx`
- `app/content/[id].tsx`, `app/wordbook/[id].tsx`
- `app/practice/listen/[id].tsx`, `read/[id].tsx`, `write/[id].tsx`, `speak/conversation.tsx`
- `src/components/write/TypingInput.tsx`
- `src/components/settings/{LanguageSection,AIProviderSection,TranslationSection}.tsx`
- `src/components/listen/HighlightedText.tsx`
- `src/components/library/WordbookCard.tsx`
- `src/components/dashboard/ReviewForecastCard.tsx`
- `src/components/review/{ReviewCard,ContentReviewCard}.tsx`
- `src/components/practice/PracticeCompletionSummary.tsx`
- `src/components/navigation/CustomTabBar.tsx` (will be deleted in PR #3 — still migrate to keep diff clean)

- [ ] **Step 1: Replace per-file mapping**

For each file, apply these substitutions:

| Old | New |
|---|---|
| `Haptics.selectionAsync()` | `haptics.tap()` |
| `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` | `haptics.light()` |
| `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` | `haptics.medium()` |
| `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` | `haptics.medium()` (no Heavy in our API) |
| `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` | `haptics.success()` |
| `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` | `haptics.warning()` |
| `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` | `haptics.error()` |

And replace `import * as Haptics from 'expo-haptics'` with `import { haptics } from '@/lib/haptics'`.

- [ ] **Step 2: Verify no stragglers**

Run: `grep -rn "from 'expo-haptics'" src/ app/ --include="*.tsx" --include="*.ts"`
Expected: only `src/lib/haptics.ts`.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: zero errors.

- [ ] **Step 4: Manual smoke**

Start `pnpm start`, open iOS simulator. Tap a toggle and a button; confirm haptic fires.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "refactor(mobile): migrate all call sites to semantic haptics API"
```

---

## PR #2 — Dynamic Type in typography

### Task 4: Add `scaleFont` to typography

**Files:**
- Modify: `mobile/src/theme/typography.ts`
- Create: `mobile/src/theme/typography.test.ts`

- [ ] **Step 1: Read current file**

Run: `cat src/theme/typography.ts`

- [ ] **Step 2: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  PixelRatio: { getFontScale: () => 1.3 },
}));

import { scaleFont } from './typography';

describe('scaleFont', () => {
  it('scales base size by font scale, capped at 1.4', () => {
    expect(scaleFont(16)).toBeCloseTo(20.8); // 16 * 1.3
  });

  it('caps at maxScale', () => {
    expect(scaleFont(16, 1.2)).toBeCloseTo(19.2); // 16 * 1.2
  });
});
```

- [ ] **Step 3: Add `scaleFont` implementation at top of `typography.ts`**

```ts
import { PixelRatio } from 'react-native';

export function scaleFont(baseSize: number, maxScale = 1.4): number {
  const scale = Math.min(PixelRatio.getFontScale(), maxScale);
  return Math.round(baseSize * scale * 100) / 100;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/theme/typography.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Set `maxFontSizeMultiplier={1.4}` on Text defaults**

In `app/_layout.tsx`, add inside the `PaperProvider` wrapping:

```tsx
import { Text as RNText } from 'react-native';
// ... inside the component before return
(RNText as any).defaultProps = { ...((RNText as any).defaultProps ?? {}), maxFontSizeMultiplier: 1.4 };
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 7: Manual smoke on device**

Simulator → Settings → Accessibility → Display & Text Size → Larger Text → slide max. Open app, walk through Home / Library / Settings / a practice screen. Confirm headings do not break layout (they may grow up to 1.4×).

- [ ] **Step 8: Commit**

```bash
git add src/theme/typography.ts src/theme/typography.test.ts app/_layout.tsx
git commit -m "feat(mobile): add Dynamic Type support with scaleFont and 1.4x cap"
```

---

## PR #3 — NativeTabs

### Task 5: Install `expo-symbols`

- [ ] **Step 1: Install**

Run: `pnpm add expo-symbols@~1.0.0`
Expected: installs cleanly.

- [ ] **Step 2: Verify no expo-doctor complaints**

Run: `pnpm exec expo-doctor` (if available; skip if not installed)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(mobile): add expo-symbols for SF Symbols"
```

### Task 6: Create `TabBarIcon` component

**Files:**
- Create: `mobile/src/components/navigation/TabBarIcon.tsx`

- [ ] **Step 1: Write**

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';
import { isIOS } from '@/lib/platform';

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  sfSymbol: string;
  mciName: MCIName;
  color: string;
  size?: number;
}

export function TabBarIcon({ sfSymbol, mciName, color, size = 26 }: Props) {
  if (isIOS) {
    return (
      <SymbolView
        name={sfSymbol as any}
        size={size}
        tintColor={color}
        weight="semibold"
      />
    );
  }
  return <MaterialCommunityIcons name={mciName} color={color} size={size} />;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation/TabBarIcon.tsx
git commit -m "feat(mobile): add TabBarIcon with SF Symbols on iOS"
```

### Task 7: Replace tabs layout with NativeTabs (iOS) / Tabs (Android)

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Delete: `mobile/src/components/navigation/CustomTabBar.tsx`

- [ ] **Step 1: Rewrite `_layout.tsx`**

```tsx
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { isIOS } from '@/lib/platform';

const TAB_CONFIG = [
  { name: 'index', title: 'Home', sf: 'house.fill', mci: 'home-variant' as const },
  { name: 'listen', title: 'Listen', sf: 'headphones', mci: 'headphones' as const },
  { name: 'speak', title: 'Speak', sf: 'waveform', mci: 'microphone' as const },
  { name: 'read', title: 'Read', sf: 'book.fill', mci: 'book-open-variant' as const },
  { name: 'write', title: 'Write', sf: 'pencil', mci: 'pencil' as const },
  { name: 'more', title: 'More', sf: 'ellipsis.circle.fill', mci: 'dots-horizontal-circle' as const },
];

const HIDDEN = ['library', 'vocabulary', 'settings'];

export default function TabLayout() {
  if (isIOS) {
    return (
      <NativeTabs>
        {TAB_CONFIG.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <Icon sf={t.sf as any} />
            <Label>{t.title}</Label>
          </NativeTabs.Trigger>
        ))}
        {HIDDEN.map((name) => (
          <NativeTabs.Trigger key={name} name={name} hidden />
        ))}
      </NativeTabs>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs screenOptions={{ headerShown: false }}>
        {TAB_CONFIG.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name={t.mci} color={color} size={size} />
              ),
            }}
          />
        ))}
        {HIDDEN.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
```

- [ ] **Step 2: Delete old CustomTabBar**

Run: `git rm src/components/navigation/CustomTabBar.tsx`

- [ ] **Step 3: Verify no imports remain**

Run: `grep -rn "CustomTabBar" src/ app/`
Expected: no results.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors. If NativeTabs API import path differs in installed expo-router version, consult `node_modules/expo-router/build/unstable-native-tabs.d.ts` and adjust the import.

- [ ] **Step 5: Manual smoke (iOS + Android)**

- iOS simulator: all 6 tabs render with SF Symbols; tap each; hidden routes (Library via More) still reachable.
- Android emulator: all 6 tabs render with MCI icons.

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): replace CustomTabBar with NativeTabs on iOS"
```

---

## PR #4 — Large Title + swipe-back

### Task 8: Large Title on root screens

**Files:**
- Modify: `mobile/app/_layout.tsx` (root Stack options)
- Modify: `mobile/app/(tabs)/index.tsx`, `library.tsx`, `vocabulary.tsx`, `settings.tsx`, `more.tsx`
- Modify: `mobile/app/review/index.tsx`, `mobile/app/wordbooks/index.tsx`

- [ ] **Step 1: Set root Stack defaults**

In `app/_layout.tsx`, inside the Stack, set default options:

```tsx
<Stack
  screenOptions={{
    headerLargeTitle: true,
    headerTransparent: false,
    headerLargeTitleShadowVisible: false,
    gestureEnabled: true,
  }}
>
```

- [ ] **Step 2: On each target screen, remove custom header and rely on Stack**

For each listed screen, remove any local `<View style={header}>` + Title block and instead export a `Stack.Screen` options via `export const unstable_settings` or set options inline:

```tsx
import { Stack } from 'expo-router';
// inside component return:
<>
  <Stack.Screen options={{ title: 'Home', headerLargeTitle: true }} />
  {/* existing ScrollView content */}
</>
```

For tabs screens, put `Stack.Screen` inside a parent stack; since tab screens don't own their own stack, apply Large Title via the root `(tabs)` layout:

Add a nested Stack in `app/(tabs)/_layout.tsx`? No — NativeTabs does not wrap a Stack. Instead, each tab screen must wrap its content in its own Stack. Use `expo-router`'s per-screen pattern:

Because NativeTabs tabs are not inside a Stack, Large Title must come from a nested Stack-style layout. Create a nested Stack layout per tab:

For the `index`, `library`, etc. tabs, leave the current SafeAreaView-based header as-is but restyle it to **mimic** Large Title (see Step 3).

- [ ] **Step 3: Large-Title mimic for tab root screens**

Since NativeTabs tabs render directly without a Stack, we implement Large Title as a scroll-coupled title. Create `src/components/navigation/LargeTitleHeader.tsx`:

```tsx
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';
import { isIOS } from '@/lib/platform';

interface Props {
  title: string;
  scrollY: SharedValue<number>;
}

export function LargeTitleHeader({ title, scrollY }: Props) {
  const { colors } = useAppTheme();

  const blurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolate.CLAMP),
  }));

  const largeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, 60], [1, 0.85], Extrapolate.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolate.CLAMP),
  }));

  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 60], [0, 1], Extrapolate.CLAMP),
  }));

  return (
    <View pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, blurStyle]} pointerEvents="none">
        {isIOS ? <BlurView tint="systemMaterial" intensity={40} style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />}
      </Animated.View>

      <Animated.View style={[styles.compact, compactStyle]} pointerEvents="none">
        <Text style={{ color: colors.onBackground, fontFamily: fontFamily.headingBold, fontSize: 17, fontWeight: '600' }}>{title}</Text>
      </Animated.View>

      <Animated.View style={[styles.large, largeStyle]} pointerEvents="none">
        <Text style={{ color: colors.onBackground, fontFamily: fontFamily.headingBold, fontSize: 34, fontWeight: '700', letterSpacing: 0.4 }}>{title}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { height: 44, justifyContent: 'center', alignItems: 'center' },
  large: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, position: 'absolute', top: 40, left: 0, right: 0 },
});
```

- [ ] **Step 4: Wire header in each root screen**

Pattern (example for `app/(tabs)/index.tsx`):

```tsx
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { LargeTitleHeader } from '@/components/navigation/LargeTitleHeader';

// inside component:
const scrollY = useSharedValue(0);
const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });

// replace <ScrollView> with:
<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: 96 }}>
  {/* existing content, minus the local <View style={styles.header}> title block */}
</Animated.ScrollView>
<View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }}>
  <LargeTitleHeader title="Home" scrollY={scrollY} />
</View>
```

Apply to: Home (title "Home"), Library ("Library"), Vocabulary ("Vocabulary"), Settings ("Settings"), More ("More"), Review index ("Review"), Wordbooks index ("Wordbooks").

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 6: Manual smoke**

iOS simulator → scroll each root screen → title shrinks and blur-bar fades in. Swipe-back from inner screens still works (already default for Stack screens like `/content/[id]`).

- [ ] **Step 7: Commit**

```bash
git add src/components/navigation/LargeTitleHeader.tsx app/
git commit -m "feat(mobile): add Large Title header on root scroll screens"
```

---

## PR #5 — Sheet component + modal migration

### Task 9: Install bottom-sheet

- [ ] **Step 1: Install**

Run: `pnpm add @gorhom/bottom-sheet@^5`
Expected: installs; no peer dep warnings (Reanimated 4.1.7 satisfies).

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(mobile): add @gorhom/bottom-sheet"
```

### Task 10: Create `Sheet` wrapper

**Files:**
- Create: `mobile/src/components/ui/Sheet.tsx`
- Modify: `mobile/app/_layout.tsx` (add `GestureHandlerRootView` + `BottomSheetModalProvider` at root)

- [ ] **Step 1: Wrap root providers**

Top-level order in `_layout.tsx`:
```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <BottomSheetModalProvider>
    <PaperProvider>...</PaperProvider>
  </BottomSheetModalProvider>
</GestureHandlerRootView>
```

- [ ] **Step 2: Write `Sheet.tsx`**

```tsx
import { BottomSheetModal, BottomSheetView, type BottomSheetModalProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { isIOS } from '@/lib/platform';
import { useAppTheme } from '@/contexts/ThemeContext';

export interface SheetRef {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  children: React.ReactNode;
  snapPoints?: BottomSheetModalProps['snapPoints'];
  onDismiss?: () => void;
}

export const Sheet = forwardRef<SheetRef, Props>(({ children, snapPoints = ['50%', '90%'], onDismiss }, ref) => {
  const { colors } = useAppTheme();
  const modalRef = useRef<BottomSheetModal>(null);
  const visibleAndroid = useRef(false);

  useImperativeHandle(ref, () => ({
    present: () => {
      if (isIOS) modalRef.current?.present();
      else visibleAndroid.current = true;
    },
    dismiss: () => {
      if (isIOS) modalRef.current?.dismiss();
      else { visibleAndroid.current = false; onDismiss?.(); }
    },
  }));

  if (isIOS) {
    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={snapPoints}
        onDismiss={onDismiss}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant }}
      >
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      </BottomSheetModal>
    );
  }

  return (
    <Modal visible={visibleAndroid.current} onRequestClose={onDismiss} animationType="slide" transparent>
      <View style={[styles.androidOverlay, { backgroundColor: colors.surface }]}>{children}</View>
    </Modal>
  );
});

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  androidOverlay: { flex: 1, marginTop: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Sheet.tsx app/_layout.tsx
git commit -m "feat(mobile): add Sheet wrapper over @gorhom/bottom-sheet"
```

### Task 11: Migrate ImportModal → Sheet

**Files:**
- Modify: `mobile/src/components/library/ImportModal.tsx`
- Modify: `mobile/app/(tabs)/library.tsx` (caller)

- [ ] **Step 1: Replace Paper `<Modal>` with `<Sheet>`**

Change the outer wrapper and the visibility control; pass `ref={sheetRef}` in parent, call `sheetRef.current?.present()` instead of `setVisible(true)`.

- [ ] **Step 2: Manual smoke** — open Import from Library, drag sheet between detents, swipe down to dismiss.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "feat(mobile): migrate ImportModal to iOS sheet"
```

### Task 12: Migrate EditContentModal → Sheet

**Files:**
- Modify: `mobile/src/components/library/EditContentModal.tsx`
- Modify: caller (typically a parent screen opens this via `visible` prop)

- [ ] **Step 1: Replace the Paper `<Modal>` wrapper with `<Sheet ref={sheetRef} onDismiss={onClose}>`**

```tsx
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { useRef, useEffect } from 'react';

const sheetRef = useRef<SheetRef>(null);
useEffect(() => { if (visible) sheetRef.current?.present(); else sheetRef.current?.dismiss(); }, [visible]);

return (
  <Sheet ref={sheetRef} snapPoints={['50%', '90%']} onDismiss={onClose}>
    {/* existing form contents */}
  </Sheet>
);
```

- [ ] **Step 2: Manual smoke** — open a Library item → Edit → sheet slides up with form, drag to large detent, save.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(mobile): migrate EditContentModal to iOS sheet"
```

### Task 13: Migrate VoiceSelector → Sheet

**Files:**
- Modify: `mobile/src/components/settings/VoiceSelector.tsx`

VoiceSelector currently accepts `visible` + `onDismiss`. Keep that API but internally use `Sheet`: expose a ref, in parent `useEffect` call `present()` when visible flips true. Or refactor caller to pass the sheetRef directly.

- [ ] **Step 1-3: Migrate**

- [ ] **Step 4: Manual smoke** — Settings → TTS Voice → sheet slides up with list, drag to large detent to see all voices.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(mobile): migrate VoiceSelector to iOS sheet"
```

### Task 14: Migrate TranslationPanel overlay → Sheet

**Files:**
- Modify: `mobile/src/components/read/TranslationPanel.tsx`

- [ ] **Step 1-3: Migrate**, keep the same show/hide logic.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(mobile): migrate TranslationPanel to iOS sheet"
```

---

## PR #6 — ContextMenu

### Task 15: Install ios-context-menu + prebuild

- [ ] **Step 1: Install**

Run: `pnpm add react-native-ios-context-menu@^3`
Expected: installs.

- [ ] **Step 2: Prebuild iOS**

Run: `pnpm prebuild --platform ios`
Expected: Pods install cleanly.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml ios/
git commit -m "chore(mobile): add react-native-ios-context-menu + prebuild"
```

### Task 16: Create ContextMenuItem wrapper

**Files:**
- Create: `mobile/src/components/ui/ContextMenuItem.tsx`

- [ ] **Step 1: Write**

```tsx
import { ContextMenuView } from 'react-native-ios-context-menu';
import { Pressable, View } from 'react-native';
import { isIOS } from '@/lib/platform';

export interface MenuAction {
  id: string;
  title: string;
  icon?: string;       // SF Symbol
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  actions: MenuAction[];
  onLongPressAndroid?: () => void; // Android fallback
  children: React.ReactNode;
}

export function ContextMenuItem({ actions, onLongPressAndroid, children }: Props) {
  if (isIOS) {
    return (
      <ContextMenuView
        menuConfig={{
          menuTitle: '',
          menuItems: actions.map((a) => ({
            actionKey: a.id,
            actionTitle: a.title,
            icon: a.icon ? { type: 'IMAGE_SYSTEM', imageValue: { systemName: a.icon } } : undefined,
            menuAttributes: a.destructive ? ['destructive'] : undefined,
          })),
        }}
        onPressMenuItem={({ nativeEvent }) => {
          const act = actions.find((a) => a.id === nativeEvent.actionKey);
          act?.onPress();
        }}
      >
        {children}
      </ContextMenuView>
    );
  }
  return (
    <Pressable onLongPress={onLongPressAndroid}>
      <View>{children}</View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ContextMenuItem.tsx
git commit -m "feat(mobile): add ContextMenuItem wrapper"
```

### Task 17: Wire ContextMenu on ContentCard

**Files:**
- Modify: `mobile/src/components/library/ContentCard.tsx`

- [ ] **Step 1: Wrap card root in `<ContextMenuItem actions={...}>`**

```tsx
<ContextMenuItem
  actions={[
    { id: 'play', title: 'Play', icon: 'play.fill', onPress: onPlay },
    { id: 'favorite', title: content.isFavorite ? 'Unfavorite' : 'Favorite', icon: 'star', onPress: onToggleFavorite },
    { id: 'edit', title: 'Edit', icon: 'pencil', onPress: onEdit },
    { id: 'delete', title: 'Delete', icon: 'trash', destructive: true, onPress: onDelete },
  ]}
  onLongPressAndroid={onOpenOverflow}
>
  {/* existing card JSX */}
</ContextMenuItem>
```

Add the missing handlers by lifting them through props or store access as existing pattern dictates.

- [ ] **Step 2: Manual smoke** — long-press a content card in Library → native iOS menu appears with 4 actions.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(mobile): add ContextMenu to ContentCard"
```

### Task 18: ContextMenu on Vocabulary + ConversationList

Apply the same pattern to:
- `mobile/src/components/vocabulary/*` (locate the card — currently rendered in `app/(tabs)/vocabulary.tsx`; add actions: Mark known / Reset SRS / Remove)
- `mobile/src/components/chat/ConversationList.tsx` (actions: Rename / Pin / Delete)

- [ ] **Step 1: Vocabulary card menu**

- [ ] **Step 2: Manual smoke Vocabulary**

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(mobile): add ContextMenu to Vocabulary card"
```

- [ ] **Step 4: Conversation list menu**

- [ ] **Step 5: Manual smoke Chat**

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(mobile): add ContextMenu to ConversationList"
```

---

## PR #7 — Background audio + Now Playing

### Task 19: Install track-player and add capabilities

- [ ] **Step 1: Install**

Run: `pnpm add react-native-track-player@^4`
Expected: installs.

- [ ] **Step 2: Update `app.json`**

Add under `ios.infoPlist`:
```json
{
  "UIBackgroundModes": ["audio"]
}
```

Add under `plugins`:
```json
[
  "expo-build-properties",
  { "ios": { "deploymentTarget": "15.1" } }
]
```

Register track-player's playback service via a separate file (Step 4).

- [ ] **Step 3: Prebuild**

Run: `pnpm prebuild --platform ios --clean`

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml app.json ios/
git commit -m "chore(mobile): add react-native-track-player + background audio capability"
```

### Task 20: Create `audio-session.ts`

**Files:**
- Create: `mobile/src/lib/audio-session.ts`
- Create: `mobile/src/lib/track-player-service.ts`

- [ ] **Step 1: Write `track-player-service.ts`**

```ts
import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
    const p = (await TrackPlayer.getProgress()).position;
    await TrackPlayer.seekTo(p + 15);
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
    const p = (await TrackPlayer.getProgress()).position;
    await TrackPlayer.seekTo(Math.max(0, p - 15));
  });
}
```

- [ ] **Step 2: Write `audio-session.ts`**

```ts
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

let initialized = false;

export async function initAudioSession() {
  if (initialized) return;
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  });
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
    capabilities: [
      Capability.Play, Capability.Pause, Capability.SeekTo,
      Capability.JumpForward, Capability.JumpBackward,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    forwardJumpInterval: 15,
    backwardJumpInterval: 15,
  });
  initialized = true;
}

export async function setNowPlaying(track: {
  id: string; url: string; title: string; artist?: string; artwork?: string; duration?: number;
}) {
  await TrackPlayer.reset();
  await TrackPlayer.add(track);
}

export async function playAudio() { await TrackPlayer.play(); }
export async function pauseAudio() { await TrackPlayer.pause(); }
export async function seekTo(seconds: number) { await TrackPlayer.seekTo(seconds); }
```

- [ ] **Step 3: Register service + init at app root**

In `app/_layout.tsx`:
```tsx
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@/lib/track-player-service';
import { initAudioSession } from '@/lib/audio-session';
import { useEffect } from 'react';

TrackPlayer.registerPlaybackService(() => PlaybackService);

// inside RootLayout component
useEffect(() => { void initAudioSession(); }, []);
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio-session.ts src/lib/track-player-service.ts app/_layout.tsx
git commit -m "feat(mobile): init TrackPlayer with background audio + remote controls"
```

### Task 21: Wire Listen practice through TrackPlayer

**Files:**
- Modify: `mobile/src/components/listen/CloudAudioPlayer.tsx`
- Modify: `mobile/app/practice/listen/[id].tsx`

- [ ] **Step 1: Replace local `Audio.Sound` calls with `setNowPlaying` + `playAudio` / `pauseAudio` / `seekTo`**

When user hits play:
```ts
await setNowPlaying({
  id: content.id,
  url: audioUrl,
  title: content.title,
  artist: 'EchoType',
  artwork: content.thumbnail,
  duration: content.duration,
});
await playAudio();
```

Subscribe to TrackPlayer progress events for the UI timeline:
```ts
import { useProgress } from 'react-native-track-player';
const { position, duration } = useProgress();
```

- [ ] **Step 2: Verify lock-screen controls**

Run: `pnpm ios`, start Listen practice on physical device (simulator's audio routing is unreliable), press power button to lock, confirm controls appear with title and artwork; pause/resume from lock screen work.

- [ ] **Step 3: Verify AirPods**

With AirPods connected: double-tap → play/pause; long-press (configured to Next/Previous in iOS settings) → triggers `RemoteJumpForward/Backward` → seeks ±15s. (Actual gesture mapping follows user's iOS AirPods settings; log `Event.RemoteNext/Previous` too if needed.)

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "feat(mobile): route Listen practice playback through TrackPlayer"
```

### Task 22: Ensure other practice audio stops TrackPlayer

**Files:**
- Modify: `mobile/app/practice/listen/[id].tsx` cleanup

- [ ] **Step 1: On screen unmount, call `TrackPlayer.reset()`** so Now Playing clears when user leaves practice.

- [ ] **Step 2: Manual smoke** — navigate away from Listen practice → lock-screen Now Playing disappears.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(mobile): clear Now Playing on Listen practice unmount"
```

---

## Final verification

### Task 23: Full regression walk

- [ ] **Step 1: Clean install**

```bash
rm -rf node_modules ios/Pods
pnpm install
pnpm prebuild --platform ios --clean
```

- [ ] **Step 2: Typecheck + lint + unit tests**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

All must pass.

- [ ] **Step 3: Manual acceptance matrix**

Run through the 8-row matrix in the spec (`mobile/docs/superpowers/specs/2026-04-18-ios-native-shell-design.md` §6) on iPhone 15 Pro (iOS 18), iPhone SE (iOS 17), Pixel emulator (Android).

- [ ] **Step 4: Acceptance checklist verified**

From spec §6 acceptance list:
1. `grep -rn "CustomTabBar" src/ app/` → empty ✅
2. `grep -rn "from 'expo-haptics'" src/ app/ --include="*.tsx" --include="*.ts"` → only `src/lib/haptics.ts` ✅
3. ImportModal / EditContentModal / VoiceSelector / TranslationPanel render as Sheet on iOS ✅
4. Listen lock-screen pause/play works ✅
5. AirPods double-tap jumps 15s ✅
6. XXL system font does not break any root screen ✅

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/mobile-native-app-plan
gh pr create --title "feat(mobile): iOS native shell (Phase A.1)" --body "$(cat <<'EOF'
## Summary
- NativeTabs with SF Symbols on iOS, MCI fallback on Android
- Large Title headers on root scroll screens
- iOS Sheet detents for modals (Import, EditContent, VoiceSelector, Translation)
- Native iOS ContextMenu on ContentCard / Vocabulary / ConversationList
- Semantic haptics API (tap/light/medium/success/warning/error)
- Dynamic Type support with 1.4× cap
- Background audio + Now Playing + Control Center + AirPods gestures via TrackPlayer

Spec: `mobile/docs/superpowers/specs/2026-04-18-ios-native-shell-design.md`

## Test plan
- [ ] iPhone 15 Pro iOS 18 — full acceptance matrix
- [ ] iPhone SE iOS 17 — compact tab bar, no label truncation
- [ ] Pixel Android — Material fallbacks render
- [ ] AirPods double-tap → play/pause on Listen practice
- [ ] Lock screen controls visible during Listen playback
- [ ] System font XXL → no broken layouts

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
