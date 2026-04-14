# Mobile MVP Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the `mobile/` Expo app to a truthful local-first MVP by removing fake capability claims, fixing dead-end navigation, and tightening the UI around real working flows.

**Architecture:** Keep `mobile` on `Zustand + AsyncStorage + SecureStore` for this phase. Add a thin feature-helper layer where it improves testability, route all content practice through a real content detail screen, and downgrade unsupported imports, chat, translation, and sync behavior from implied production features to explicit MVP states.

**Tech Stack:** Expo Router, React Native, React Native Paper, Zustand, AsyncStorage, SecureStore, Jest with `react-test-renderer`, TypeScript.

---

## File Map

### New Files

- `mobile/jest.config.js`
  Sets up a stable local Jest runner for `mobile/`.
- `mobile/jest.setup.ts`
  Common mocks used by mobile unit and snapshot tests.
- `mobile/src/features/library/import-capabilities.ts`
  Single source of truth for which import methods are enabled in the MVP.
- `mobile/src/features/library/__tests__/import-capabilities.test.ts`
  Verifies enabled and disabled import methods.
- `mobile/src/lib/import/__tests__/unsupported-imports.test.ts`
  Verifies unsupported imports fail cleanly without writing fake content.
- `mobile/src/features/content/get-practice-actions.ts`
  Maps a content item to the four available practice actions and route targets.
- `mobile/src/features/content/__tests__/get-practice-actions.test.ts`
  Verifies content detail action mapping.
- `mobile/src/features/content/get-dashboard-module-route.ts`
  Maps dashboard module cards to their honest MVP destinations.
- `mobile/src/features/content/__tests__/dashboard-entry-routes.test.ts`
  Verifies dashboard routing intent for Listen, Speak, Read, and Write.
- `mobile/app/content/[id].tsx`
  Content detail screen and branching point for Listen, Speak, Read, Write.
- `mobile/src/components/ui/MvpNoticeCard.tsx`
  Shared notice surface for “local demo”, “coming soon”, and “not available yet” states.
- `mobile/src/components/ui/__tests__/MvpNoticeCard.test.tsx`
  Snapshot test for the shared notice card.
- `mobile/src/features/library/__tests__/readme-truth.test.ts`
  Verifies the mobile README describes the truthful MVP architecture.

### Existing Files to Modify

- `mobile/package.json`
  Make the local test command reliable for `mobile`.
- `mobile/README.md`
  Replace WatermelonDB and full-sync claims with truthful MVP wording.
- `mobile/app/(tabs)/library.tsx`
  Route content taps to the content detail screen and simplify import behavior.
- `mobile/src/components/library/ImportModal.tsx`
  Show only real MVP import options, or explicit disabled states.
- `mobile/src/lib/import/url.ts`
  Return unsupported errors for URL and YouTube imports in this phase.
- `mobile/src/lib/import/pdf.ts`
  Return unsupported error instead of creating fake content.
- `mobile/src/lib/import/ai.ts`
  Return unsupported error instead of creating fake content.
- `mobile/src/components/library/ContentCard.tsx`
  Remove emoji source badges, tighten metadata, and improve action clarity.
- `mobile/app/(tabs)/index.tsx`
  Turn the dashboard into a clearer decision screen and fix module routing.
- `mobile/app/(tabs)/listen.tsx`
  Convert from duplicate content list into module home behavior.
- `mobile/app/(tabs)/speak.tsx`
  Convert from duplicate content list into module home behavior.
- `mobile/app/practice/read/[id].tsx`
  Replace fake translation copy with honest MVP notice behavior.
- `mobile/src/components/read/TranslationPanel.tsx`
  Render an unsupported/MVP message instead of pretending translation is real.
- `mobile/app/chat/index.tsx`
  Add MVP demo framing to the chat list entry point.
- `mobile/app/chat/[id].tsx`
  Add local-demo framing and remove misleading AI language.
