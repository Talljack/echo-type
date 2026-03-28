# WordBook Practice Translation Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dictionary-style word translation (phonetic + POS + translation) and a TranslationBar toggle to the WordBookPractice and SingleItemPractice components.

**Architecture:** New `useWordDictionary` hook fetches phonetic/POS from free dictionary API and translation from existing Google Translate proxy, in parallel for single words. New `WordDictionaryInfo` component renders the data with always-visible phonetics and toggled translation. Both are integrated into the existing card layout.

**Tech Stack:** React 19 hooks, Free Dictionary API (dictionaryapi.dev), existing `/api/translate/free` endpoint, Zustand (`usePracticeTranslationStore`), Tailwind CSS v4.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/use-word-dictionary.ts` | Create | Hybrid hook: dictionary API (phonetic/POS) + translate API (translation) |
| `src/hooks/__tests__/use-word-dictionary.test.ts` | Create | Unit tests for the hook |
| `src/components/shared/word-dictionary-info.tsx` | Create | UI component: phonetic + POS + translation display |
| `src/components/shared/word-book-practice.tsx` | Modify | Add TranslationBar + WordDictionaryInfo to WordBookPractice and SingleItemPractice |

---

### Task 1: Create `useWordDictionary` Hook

**Files:**
- Create: `src/hooks/use-word-dictionary.ts`
- Create: `src/hooks/__tests__/use-word-dictionary.test.ts`

- [ ] **Step 1: Write tests for the hook**

Create `src/hooks/__tests__/use-word-dictionary.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWordDictionary } from '../use-word-dictionary';

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useWordDictionary', () => {
  it('returns empty state when disabled', () => {
    const { result } = renderHook(() => useWordDictionary('apple', 'zh-CN', false));
    expect(result.current.translation).toBe('');
    expect(result.current.phonetic).toBe('');
    expect(result.current.pos).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches dictionary + translation for single word', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [{ text: '/ˈæp.əl/' }],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      // /api/translate/free
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const { result } = renderHook(() => useWordDictionary('apple', 'zh-CN', true));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.phonetic).toBe('/ˈæp.əl/');
    expect(result.current.pos).toBe('noun');
    expect(result.current.translation).toBe('苹果');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetches translation only for multi-word phrases', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ translation: '红苹果' }),
    });

    const { result } = renderHook(() => useWordDictionary('red apple', 'zh-CN', true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.translation).toBe('红苹果');
    expect(result.current.phonetic).toBe('');
    expect(result.current.pos).toBe('');
    // Only one fetch call (translate), no dictionary API call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles dictionary API 404 gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({ title: 'No Definitions Found' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const { result } = renderHook(() => useWordDictionary('apple', 'zh-CN', true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.phonetic).toBe('');
    expect(result.current.pos).toBe('');
    expect(result.current.translation).toBe('苹果');
  });

  it('uses fallback phonetics array when top-level phonetic is empty', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'hello',
                phonetic: '',
                phonetics: [{ text: '' }, { text: '/həˈloʊ/' }],
                meanings: [{ partOfSpeech: 'exclamation', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '你好' }),
      });
    });

    const { result } = renderHook(() => useWordDictionary('hello', 'zh-CN', true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.phonetic).toBe('/həˈloʊ/');
    expect(result.current.pos).toBe('exclamation');
  });

  it('caches results and does not re-fetch', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const { result, rerender } = renderHook(
      ({ word, lang, enabled }) => useWordDictionary(word, lang, enabled),
      { initialProps: { word: 'apple', lang: 'zh-CN', enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Re-render with same args — should use cache
    rerender({ word: 'apple', lang: 'zh-CN', enabled: true });
    expect(mockFetch).toHaveBeenCalledTimes(2); // no new calls
    expect(result.current.translation).toBe('苹果');
  });

  it('clears result when disabled', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dictionaryapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                word: 'apple',
                phonetic: '/ˈæp.əl/',
                phonetics: [],
                meanings: [{ partOfSpeech: 'noun', definitions: [] }],
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ translation: '苹果' }),
      });
    });

    const { result, rerender } = renderHook(
      ({ enabled }) => useWordDictionary('apple', 'zh-CN', enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ enabled: false });
    expect(result.current.translation).toBe('');
    expect(result.current.phonetic).toBe('');
    expect(result.current.pos).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/__tests__/use-word-dictionary.test.ts`
Expected: FAIL — module `../use-word-dictionary` not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/use-word-dictionary.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{ partOfSpeech?: string; definitions?: unknown[] }>;
}

interface CachedResult {
  translation: string;
  phonetic: string;
  pos: string;
}

export interface WordDictionaryResult {
  translation: string;
  phonetic: string;
  pos: string;
  isLoading: boolean;
}

function isSingleWord(text: string): boolean {
  return text.trim().split(/\s+/).length === 1;
}

function extractPhonetic(entry: DictionaryEntry): string {
  if (entry.phonetic) return entry.phonetic;
  const fallback = entry.phonetics?.find((p) => p.text && p.text.length > 0);
  return fallback?.text || '';
}

function extractPos(entry: DictionaryEntry): string {
  return entry.meanings?.[0]?.partOfSpeech || '';
}

async function fetchDictionary(word: string): Promise<{ phonetic: string; pos: string }> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return { phonetic: '', pos: '' };
    const data = (await res.json()) as DictionaryEntry[];
    if (!Array.isArray(data) || data.length === 0) return { phonetic: '', pos: '' };
    return { phonetic: extractPhonetic(data[0]), pos: extractPos(data[0]) };
  } catch {
    return { phonetic: '', pos: '' };
  }
}

async function fetchTranslation(text: string, targetLang: string): Promise<string> {
  try {
    const res = await fetch('/api/translate/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { translation?: string };
    return data.translation || '';
  } catch {
    return '';
  }
}

export function useWordDictionary(word: string, targetLang: string, enabled: boolean): WordDictionaryResult {
  const [result, setResult] = useState<CachedResult>({ translation: '', phonetic: '', pos: '' });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setResult({ translation: '', phonetic: '', pos: '' });
      return;
    }

    if (!word) return;

    const key = `${word}::${targetLang}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResult(cached);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    async function load() {
      let phonetic = '';
      let pos = '';
      let translation = '';

      if (isSingleWord(word)) {
        const [dictResult, transResult] = await Promise.all([
          fetchDictionary(word),
          fetchTranslation(word, targetLang),
        ]);
        phonetic = dictResult.phonetic;
        pos = dictResult.pos;
        translation = transResult;
      } else {
        translation = await fetchTranslation(word, targetLang);
      }

      if (cancelled) return;

      const entry = { translation, phonetic, pos };
      cacheRef.current.set(key, entry);
      setResult(entry);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, word, targetLang]);

  return { ...result, isLoading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/__tests__/use-word-dictionary.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-word-dictionary.ts src/hooks/__tests__/use-word-dictionary.test.ts
git commit -m "feat: add useWordDictionary hook with hybrid dictionary + translate strategy"
```

---

### Task 2: Create `WordDictionaryInfo` Component

**Files:**
- Create: `src/components/shared/word-dictionary-info.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/shared/word-dictionary-info.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useWordDictionary } from '@/hooks/use-word-dictionary';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import type { PracticeModule } from '@/types/translation';

