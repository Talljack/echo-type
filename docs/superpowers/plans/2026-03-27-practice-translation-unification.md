# Practice Translation Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify translation behavior across listen, read, speak, and write while fixing selection popup semantics, sanitizing `= ...` inline explanations, and restoring reliable favorite behavior.

**Architecture:** Introduce a module-scoped translation visibility store so `listen/read` and `speak/write` can have different defaults without fighting each other. Rework page-level translation loading to always provide a free baseline translation, then refactor selection translation to use structured view data with separate display, speech, and favorite payloads. Finally, wire the new policy through all practice surfaces and lock it down with unit, store, component, and E2E coverage.

**Tech Stack:** Next.js App Router, React 19, Zustand, Tailwind CSS v4, Vercel AI SDK, Playwright, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-practice-translation-unification-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/types/translation.ts` | Shared contracts for module visibility policy, page-level translation view, and selection popup view |
| `src/stores/practice-translation-store.ts` | Module-scoped translation visibility defaults, toggles, persistence, and selectors |
| `src/stores/__tests__/practice-translation-store.test.ts` | Verifies per-module defaults, persistence, and toggle behavior |
| `src/lib/selection-translation-text.ts` | Sanitization helpers for `rawText`, `displayText`, `speechText`, and `favoriteText` |
| `src/lib/__tests__/selection-translation-text.test.ts` | Verifies `= ...` cleanup and safe fallback behavior |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/app/api/translate/free/route.ts` | Add batch sentence translation support and consistent fallback payloads |
| `src/app/api/translate/route.ts` | Extend selection mode response to support structured item/example fields and sanitized speech text |
| `src/hooks/use-translation.ts` | Always fetch baseline translation, support hidden-but-prefetched state, and expose page-ready view data |
| `src/stores/tts-store.ts` | Remove the global `showTranslation` flag from TTS settings and leave only language / voice concerns |
| `src/__tests__/tts-store.test.ts` | Update persistence expectations after removing `showTranslation` |
| `src/components/translation/translation-bar.tsx` | Accept current module and drive show/hide from `practice-translation-store` instead of `tts-store` |
| `src/components/translation/translation-display.tsx` | Render page translation from unified view data and preserve loading/error states |
| `src/components/shared/word-book-practice.tsx` | Use module policy for show/hide defaults and stop translating `speak` by default |
| `src/app/(app)/listen/[id]/page.tsx` | Replace global translation toggle usage with module-scoped policy and eager translation loading |
| `src/app/(app)/read/[id]/page.tsx` | Same module-scoped policy update plus default-visible translation |
| `src/app/(app)/write/[id]/page.tsx` | Same module-scoped policy update plus default-hidden translation |
| `src/app/(app)/speak/free/page.tsx` | Pass `module="speak"` into the top translation toggle |
| `src/app/(app)/speak/[scenarioId]/page.tsx` | Pass `module="speak"` into the top translation toggle |
| `src/hooks/use-conversation.ts` | Route `speak:toggle-translation` through the new module-scoped store |
| `src/app/(app)/settings/page.tsx` | Replace the single “Show by default” toggle with per-module default visibility controls |
| `src/components/selection-translation/selection-translation-provider.tsx` | Send structured selection context, sanitize display/speech payloads, and keep favorite action available after base translation |
| `src/components/selection-translation/selection-translation-popup.tsx` | Render explicit favorite feedback and separate item/example content |
| `src/components/selection-translation/translation-content.tsx` | Split word / phrase / sentence layouts and render example sentence below item meaning |
| `src/stores/favorite-store.ts` | Support favorite payloads that store item meaning separately from example context if current shape is insufficient |
| `e2e/listen.spec.ts` | Cover sanitized sentence display and listen detail translation visibility |
| `e2e/wordbook-practice.spec.ts` | Cover read default-visible, speak default-hidden, write default-hidden, and toggle behavior |

### Test Files

| File | What It Tests |
|------|--------------|
| `src/stores/__tests__/practice-translation-store.test.ts` | Module defaults and local persistence |
| `src/lib/__tests__/selection-translation-text.test.ts` | `= ...` cleanup without over-stripping |
| `src/__tests__/tts-store.test.ts` | TTS settings persistence after decoupling translation visibility |
| `e2e/listen.spec.ts` | Listen page translation defaults and selection popup sanitization |
| `e2e/wordbook-practice.spec.ts` | Read / speak / write translation visibility policy |

---

## Task 1: Introduce Module-Scoped Translation Visibility