- `mobile/src/components/chat/ConversationList.tsx`
  Update header and empty state copy to reflect local tutor demo behavior.
- `mobile/app/review/index.tsx`
  Reframe sample cards as demo data and clarify future word collection behavior.
- `mobile/app/(tabs)/settings.tsx`
  Reword auth and sync copy so sign-in is optional and sync is not overstated.
- `mobile/src/components/navigation/CustomTabBar.tsx`
  Add hit slop and improve touch-target safety.

## Task 1: Stabilize Mobile Test Infrastructure

**Files:**
- Create: `mobile/jest.config.js`
- Create: `mobile/jest.setup.ts`
- Modify: `mobile/package.json`
- Test: `mobile/components/__tests__/StyledText-test.js`

- [ ] **Step 1: Write a failing alias-based smoke test update**

Replace the existing snapshot import so the test uses the same alias style as the mobile app:

```js
import renderer from 'react-test-renderer';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';

it('renders the MVP notice card', () => {
  const tree = renderer.create(<MvpNoticeCard title="Local Demo" body="Runs without cloud sync." />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

- [ ] **Step 2: Run the mobile test command to verify it fails**

Run:

```bash
cd mobile && npm test -- --runInBand components/__tests__/StyledText-test.js
```

Expected:

```text
FAIL components/__tests__/StyledText-test.js
Cannot find module '@/components/ui/MvpNoticeCard'
```

- [ ] **Step 3: Add the minimal mobile Jest setup**

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-paper|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo/.*)/)',
  ],
};
```

Create `mobile/jest.setup.ts`:

```ts
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');

  return {
    Text,
  };
});
```

Update `mobile/package.json`:

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.7"
  },
  "scripts": {
    "test": "jest --runInBand"
  }
}
```

- [ ] **Step 4: Add the minimal component under test and rerun**

Create `mobile/src/components/ui/MvpNoticeCard.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface MvpNoticeCardProps {
  title: string;
  body: string;
}

export function MvpNoticeCard({ title, body }: MvpNoticeCardProps) {
  return (
    <View style={styles.card}>
      <Text variant="titleSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16 },
  title: { color: '#312E81', fontWeight: '600', marginBottom: 6 },
  body: { color: '#4B5563' },
});
```

Run:

```bash
cd mobile && npm test -- --runInBand components/__tests__/StyledText-test.js
```

Expected:

```text
PASS components/__tests__/StyledText-test.js
```

The snapshot should render the `MvpNoticeCard` tree rather than `null`.

- [ ] **Step 5: Commit**

```bash
git add mobile/jest.config.js mobile/jest.setup.ts mobile/package.json mobile/components/__tests__/StyledText-test.js mobile/src/components/ui/MvpNoticeCard.tsx
git commit -m "test: stabilize mobile jest runner"
```

## Task 2: Gate Import Capabilities to Real MVP Behavior

**Files:**
- Create: `mobile/src/features/library/import-capabilities.ts`
- Create: `mobile/src/features/library/__tests__/import-capabilities.test.ts`
- Create: `mobile/src/lib/import/__tests__/unsupported-imports.test.ts`
- Modify: `mobile/src/components/library/ImportModal.tsx`
- Modify: `mobile/src/lib/import/url.ts`
- Modify: `mobile/src/lib/import/pdf.ts`
- Modify: `mobile/src/lib/import/ai.ts`

- [ ] **Step 1: Write the failing capability and unsupported-import tests**

Create `mobile/src/features/library/__tests__/import-capabilities.test.ts`:

```ts
import { getImportOptions, isImportMethodEnabled } from '../import-capabilities';