interface WordDictionaryInfoProps {
  word: string;
  targetLang: string;
  module: PracticeModule;
}

export function WordDictionaryInfo({ word, targetLang, module }: WordDictionaryInfoProps) {
  const showTranslation = usePracticeTranslationStore((s) => s.isVisible(module));
  const { phonetic, pos, translation, isLoading } = useWordDictionary(word, targetLang, true);

  const hasPhoneticOrPos = phonetic || pos;
  const hasTranslation = showTranslation && translation;

  if (isLoading) {
    return (
      <div className="min-h-[2.75rem] flex items-center justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!hasPhoneticOrPos && !hasTranslation) return null;

  return (
    <div className="space-y-0.5">
      {hasPhoneticOrPos && (
        <div className="min-h-[1.5rem] flex items-center justify-center gap-1.5">
          {phonetic && <span className="text-sm text-indigo-500">{phonetic}</span>}
          {phonetic && pos && <span className="text-xs text-slate-300">·</span>}
          {pos && <span className="text-xs text-slate-400">{pos}</span>}
        </div>
      )}
      {hasTranslation && (
        <p className="min-h-[1.25rem] text-[15px] text-indigo-400/80 text-center font-medium">
          {translation}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/word-dictionary-info.tsx
git commit -m "feat: add WordDictionaryInfo component for phonetic, POS, and translation display"
```

---

### Task 3: Add TranslationBar + WordDictionaryInfo to WordBookPractice

**Files:**
- Modify: `src/components/shared/word-book-practice.tsx`
  - Import section (lines 1-40)
  - Header area (lines 1013-1028)
  - Card title area (lines 1044-1069)

- [ ] **Step 1: Add imports**

At `src/components/shared/word-book-practice.tsx`, add two imports. After the existing import of `usePracticeTranslationStore` (line 36):

Add import for `TranslationBar`:
```typescript
import { TranslationBar } from '@/components/translation/translation-bar';
```

Add import for `WordDictionaryInfo`:
```typescript
import { WordDictionaryInfo } from '@/components/shared/word-dictionary-info';
```

- [ ] **Step 2: Add TranslationBar to the WordBookPractice header**

In the header section (around line 1013-1028), insert `<TranslationBar module={module} />` between the title div and the Badge.

Change the header from:

```tsx
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-indigo-900 truncate">
            {book ? `${book.emoji} ${book.nameEn}` : bookInfo ? `${bookInfo.emoji} ${bookInfo.name}` : bookId}
          </h1>
          <p className="text-xs text-indigo-500">{config.label} Mode</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-600 shrink-0 font-mono">
```

To:

```tsx
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-indigo-900 truncate">
            {book ? `${book.emoji} ${book.nameEn}` : bookInfo ? `${bookInfo.emoji} ${bookInfo.name}` : bookId}
          </h1>
          <p className="text-xs text-indigo-500">{config.label} Mode</p>
        </div>
        <TranslationBar module={module} />
        <Badge className="bg-indigo-100 text-indigo-600 shrink-0 font-mono">
```

- [ ] **Step 3: Add WordDictionaryInfo to the card title area**

In the card content section (around lines 1044-1069), insert `<WordDictionaryInfo>` between the title+speaker row and the badges row.

Change from:

```tsx
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {currentItem.difficulty && (
```

(The first `</div>` closes the `flex items-center justify-center gap-2` div containing the h2 title and Volume2 button.)

To:

```tsx
                  </div>
                  <WordDictionaryInfo word={currentItem.title} targetLang={targetLang} module={module} />
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {currentItem.difficulty && (
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/word-book-practice.tsx
git commit -m "feat: add TranslationBar and WordDictionaryInfo to WordBookPractice"
```

---

### Task 4: Add TranslationBar + WordDictionaryInfo to SingleItemPractice

**Files:**
- Modify: `src/components/shared/word-book-practice.tsx` (lines 1180-1241)

- [ ] **Step 1: Add TranslationBar above the SingleItemPractice card**

The `SingleItemPractice` component (line 1180) currently returns a bare `<Card>`. Wrap it to include a `TranslationBar` above the card.

Change from:

```tsx
export function SingleItemPractice({ item, module, persistProgress = true, onCompleted }: SingleItemPracticeProps) {
  const targetLang = useTTSStore((s) => s.targetLang);
  const { speak } = useTTS();

  return (
    <Card className="bg-white border-indigo-100 shadow-md">
```

To:

```tsx
export function SingleItemPractice({ item, module, persistProgress = true, onCompleted }: SingleItemPracticeProps) {
  const targetLang = useTTSStore((s) => s.targetLang);
  const { speak } = useTTS();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TranslationBar module={module} />
      </div>
      <Card className="bg-white border-indigo-100 shadow-md">
```

And change the closing from:

```tsx
      </CardContent>
    </Card>
  );
}
```

To:

```tsx
      </CardContent>
    </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add WordDictionaryInfo to SingleItemPractice title area**

In the SingleItemPractice card content (around lines 1187-1210), insert `<WordDictionaryInfo>` between the title+speaker row and the badges row, same pattern as Task 3.

Change from:

```tsx
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {item.difficulty && (
```

(The first `</div>` closes the `flex items-center justify-center gap-2` div containing the h2 title and Volume2 button.)

To:

```tsx
          </div>
          <WordDictionaryInfo word={item.title} targetLang={targetLang} module={module} />
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {item.difficulty && (
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/word-book-practice.tsx
git commit -m "feat: add TranslationBar and WordDictionaryInfo to SingleItemPractice"
```

---

### Task 5: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: all tests pass, including new `use-word-dictionary.test.ts`.

- [ ] **Step 2: Run lint + typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`

Verify in browser:
1. Navigate to `/listen` → pick a word book → practice page
2. Confirm: TranslationBar appears in header (🌐 icon + language dropdown when active)
3. Confirm: word title shows phonetic + POS below (e.g., `/ˈæp.əl/ · noun`)
4. Confirm: word translation appears below phonetic (e.g., `苹果`)
5. Toggle translation off via 🌐 button → phonetic/POS stay, translation hides
6. Navigate between words → data updates, no stale content
7. Test a multi-word phrase → shows translation only, no phonetic/POS

- [ ] **Step 4: Verify other modules work**

Navigate to `/read/book/[bookId]`, `/write/book/[bookId]`, `/speak/book/[bookId]` — all should show the same TranslationBar + dictionary info.