**Files:**
- Create: `src/types/translation.ts`
- Create: `src/stores/practice-translation-store.ts`
- Create: `src/stores/__tests__/practice-translation-store.test.ts`
- Modify: `src/stores/tts-store.ts`
- Modify: `src/__tests__/tts-store.test.ts`

- [ ] **Step 1: Write the failing store tests**

Create `src/stores/__tests__/practice-translation-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});

const { usePracticeTranslationStore } = await import('../practice-translation-store');

describe('practice-translation-store', () => {
  beforeEach(() => {
    storage.clear();
    usePracticeTranslationStore.getState().resetForTests();
  });

  it('uses module defaults from the spec', () => {
    const store = usePracticeTranslationStore.getState();
    expect(store.isVisible('listen')).toBe(true);
    expect(store.isVisible('read')).toBe(true);
    expect(store.isVisible('speak')).toBe(false);
    expect(store.isVisible('write')).toBe(false);
  });

  it('toggles one module without mutating the others', () => {
    const store = usePracticeTranslationStore.getState();
    store.toggle('speak');
    expect(store.isVisible('speak')).toBe(true);
    expect(store.isVisible('read')).toBe(true);
    expect(store.isVisible('write')).toBe(false);
  });

  it('hydrates persisted per-module visibility', () => {
    storage.set(
      'echotype_practice_translation',
      JSON.stringify({ listen: false, read: true, speak: true, write: false }),
    );

    usePracticeTranslationStore.getState().hydrate();
    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/stores/__tests__/practice-translation-store.test.ts`

Expected: FAIL with `Cannot find module '../practice-translation-store'`

- [ ] **Step 3: Implement the store and shared types**

Create `src/types/translation.ts`:

```ts
export type PracticeModule = 'listen' | 'read' | 'speak' | 'write';

export interface PracticeTranslationPolicy {
  defaultVisible: boolean;
  allowToggle: boolean;
}

export const PRACTICE_TRANSLATION_POLICY: Record<PracticeModule, PracticeTranslationPolicy> = {
  listen: { defaultVisible: true, allowToggle: true },
  read: { defaultVisible: true, allowToggle: true },
  speak: { defaultVisible: false, allowToggle: true },
  write: { defaultVisible: false, allowToggle: true },
};
```

Create `src/stores/practice-translation-store.ts`:

```ts
import { create } from 'zustand';
import { PRACTICE_TRANSLATION_POLICY, type PracticeModule } from '@/types/translation';

const STORAGE_KEY = 'echotype_practice_translation';

type VisibilityState = Record<PracticeModule, boolean>;

function getDefaultVisibility(): VisibilityState {
  return {
    listen: PRACTICE_TRANSLATION_POLICY.listen.defaultVisible,
    read: PRACTICE_TRANSLATION_POLICY.read.defaultVisible,
    speak: PRACTICE_TRANSLATION_POLICY.speak.defaultVisible,
    write: PRACTICE_TRANSLATION_POLICY.write.defaultVisible,
  };
}

interface PracticeTranslationStore {
  visibility: VisibilityState;
  hydrate: () => void;
  isVisible: (module: PracticeModule) => boolean;
  setVisible: (module: PracticeModule, visible: boolean) => void;
  toggle: (module: PracticeModule) => void;
  resetForTests: () => void;
}
```

Update `src/stores/tts-store.ts` and `src/__tests__/tts-store.test.ts` to remove `showTranslation`, `setShowTranslation`, and `toggleTranslation` so translation visibility is no longer a TTS concern.

- [ ] **Step 4: Run the store tests and TTS store tests**

Run: `pnpm vitest run src/stores/__tests__/practice-translation-store.test.ts src/__tests__/tts-store.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/translation.ts src/stores/practice-translation-store.ts src/stores/__tests__/practice-translation-store.test.ts src/stores/tts-store.ts src/__tests__/tts-store.test.ts
git commit -m "refactor: scope translation visibility by practice module"
```

---

## Task 2: Make Page-Level Translation Always Available

**Files:**
- Modify: `src/app/api/translate/free/route.ts`
- Modify: `src/hooks/use-translation.ts`
- Modify: `src/components/translation/translation-display.tsx`

- [ ] **Step 1: Write the failing translation hook test**

Create or extend `src/hooks/__tests__/use-translation.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslation } from '../use-translation';

describe('useTranslation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefetches translations even when the current module starts hidden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ translations: ['垃圾', '把垃圾拿出去'] }),
        }),
      ) as unknown as typeof fetch,
    );

    const { result } = renderHook(() =>
      useTranslation('trash. Take out the trash.', 'zh-CN', { shouldPrefetch: true, visible: false }),
    );

    await waitFor(() => expect(result.current.sentenceTranslations?.length).toBe(2));
    expect(result.current.isReady).toBe(true);
  });
});
```

