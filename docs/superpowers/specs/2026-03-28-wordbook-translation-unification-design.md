# WordBook Practice Translation Unification

## Problem

The `WordBookPractice` component (used by all four practice modules: listen, speak, read, write) is missing two features that other detail pages have:

1. **No word/title translation** — when learning "apple", no "苹果" is shown
2. **No TranslationBar toggle** — users must go to Settings to toggle translation on/off

Other detail pages (`listen/[id]`, `read/[id]`, `write/[id]`) all have `TranslationBar` + full sentence translation. The wordbook practice should match.

## Design Decisions

- **Dictionary-style word info**: phonetic + part of speech + translation (not just plain translation)
- **Hybrid data strategy**: free dictionary API for single-word phonetic/POS, Google Translate (existing `/api/translate/free`) for translation text
- **Always-visible phonetics**: phonetic and POS stay visible even when translation is toggled off
- **Unified treatment**: both `WordBookPractice` and `SingleItemPractice` get the same changes

## Data Layer

### New Hook: `useWordDictionary`

**Location:** `src/hooks/use-word-dictionary.ts`

**Signature:**
```typescript
interface WordDictionaryResult {
  translation: string;   // e.g. "苹果"
  phonetic: string;      // e.g. "/ˈæp.əl/"
  pos: string;           // e.g. "noun"
  isLoading: boolean;
}

function useWordDictionary(
  word: string,
  targetLang: string,
  enabled: boolean
): WordDictionaryResult
```

**Strategy — hybrid approach:**

1. **Single words** (detected by `word.trim().split(/\s+/).length === 1`): two parallel requests:
   - **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`) — client-side fetch (API supports CORS). Extracts `phonetic` and first `partOfSpeech` from response.
   - **Existing `/api/translate/free`** — server-side proxy to Google Translate for the translation text.
2. **Phrases/sentences** (multiple words): single request to `/api/translate/free` for translation only. No phonetic/POS available for multi-word phrases.
3. **Caching**: in-memory `Map<string, Result>` via `useRef`, keyed by `word::targetLang`.
4. **Request cancellation**: use a `cancelled` boolean flag (matching the pattern in existing `useItemTranslation` at `word-book-practice.tsx:104`) to ignore stale responses when the word changes during navigation.

**Relationship to existing hooks:**
- `useItemTranslation` (in `word-book-practice.tsx:84-124`) continues to handle **sentence/text** translation via the `SentenceTranslation` component. No changes to it.
- `useWordDictionary` handles **title/word** translation with added phonetic + POS data. These are separate concerns for separate UI areas — no overlap or duplication.

### Free Dictionary API Response Handling

The API returns an array of entries. Extract from the first entry:

```typescript
// Success response shape (simplified)
[{
  word: "apple",
  phonetic: "/ˈæp.əl/",
  phonetics: [{ text: "/ˈæp.əl/", audio: "..." }],
  meanings: [{ partOfSpeech: "noun", definitions: [...] }]
}]

// Error response (404 for unknown words)
{ title: "No Definitions Found", message: "...", resolution: "..." }
```

**Extraction logic:**
- `phonetic`: use top-level `phonetic` field; if empty, use first non-empty `phonetics[].text`
- `pos`: use first `meanings[0].partOfSpeech`
- On 404 or network error: set `phonetic` and `pos` to empty strings, continue with translation-only display

## API Changes

**None.** The existing `/api/translate/free` endpoint is used as-is. The Free Dictionary API is called directly from the client (it supports CORS). No new API routes needed.

## Component Changes

### New: `WordDictionaryInfo`

**Location:** `src/components/shared/word-dictionary-info.tsx`

Displays phonetic, POS, and translation for a word title.

```typescript
interface WordDictionaryInfoProps {
  word: string;
  targetLang: string;
  module: PracticeModule;
}
```

**Rendering logic:**
- Always renders phonetic and POS when available, regardless of translation toggle state
- Renders translation only when `usePracticeTranslationStore.isVisible(module)` is true
- Shows a subtle loading indicator (small `Loader2` spinner, not full-width) while fetching, to avoid layout shift
- When no dictionary data is available (phrase or API error), falls back to showing only the translation line (matching current `SentenceTranslation` style)

**Visual layout:**
```
/ˈæp.əl/ · noun          ← text-indigo-500, text-slate-400; always visible
苹果                      ← text-indigo-400/80; toggled by translation store
```

**Layout stability:** The component reserves a fixed `min-h-[1.5rem]` for the phonetic line and `min-h-[1.25rem]` for the translation line, preventing layout shift during loading or when data is absent.

### Modified: `WordBookPractice`

**File:** `src/components/shared/word-book-practice.tsx`

**Header change** — add `TranslationBar` in the existing flex row, between the title and the badge:

Current:
```tsx
<div className="flex items-center gap-3">
  [◀ Back]  [Title area]                    [3/20 badge]
</div>
```

After:
```tsx
<div className="flex items-center gap-3">
  [◀ Back]  [Title area]         [TranslationBar]  [3/20 badge]
</div>
```

The `TranslationBar` component is compact (icon button + optional select dropdown) and fits naturally in the flex row. On narrow viewports, the title area has `min-w-0` and `truncate` already, so it will shrink gracefully.

**Card title area** — add `WordDictionaryInfo` between the word+speaker row and the badges:

Current:
```
apple 🔊
[beginner] [food]
```

After:
```
apple 🔊
/ˈæp.əl/ · noun        ← WordDictionaryInfo (new)
苹果                    ← WordDictionaryInfo (new, toggled)
[beginner] [food]
```

**Existing `SentenceTranslation`** at line 1089 — no changes. It continues to handle the example sentence translation independently.

### Modified: `SingleItemPractice`

Same file. Same changes:

1. Add `TranslationBar` in a flex row above the card (between any parent heading and the card itself), matching the same compact style
2. Add `WordDictionaryInfo` in the title area, same position as in `WordBookPractice`

## Toggle Behavior

| Element | Translation ON | Translation OFF |
|---------|---------------|-----------------|
| Phonetic `/ˈæp.əl/` | Visible | Visible |
| POS `noun` | Visible | Visible |
| Word translation `苹果` | Visible | Hidden |
| Sentence translation `她吃了一个红苹果。` | Visible | Hidden |

All controlled by existing `usePracticeTranslationStore` — no new store needed.

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/use-word-dictionary.ts` | Create | Hybrid dictionary hook (free API + translate) |
| `src/components/shared/word-dictionary-info.tsx` | Create | Phonetic + POS + translation display component |
| `src/components/shared/word-book-practice.tsx` | Modify | Add TranslationBar to header + WordDictionaryInfo to title area in both WordBookPractice and SingleItemPractice |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Dictionary API 404 (unknown word) | Skip phonetic/POS, show translation only |
| Dictionary API network error | Skip phonetic/POS, show translation only |
| Google Translate error | Show phonetic/POS if available, translation line empty |
| Both fail | Word displays as-is (current behavior) |
| Multi-word phrase | No dictionary call; translation only via Google Translate |

## Out of Scope

- Dictionary data persistence/offline caching (IndexedDB)
- Pronunciation audio from dictionary API
- Multiple definitions/meanings display
- Changes to non-wordbook detail pages (they already have translation)
- Unit/E2E test additions (will be planned during implementation)