describe('import capabilities', () => {
  it('only enables text import in the MVP', () => {
    expect(isImportMethodEnabled('text')).toBe(true);
    expect(isImportMethodEnabled('url')).toBe(false);
    expect(isImportMethodEnabled('youtube')).toBe(false);
    expect(isImportMethodEnabled('pdf')).toBe(false);
    expect(isImportMethodEnabled('ai')).toBe(false);
  });

  it('marks non-text import methods as coming soon', () => {
    expect(getImportOptions().filter((item) => item.enabled)).toEqual([
      expect.objectContaining({ method: 'text', enabled: true }),
    ]);
    expect(getImportOptions().filter((item) => !item.enabled)).toHaveLength(4);
  });
});
```

Create `mobile/src/lib/import/__tests__/unsupported-imports.test.ts`:

```ts
import { generateWithAI } from '../ai';
import { importFromPDF } from '../pdf';
import { importFromUrl, importFromYouTube } from '../url';

describe('unsupported import paths', () => {
  it('returns unsupported for url import', async () => {
    await expect(importFromUrl('https://example.com')).resolves.toEqual(
      expect.objectContaining({ success: false }),
    );
  });

  it('returns unsupported for youtube import', async () => {
    await expect(importFromYouTube('https://youtu.be/demo')).resolves.toEqual(
      expect.objectContaining({ success: false }),
    );
  });

  it('returns unsupported for pdf import', async () => {
    await expect(importFromPDF()).resolves.toEqual(expect.objectContaining({ success: false }));
  });

  it('returns unsupported for ai generation', async () => {
    await expect(
      generateWithAI({ topic: 'Travel', difficulty: 'beginner', length: 'short', language: 'en' }),
    ).resolves.toEqual(expect.objectContaining({ success: false }));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/library/__tests__/import-capabilities.test.ts src/lib/import/__tests__/unsupported-imports.test.ts
```

Expected:

```text
FAIL .../import-capabilities.test.ts
Cannot find module '../import-capabilities'
```

- [ ] **Step 3: Add the capability helper**

Create `mobile/src/features/library/import-capabilities.ts`:

```ts
export type ImportMethod = 'url' | 'youtube' | 'pdf' | 'text' | 'ai';

export interface ImportOption {
  method: ImportMethod;
  label: string;
  enabled: boolean;
  note?: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
  { method: 'text', label: 'Text', enabled: true },
  { method: 'url', label: 'URL', enabled: false, note: 'Coming soon in the mobile MVP' },
  { method: 'youtube', label: 'YouTube', enabled: false, note: 'Coming soon in the mobile MVP' },
  { method: 'pdf', label: 'PDF', enabled: false, note: 'Coming soon in the mobile MVP' },
  { method: 'ai', label: 'AI', enabled: false, note: 'Coming soon in the mobile MVP' },
];

export function getImportOptions(): ImportOption[] {
  return IMPORT_OPTIONS;
}

export function isImportMethodEnabled(method: ImportMethod): boolean {
  return IMPORT_OPTIONS.some((item) => item.method === method && item.enabled);
}
```

- [ ] **Step 4: Make unsupported imports fail cleanly and update the modal**

Update the unsupported import functions to return the same structured error:

```ts
return {
  success: false,
  error: 'This import method is not available in the current mobile MVP.',
};
```

Update `mobile/src/components/library/ImportModal.tsx` so only `text` is offered as an active segmented button:

```tsx
const importOptions = getImportOptions();
const enabledButtons = importOptions.filter((item) => item.enabled).map((item) => ({
  value: item.method,
  label: item.label,
}));
```

Add a disabled notice below the controls:

```tsx
<MvpNoticeCard
  title="More import methods are coming later"
  body="URL, YouTube, PDF, and AI generation are intentionally disabled in the current mobile MVP."
/>
```

- [ ] **Step 5: Rerun the tests and verify they pass**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/library/__tests__/import-capabilities.test.ts src/lib/import/__tests__/unsupported-imports.test.ts
```

Expected:

```text
PASS src/features/library/__tests__/import-capabilities.test.ts
PASS src/lib/import/__tests__/unsupported-imports.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/library/import-capabilities.ts mobile/src/features/library/__tests__/import-capabilities.test.ts mobile/src/lib/import/__tests__/unsupported-imports.test.ts mobile/src/components/library/ImportModal.tsx mobile/src/lib/import/url.ts mobile/src/lib/import/pdf.ts mobile/src/lib/import/ai.ts
git commit -m "feat: limit mobile imports to real MVP paths"
```

## Task 3: Add Content Detail Routing and Practice Action Mapping

**Files:**
- Create: `mobile/src/features/content/get-practice-actions.ts`
- Create: `mobile/src/features/content/__tests__/get-practice-actions.test.ts`
- Create: `mobile/app/content/[id].tsx`
- Modify: `mobile/app/(tabs)/library.tsx`
- Modify: `mobile/src/components/library/ContentCard.tsx`

- [ ] **Step 1: Write the failing practice-action mapping test**

Create `mobile/src/features/content/__tests__/get-practice-actions.test.ts`:

```ts
import { getPracticeActions } from '../get-practice-actions';

describe('getPracticeActions', () => {
  it('returns all four practice routes for a valid content id', () => {
    expect(getPracticeActions('demo-1')).toEqual([
      { key: 'listen', label: 'Listen', route: '/practice/listen/demo-1' },
      { key: 'speak', label: 'Speak', route: '/practice/speak/demo-1' },
      { key: 'read', label: 'Read', route: '/practice/read/demo-1' },
      { key: 'write', label: 'Write', route: '/practice/write/demo-1' },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/content/__tests__/get-practice-actions.test.ts
```

Expected:

```text
FAIL .../get-practice-actions.test.ts
Cannot find module '../get-practice-actions'
```

- [ ] **Step 3: Implement the route helper**

Create `mobile/src/features/content/get-practice-actions.ts`:

```ts
export function getPracticeActions(contentId: string) {
  return [
    { key: 'listen', label: 'Listen', route: `/practice/listen/${contentId}` },
    { key: 'speak', label: 'Speak', route: `/practice/speak/${contentId}` },
    { key: 'read', label: 'Read', route: `/practice/read/${contentId}` },
    { key: 'write', label: 'Write', route: `/practice/write/${contentId}` },
  ] as const;
}
```

- [ ] **Step 4: Add the content detail screen and wire up library taps**

Create `mobile/app/content/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { getPracticeActions } from '@/features/content/get-practice-actions';
import { useLibraryStore } from '@/stores/useLibraryStore';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));

  if (!content) {
    return (
      <Screen>
        <MvpNoticeCard title="Content not found" body="The selected content item no longer exists in local storage." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>{content.title}</Text>
        <Text variant="bodyMedium" style={styles.meta}>
          {content.source.toUpperCase()} · {content.difficulty} · {content.metadata?.wordCount || 0} words
        </Text>
        <Text variant="bodyLarge" style={styles.body}>{content.text}</Text>
        <View style={styles.actions}>
          {getPracticeActions(content.id).map((action) => (
            <Button key={action.key} mode="contained" onPress={() => router.push(action.route as any)}>
              {action.label}
            </Button>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontWeight: '700' },
  meta: { color: '#6B7280' },
  body: { color: '#374151', lineHeight: 26 },
  actions: { gap: 12 },
});
```

Update `mobile/app/(tabs)/library.tsx`:

```tsx
const handleContentPress = (contentId: string) => {
  router.push(`/content/${contentId}`);
};
```

Update `mobile/src/components/library/ContentCard.tsx` to remove emoji source markers and replace them with a text badge:

```tsx
<Text variant="labelSmall" style={styles.source}>
  {content.source.toUpperCase()}
</Text>
```

- [ ] **Step 5: Rerun the test and perform route verification**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/content/__tests__/get-practice-actions.test.ts
cd mobile && npm run type-check
```

Expected:

```text
PASS src/features/content/__tests__/get-practice-actions.test.ts
```

Then manually verify:

```bash
cd mobile && npm run web
```

Manual check:

- Open Library
- Tap a content card
- Confirm content detail opens
- Confirm all four practice buttons navigate

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/content/get-practice-actions.ts mobile/src/features/content/__tests__/get-practice-actions.test.ts mobile/app/content/[id].tsx mobile/app/\(tabs\)/library.tsx mobile/src/components/library/ContentCard.tsx
git commit -m "feat: add mobile content detail and practice branching"
```

## Task 4: Rework Home, Listen, and Speak into Honest Entry Screens

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`
- Modify: `mobile/app/(tabs)/listen.tsx`
- Modify: `mobile/app/(tabs)/speak.tsx`
- Modify: `mobile/app/(tabs)/library.tsx`

- [ ] **Step 1: Write a failing route-intent helper test**

Create `mobile/src/features/content/__tests__/dashboard-entry-routes.test.ts`:

```ts
import { getDashboardModuleRoute } from '../get-dashboard-module-route';

describe('getDashboardModuleRoute', () => {
  it('routes read and write to the library picker intent', () => {
    expect(getDashboardModuleRoute('read')).toBe('/(tabs)/library?mode=read');
    expect(getDashboardModuleRoute('write')).toBe('/(tabs)/library?mode=write');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/content/__tests__/dashboard-entry-routes.test.ts
```

Expected:

```text
FAIL .../dashboard-entry-routes.test.ts
Cannot find module '../get-dashboard-module-route'
```

- [ ] **Step 3: Implement the helper**

Create `mobile/src/features/content/get-dashboard-module-route.ts`:

```ts
export function getDashboardModuleRoute(moduleId: 'listen' | 'speak' | 'read' | 'write') {
  switch (moduleId) {
    case 'listen':
      return '/(tabs)/listen';
    case 'speak':
      return '/(tabs)/speak';
    case 'read':
      return '/(tabs)/library?mode=read';
    case 'write':
      return '/(tabs)/library?mode=write';
  }
}
```

- [ ] **Step 4: Update the three entry screens**

Update `mobile/app/(tabs)/index.tsx` module routes:

```tsx
import { getDashboardModuleRoute } from '@/features/content/get-dashboard-module-route';

route: getDashboardModuleRoute('read'),
```

Update `mobile/app/(tabs)/library.tsx` to show the practice intent banner when `mode` is present:

```tsx
import { useLocalSearchParams } from 'expo-router';

const { mode } = useLocalSearchParams<{ mode?: 'read' | 'write' }>();

{mode ? (
  <MvpNoticeCard
    title={`Pick content for ${mode === 'read' ? 'Read' : 'Write'}`}
    body="Choose a saved text below to continue into the selected practice mode."
  />
) : null}
```

Update `mobile/app/(tabs)/listen.tsx` to remove the duplicate content list and replace it with a module home layout:

```tsx
<MvpNoticeCard
  title="Listen from your library"
  body="Choose a saved text from Library to start listening practice. Recent session stats stay here."
/>

<Button mode="contained" onPress={() => router.push('/(tabs)/library')}>
  Choose from Library
</Button>
```

Update `mobile/app/(tabs)/speak.tsx` similarly:

```tsx
<MvpNoticeCard
  title="Speak from your library"
  body="Choose a saved text from Library to start speaking practice. Recent score summaries stay here."
/>

<Button mode="contained" onPress={() => router.push('/(tabs)/library')}>
  Choose from Library
</Button>
```

- [ ] **Step 5: Rerun the test and verify manually**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/content/__tests__/dashboard-entry-routes.test.ts
cd mobile && npm run type-check
```

Expected:

```text
PASS src/features/content/__tests__/dashboard-entry-routes.test.ts
```

Manual check:

```bash
cd mobile && npm run web
```

Confirm:

- Dashboard `Read` routes to Library with read intent.
- Dashboard `Write` routes to Library with write intent.
- Listen no longer duplicates the full library list.
- Speak no longer duplicates the full library list.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/content/get-dashboard-module-route.ts mobile/src/features/content/__tests__/dashboard-entry-routes.test.ts mobile/app/\(tabs\)/index.tsx mobile/app/\(tabs\)/listen.tsx mobile/app/\(tabs\)/speak.tsx mobile/app/\(tabs\)/library.tsx
git commit -m "feat: turn mobile module tabs into honest entry screens"
```

## Task 5: Make Chat, Review, Read Translation, and Settings Honest About MVP Limits

**Files:**
- Create: `mobile/src/components/ui/__tests__/MvpNoticeCard.test.tsx`
- Modify: `mobile/app/chat/index.tsx`
- Modify: `mobile/app/chat/[id].tsx`
- Modify: `mobile/src/components/chat/ConversationList.tsx`
- Modify: `mobile/app/review/index.tsx`
- Modify: `mobile/app/practice/read/[id].tsx`
- Modify: `mobile/src/components/read/TranslationPanel.tsx`
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Write a failing shared-notice snapshot test**

Create `mobile/src/components/ui/__tests__/MvpNoticeCard.test.tsx`:

```tsx
import renderer from 'react-test-renderer';
import { MvpNoticeCard } from '../MvpNoticeCard';

describe('MvpNoticeCard', () => {
  it('renders title and body copy', () => {
    const tree = renderer
      .create(<MvpNoticeCard title="Local Tutor Demo" body="Responses are simulated in the mobile MVP." />)
      .toJSON();

    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run the snapshot test and verify it fails**

Run:

```bash
cd mobile && npm test -- --runInBand src/components/ui/__tests__/MvpNoticeCard.test.tsx
```

Expected:

```text
FAIL .../MvpNoticeCard.test.tsx
New snapshot was not written
```

- [ ] **Step 3: Update MVP-limited surfaces to use explicit copy**

Update `mobile/src/components/chat/ConversationList.tsx`:

```tsx
<Text variant="titleLarge" style={styles.title}>
  Local Tutor Demo
</Text>
<Text variant="bodySmall" style={styles.subtitle}>
  Conversation history is saved locally. Responses are simulated in this MVP.
</Text>
```

Update `mobile/app/chat/[id].tsx`:

```tsx
<MvpNoticeCard
  title="Local demo responses"
  body="This chat screen keeps the conversation shell and local history, but it does not call a live AI provider in the current mobile MVP."
/>
```

Update `mobile/src/components/read/TranslationPanel.tsx`:

```tsx
<Text variant="labelMedium" style={styles.headerText}>
  Translation unavailable
</Text>
<Text variant="bodyLarge" style={styles.translationText}>
  Translation is not connected in the mobile MVP yet.
</Text>
```

Update `mobile/app/review/index.tsx` empty state:

```tsx
<Text variant="bodyMedium" style={styles.emptyText}>
  Review works locally, but vocabulary collection is not connected yet.
</Text>
<Button mode="outlined" onPress={addSampleCards}>
  Load Demo Cards
</Button>
```

Update `mobile/app/(tabs)/settings.tsx` account and sync copy:

```tsx
<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
  Sign in is optional. The current mobile MVP stores learning data locally on this device.
</Text>
```

- [ ] **Step 4: Rerun the snapshot test and type-check**

Run:

```bash
cd mobile && npm test -- --runInBand src/components/ui/__tests__/MvpNoticeCard.test.tsx
cd mobile && npm run type-check
```

Expected:

```text
PASS src/components/ui/__tests__/MvpNoticeCard.test.tsx
```

- [ ] **Step 5: Manual verification**

Run:

```bash
cd mobile && npm run web
```

Confirm:

- Chat list and detail both say “local demo” clearly.
- Read translation no longer pretends a translation exists.
- Review frames demo cards as demo data.
- Settings no longer imply full sync is already working.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/ui/__tests__/MvpNoticeCard.test.tsx mobile/app/chat/index.tsx mobile/app/chat/\[id\].tsx mobile/src/components/chat/ConversationList.tsx mobile/app/review/index.tsx mobile/app/practice/read/\[id\].tsx mobile/src/components/read/TranslationPanel.tsx mobile/app/\(tabs\)/settings.tsx
git commit -m "feat: align mobile MVP copy with real capabilities"
```

## Task 6: Normalize Navigation Touch Safety, Card Styling, and Documentation

**Files:**
- Modify: `mobile/src/components/navigation/CustomTabBar.tsx`
- Modify: `mobile/src/components/library/ContentCard.tsx`
- Modify: `mobile/README.md`

- [ ] **Step 1: Write a failing documentation truth check**

Add a lightweight content assertion test in `mobile/src/features/library/__tests__/readme-truth.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

describe('mobile README truth', () => {
  it('describes async storage MVP instead of WatermelonDB', () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toContain('AsyncStorage');
    expect(readme).not.toContain('WatermelonDB');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/library/__tests__/readme-truth.test.ts
```

Expected:

```text
FAIL .../readme-truth.test.ts
Expected substring: "AsyncStorage"
Received string containing "WatermelonDB"
```

- [ ] **Step 3: Update the tab bar and content card interaction safety**

Update `mobile/src/components/navigation/CustomTabBar.tsx`:

```tsx
<Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={10} accessibilityRole="button">
```

Update `mobile/src/components/library/ContentCard.tsx`:

```tsx
<TouchableOpacity
  style={styles.card}
  onPress={onPress}
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel={`Open ${content.title}`}
>
```

Tighten metadata emphasis:

```tsx
<Text variant="labelSmall" style={styles.wordCount}>
  {(content.metadata?.wordCount || 0).toLocaleString()} words
</Text>
```

- [ ] **Step 4: Rewrite the mobile README to match the MVP**

Replace the architecture section in `mobile/README.md` with:

```md
## Tech Stack

- **Framework**: Expo (SDK 54) + React Native
- **Navigation**: Expo Router
- **Local Persistence**: Zustand + AsyncStorage
- **Secure Storage**: Expo SecureStore
- **Backend**: Optional Supabase authentication
- **UI Library**: React Native Paper

## Current MVP Scope

- Manual text import is supported.
- Practice data is stored locally on the device.
- Listen, Speak, Read, Write routes are available for saved content.
- Review works locally with demo-card support.
- Chat is a local tutor demo unless a real provider is added later.
```

- [ ] **Step 5: Rerun the README truth test and final checks**

Run:

```bash
cd mobile && npm test -- --runInBand src/features/library/__tests__/readme-truth.test.ts
cd mobile && npm run lint
cd mobile && npm run type-check
```

Expected:

```text
PASS src/features/library/__tests__/readme-truth.test.ts
```

- [ ] **Step 6: Final manual verification**

Run:

```bash
cd mobile && npm run web
```

Confirm:

- Bottom tab targets feel easy to hit.
- Library cards read cleanly without emoji badges.
- README now matches actual app behavior.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/features/library/__tests__/readme-truth.test.ts mobile/src/components/navigation/CustomTabBar.tsx mobile/src/components/library/ContentCard.tsx mobile/README.md
git commit -m "docs: align mobile README and polish MVP interactions"
```

## Coverage Check

- Product truth: covered in Tasks 2, 5, and 6.
- Import gating: covered in Task 2.
- Content detail and practice branching: covered in Task 3.
- Honest module home behavior: covered in Task 4.
- Honest chat, review, translation, and settings copy: covered in Task 5.
- Touch targets and card polish: covered in Task 6.
- Documentation alignment: covered in Task 6.