- [ ] **Step 2: Run the hook test to verify it fails**

Run: `pnpm vitest run src/hooks/__tests__/use-translation.test.ts`

Expected: FAIL because `useTranslation` does not accept the new options shape and does not prefetch hidden translations

- [ ] **Step 3: Extend the free translate endpoint and hook**

Update `src/app/api/translate/free/route.ts` to accept both:

```ts
{ text: string, targetLang: string }
```

and

```ts
{ sentences: string[], targetLang: string }
```

Return:

```ts
{ translation: string, engine: 'google-free' }
```

or

```ts
{ translations: string[], engine: 'google-free' }
```

Update `src/hooks/use-translation.ts` to:

- accept `{ visible, shouldPrefetch }` instead of a single `enabled` boolean
- always fetch the free translation baseline when `shouldPrefetch` is true
- keep `sentenceTranslations` populated even when the UI is hidden
- expose `isReady` so pages know when translation exists but is hidden

Suggested signature:

```ts
export function useTranslation(
  text: string,
  targetLang: string,
  options: { visible: boolean; shouldPrefetch?: boolean },
) {
  // ...
}
```

Update `src/components/translation/translation-display.tsx` so it renders from `sentenceTranslations` when visible, but preserves hidden-prefetched state without clearing data.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/hooks/__tests__/use-translation.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/translate/free/route.ts src/hooks/use-translation.ts src/components/translation/translation-display.tsx src/hooks/__tests__/use-translation.test.ts
git commit -m "feat: prefetch baseline practice translations"
```

---

## Task 3: Sanitize Selection Text and Define a Structured Popup Contract

**Files:**
- Create: `src/lib/selection-translation-text.ts`
- Create: `src/lib/__tests__/selection-translation-text.test.ts`
- Modify: `src/app/api/translate/route.ts`
- Modify: `src/components/selection-translation/selection-translation-provider.tsx`
- Modify: `src/components/selection-translation/translation-content.tsx`
- Modify: `src/components/selection-translation/selection-translation-popup.tsx`

- [ ] **Step 1: Write the failing sanitization tests**

Create `src/lib/__tests__/selection-translation-text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSelectionTextPayload } from '../selection-translation-text';

describe('buildSelectionTextPayload', () => {
  it('removes inline explanation fragments from display and speech text', () => {
    const payload = buildSelectionTextPayload(
      'Will someone take out the trash (= take it outside the house)?',
      'trash',
    );

    expect(payload.displayText).toBe('Will someone take out the trash?');
    expect(payload.speechText).toBe('Will someone take out the trash?');
    expect(payload.speechText.includes('=')).toBe(false);
  });

  it('keeps favoriteText equal to the selected learning item', () => {
    const payload = buildSelectionTextPayload('Will someone take out the trash?', 'trash');
    expect(payload.favoriteText).toBe('trash');
  });
});
```

- [ ] **Step 2: Run the sanitization test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/selection-translation-text.test.ts`

Expected: FAIL with `Cannot find module '../selection-translation-text'`

- [ ] **Step 3: Implement the sanitization utility and structured response**

Create `src/lib/selection-translation-text.ts`:

```ts
const INLINE_EXPLANATION_RE = /\s*\(=\s*[^)]+\)|\s*=\s*[^.?!]+(?=[.?!]|$)/g;

export function sanitizeSelectionSentence(rawText: string): string {
  const cleaned = rawText.replace(INLINE_EXPLANATION_RE, '').replace(/\s{2,}/g, ' ').trim();
  return cleaned || rawText.trim();
}

export function buildSelectionTextPayload(contextText: string, selectedText: string) {
  const displayText = sanitizeSelectionSentence(contextText);
  return {
    rawText: contextText,
    displayText,
    speechText: displayText.replace(/=/g, '').trim(),
    favoriteText: selectedText.trim(),
  };
}
```

Update `src/app/api/translate/route.ts` so selection mode can accept:

```ts
{
  text: string;
  context?: string;
  includeRelated: true;
  selectionType: 'word' | 'phrase' | 'sentence';
}
```

and return:

```ts
{
  itemTranslation: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  related?: RelatedData;
}
```

Update the selection provider and popup to:

- keep free translation as the first available result
- pass `context` into `/api/translate`
- build `displayText`, `speechText`, and `favoriteText` from `selection-translation-text.ts`
- render word cards as “meaning first, example below”
- render sentence cards as “translation first, sanitized sentence below”
- keep the favorite button available once the baseline result exists

- [ ] **Step 4: Run the sanitization tests**

Run: `pnpm vitest run src/lib/__tests__/selection-translation-text.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/selection-translation-text.ts src/lib/__tests__/selection-translation-text.test.ts src/app/api/translate/route.ts src/components/selection-translation/selection-translation-provider.tsx src/components/selection-translation/translation-content.tsx src/components/selection-translation/selection-translation-popup.tsx
git commit -m "fix: structure and sanitize selection translations"
```

---

## Task 4: Wire the New Translation Policy Through Practice Pages

**Files:**
- Modify: `src/components/translation/translation-bar.tsx`
- Modify: `src/app/(app)/listen/[id]/page.tsx`
- Modify: `src/app/(app)/read/[id]/page.tsx`
- Modify: `src/app/(app)/write/[id]/page.tsx`
- Modify: `src/components/shared/word-book-practice.tsx`
- Modify: `src/app/(app)/speak/free/page.tsx`
- Modify: `src/app/(app)/speak/[scenarioId]/page.tsx`
- Modify: `src/hooks/use-conversation.ts`

- [ ] **Step 1: Write the failing visibility policy test**

Extend `e2e/wordbook-practice.spec.ts`:

```ts
test('read shows translation by default but speak hides it by default', async ({ page }) => {
  await page.goto('/read/book/airport');
  await waitForPracticeCard(page);
  await expect(page.locator('.bg-indigo-50\\/50')).toContainText(/[\u4e00-\u9fff]/);

  await page.goto('/speak/book/airport');
  await waitForPracticeCard(page);
  await expect(page.locator('.bg-indigo-50\\/50')).not.toContainText(/[\u4e00-\u9fff]/);
});
```

- [ ] **Step 2: Run the E2E test to verify it fails**

Run: `pnpm exec playwright test e2e/wordbook-practice.spec.ts --grep "read shows translation by default"`

Expected: FAIL because `showTranslation` is global and `speak` currently renders sentence translations by default

- [ ] **Step 3: Implement module-aware page wiring**

Update `src/components/translation/translation-bar.tsx` to accept:

```ts
export function TranslationBar({ module }: { module: PracticeModule }) {
  const visible = usePracticeTranslationStore((s) => s.isVisible(module));
  const toggle = usePracticeTranslationStore((s) => s.toggle);
  // ...
}
```

Update all practice surfaces to pass their module explicitly:

- `listen/[id]/page.tsx` -> `module="listen"`
- `read/[id]/page.tsx` -> `module="read"`
- `write/[id]/page.tsx` -> `module="write"`
- `speak/free/page.tsx` and `speak/[scenarioId]/page.tsx` -> `module="speak"`

Update `word-book-practice.tsx` so:

- `listen` and `read` show `SentenceTranslation` immediately
- `speak` and `write` only show it when the module store says visible

Update shortcut handlers so:

- `listen:toggle-translation` toggles only `listen`
- `read:toggle-translation` toggles only `read`
- `write:toggle-translation` toggles only `write`
- `speak:toggle-translation` toggles only `speak`

- [ ] **Step 4: Run the targeted tests**

Run:

```bash
pnpm exec playwright test e2e/wordbook-practice.spec.ts --grep "read shows translation by default"
pnpm exec playwright test e2e/wordbook-practice.spec.ts --grep "loads speak practice page"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/translation/translation-bar.tsx src/app/'(app)'/listen/[id]/page.tsx src/app/'(app)'/read/[id]/page.tsx src/app/'(app)'/write/[id]/page.tsx src/components/shared/word-book-practice.tsx src/app/'(app)'/speak/free/page.tsx src/app/'(app)'/speak/[scenarioId]/page.tsx src/hooks/use-conversation.ts e2e/wordbook-practice.spec.ts
git commit -m "feat: apply per-module translation visibility in practice flows"
```

---

## Task 5: Fix Listen Popup Favorites and Sanitized Speech End-to-End

**Files:**
- Modify: `src/components/selection-translation/selection-translation-provider.tsx`
- Modify: `src/components/selection-translation/selection-translation-popup.tsx`
- Modify: `src/stores/favorite-store.ts`
- Modify: `e2e/listen.spec.ts`

- [ ] **Step 1: Write the failing listen E2E coverage**

Extend `e2e/listen.spec.ts`:

```ts
test('selection popup shows word meaning, sanitized example, and working favorite action', async ({ page }) => {
  await navigateToContentDetail(page, 'listen');

  const sentence = page.getByText(/take out the trash/i).first();
  await sentence.selectText();

  await expect(page.getByRole('dialog', { name: 'Translation popup' })).toBeVisible();
  await expect(page.getByText(/垃圾|废物/)).toBeVisible();
  await expect(page.getByText('Will someone take out the trash?')).toBeVisible();
  await expect(page.getByText(/=\s*take it outside the house/)).not.toBeVisible();

  await page.getByRole('button', { name: /收藏|已收藏/ }).click();
  await expect(page.getByRole('button', { name: /已收藏/ })).toBeVisible();
});
```

- [ ] **Step 2: Run the listen E2E test to verify it fails**

Run: `pnpm exec playwright test e2e/listen.spec.ts --grep "selection popup shows word meaning"`

Expected: FAIL because the popup still displays mixed sentence translation or unsanitized context

- [ ] **Step 3: Finish the favorite and speech-path refactor**

Update the selection popup to:

- compare speech recognition result against `favoriteText` rather than raw context
- call TTS with `speechText` instead of `selection.text` when sentence or phrase context is present
- show a lightweight inline error if `addFavorite` or `removeFavorite` rejects

Update `favorite-store.ts` only if the current `FavoriteItem` shape cannot hold:

```ts
translation: string; // itemTranslation
context?: string; // example sentence
notes?: string; // optional example translation if no dedicated field exists yet
```

Do not broaden the schema unless the existing shape is truly insufficient.

- [ ] **Step 4: Run the listen E2E test**

Run: `pnpm exec playwright test e2e/listen.spec.ts --grep "selection popup shows word meaning"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/selection-translation/selection-translation-provider.tsx src/components/selection-translation/selection-translation-popup.tsx src/stores/favorite-store.ts e2e/listen.spec.ts
git commit -m "fix: restore listen popup favorites and sanitized speech"
```

---

## Task 6: Update Settings UI and Run Full Verification

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `e2e/listen.spec.ts`
- Modify: `e2e/wordbook-practice.spec.ts`

- [ ] **Step 1: Write the failing settings test or manual verification note**

If there is no existing settings test harness, add a TODO comment to the plan execution log and verify manually during implementation:

```md
Manual check: Settings → Translation shows four module defaults instead of one global "Show by default" toggle.
```

- [ ] **Step 2: Run the existing test suite before changing settings**

Run:

```bash
pnpm vitest run src/stores/__tests__/practice-translation-store.test.ts src/lib/__tests__/selection-translation-text.test.ts src/__tests__/tts-store.test.ts
pnpm exec playwright test e2e/listen.spec.ts e2e/wordbook-practice.spec.ts
```

Expected: PASS except for the settings UI gap you are about to fix

- [ ] **Step 3: Replace the single global settings toggle**

Update the Translation section in `src/app/(app)/settings/page.tsx` from:

```tsx
<Toggle value={showTranslation} onChange={setShowTranslation} />
```

to a per-module settings list:

```tsx
{(['listen', 'read', 'speak', 'write'] as const).map((module) => (
  <Toggle
    key={module}
    value={usePracticeTranslationStore.getState().isVisible(module)}
    onChange={(next) => usePracticeTranslationStore.getState().setVisible(module, next)}
  />
))}
```

Keep `targetLang` in the same section.

- [ ] **Step 4: Run the final verification**

Run:

```bash
pnpm vitest run src/stores/__tests__/practice-translation-store.test.ts src/lib/__tests__/selection-translation-text.test.ts src/__tests__/tts-store.test.ts
pnpm exec playwright test e2e/listen.spec.ts e2e/wordbook-practice.spec.ts
pnpm lint
```

Expected: all commands PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/'(app)'/settings/page.tsx e2e/listen.spec.ts e2e/wordbook-practice.spec.ts
git commit -m "chore: align translation settings with module defaults"
```

---

## Execution Notes

- Do not keep `showTranslation` in `tts-store` as a compatibility alias. Remove it fully so there is one source of truth.
- Prefer extending `/api/translate/free` for baseline sentence coverage instead of requiring provider credentials for page-level translation.
- Keep selection translation resilient: free translation first, enrichment second.
- Avoid schema migrations unless favorite payload shape truly blocks the structured popup contract.
- If `word-book-practice.tsx` becomes difficult to reason about, split only the translation-related UI into a focused child component. Do not refactor unrelated practice logic.
