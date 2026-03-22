# Selection Translation & Learning Favorites — Design Spec

> Date: 2026-03-22
> Status: In Review
> Scope: Two new features for EchoType — text selection translation popup and learning favorites system

## 1. Overview

### Problem

- Users encounter unknown words/phrases during practice but have no way to get instant translations without leaving the app flow
- The existing translation system is page-level toggle only (全文翻译开关), not selection-based
- No mechanism to save/bookmark specific words or phrases for focused review
- FSRS review system is practice-driven only — users can't proactively mark items for review

### Solution

Two complementary features:
1. **Selection Translation** — global text selection popup with instant translation, pronunciation, context, and related recommendations
2. **Learning Favorites** — independent favorites system with multi-folder organization, FSRS-integrated review, and smart auto-collection

### Design Principles

- Selection → Translate → Collect → Review: seamless closed loop
- Non-intrusive: never block the learning flow
- Web & Desktop (Tauri): identical behavior, no platform-specific code needed (Selection API works in Tauri webview)

---

## 2. Data Model

### 2.1 New Tables (Dexie v9)

#### `favorites` table

```typescript
interface RelatedData {
  synonyms?: string[];
  wordFamily?: { word: string; pos: string }[];
  relatedPhrases?: string[];
  keyVocabulary?: { word: string; translation: string }[];
}

interface FavoriteItem {
  id: string;                    // nanoid
  text: string;                  // original text (word/phrase/sentence)
  normalizedText: string;        // lowercase, trimmed, punctuation-stripped (for dedup matching)
  translation: string;           // translation result
  type: 'word' | 'phrase' | 'sentence';
  folderId: string;              // folder ID ('default' for default)
  sourceContentId?: string;      // content ID where this was collected from
  sourceModule?: string;         // module: 'listen' | 'read' | 'write' | 'speak' | 'library' | 'chat'
  context?: string;              // surrounding sentence for context
  targetLang: string;            // translation target language
  pronunciation?: string;        // phonetic transcription (for words)
  notes?: string;                // user notes
  related?: RelatedData;         // structured related words/phrases from AI (stored as native object in IndexedDB)
  fsrsCard?: FSRSCardData;       // FSRS spaced repetition data
  nextReview?: number;           // next review timestamp
  autoCollected: boolean;        // whether this was auto-collected
  createdAt: number;
  updatedAt: number;
}
```

#### `favoriteFolders` table

```typescript
interface FavoriteFolder {
  id: string;                    // nanoid; 'default' and 'auto' are reserved
  name: string;
  emoji: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
}
```

#### `lookupHistory` table

Lightweight persistent lookup counter for tracking cross-session word lookups (used by smart auto-collection).

```typescript
interface LookupEntry {
  text: string;                  // primary key (normalized: lowercase, trimmed)
  count: number;                 // total lookup count
  lastLookedUp: number;          // timestamp of last lookup
}
```

#### Dexie schema upgrade

**IMPORTANT:** Dexie requires every `version(N)` call to carry forward the full schema of all tables. The snippet below shows ALL tables (existing v8 + new v9).

```typescript
db.version(9).stores({
  // Existing tables (carried forward verbatim from v8)
  contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
  records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
  sessions: 'id, contentId, module, startTime, completed',
  books: 'id, title, source, createdAt',
  conversations: 'id, updatedAt, createdAt',
  // New tables (v9)
  favorites: 'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
  favoriteFolders: 'id, sortOrder, createdAt',
  lookupHistory: 'text, count, lastLookedUp',
});
```

#### Default folders (seeded on first load)

```typescript
const DEFAULT_FOLDERS: FavoriteFolder[] = [
  { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: Date.now() },
  { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: Date.now() },
];
```

### 2.2 Text Normalization

All text matching (dedup, lookup counting) uses a canonical normalized form:

```typescript
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?;:'"()[\]{}]/g, '');
}
```

- `isFavorited()` and `getFavoriteByText()` match by `normalizedText` index
- `lookupHistory` uses `normalizeText(text)` as the primary key

### 2.3 Sync Mapper Extension

Add `favorites` and `favoriteFolders` to `sync/mapper.ts` for Supabase cloud sync. Create corresponding Supabase migration for the new tables.

**Folder deletion sync:** Folder deletions are local-first in v1. When a folder is deleted, items are moved to 'default' locally. Full cross-device folder sync conflict resolution is deferred to a later version.

---

## 3. Selection Translation Feature

### 3.1 Architecture

```
SelectionTranslationProvider (context, mounted in (app)/layout.tsx)
  └─ SelectionTranslationPopup (floating UI, rendered via Portal)
       ├─ Header: original text + icons (TTS, listen, copy, close)
       ├─ Body: phonetic + translation + context sentence
       ├─ Footer: favorite button + folder selector
       └─ Related: collapsible related recommendations
```

### 3.2 Core Component: `SelectionTranslationProvider`

**Location:** `src/components/selection-translation/selection-translation-provider.tsx`

**Responsibilities:**
- Listen to `mouseup` events on document (primary trigger)
- On `mouseup`, check `document.getSelection()` for valid selection (trimmed length > 0)
- **Debounce:** Debounce the translation API call by 300ms after `mouseup`. Cancel any in-flight request if a new selection is made before the debounce fires.
- Calculate popup position via `Range.getBoundingClientRect()`
- Determine selection type: word (no spaces), phrase (2-5 words), sentence (6+ words or ends with `.?!`)
- Extract context sentence from the selection's surrounding text node
- Detect current module from `usePathname()` for `sourceModule`
- Detect current content ID: use `useContentStore.getState().activeContentId` (Zustand direct access outside render cycle)

**Exclusion zones** (don't trigger popup):
- Inside `<input>`, `<textarea>`, `<select>`, `[contenteditable]` elements
- Inside elements with `data-no-selection-translate` attribute (for the Write typing area)
- When the Command Palette or a Dialog is open (detect via `useShortcutStore.getState().paused`)

### 3.3 Translation API

**Reuse existing** `/api/translate` endpoint. The existing route already supports single-text translation mode.

**Enhancement:** Add optional parameters. When `includeRelated` is absent or `false`, the response shape is **identical to the current API** — fully backward compatible. Existing consumers (`useTranslation` hook, `TranslationBar`, etc.) are unaffected.

New request fields:
```typescript
{
  // ...existing fields unchanged...
  includeRelated?: boolean;       // request related words (default: false)
  selectionType?: 'word' | 'phrase' | 'sentence';  // hint for LLM prompt
}
```

When `includeRelated: true`, the system prompt additionally asks the LLM to return:
- For words: `synonyms` (string[]) + `wordFamily` ({ word: string, pos: string }[])
- For phrases: `relatedPhrases` (string[])
- For sentences: `keyVocabulary` ({ word: string, translation: string }[])

**Response shape** (additive — new fields are only present when `includeRelated: true`):

```typescript
interface TranslationResponse {
  // Existing fields (always present)
  translation: string;
  providerId?: string;
  credentialSource?: string;
  // New fields (only when includeRelated: true)
  pronunciation?: string;       // phonetic (IPA)
  related?: RelatedData;        // same type as FavoriteItem.related
}
```

### 3.4 Popup UI States

#### Header (all types)
- Left: translate icon + original text (or type badge for phrases/sentences)
- Right icon bar: 🔊 TTS button (speaks the word/phrase via current TTS engine), 🎧 Listen button (creates a temporary content item and navigates to `/listen/[id]`), 📋 Copy button (copies original text + translation to clipboard), ✕ Close button

#### Body — varies by type

**Word:**
- Phonetic transcription (IPA)
- Translation
- Context sentence with the word highlighted

**Phrase:**
- Type badge ("短语")
- Translation
- Context sentence with the phrase highlighted

**Sentence:**
- Type badge ("句子")
- Translation
- No context block (the sentence IS the context)

#### Footer (all types)
- ♡ Favorite button (toggles to green ✓ "已收藏" when saved)
- Folder selector dropdown

#### Related Recommendations (collapsible, all types)
- Default: expanded
- Click "相关推荐" header to collapse/expand
- Content varies by type (see above)
- Clicking a related word triggers a new translation for that word (reuses same popup, updates content)

### 3.5 Popup Positioning & Sizing

- Preferred: below the selection, horizontally centered on the selection
- If not enough space below: position above the selection
- If near viewport edges: adjust horizontal position to stay within viewport with 12px margin
- Width: `min(340px, calc(100vw - 24px))` for mobile responsiveness
- Max height: `400px` with `overflow-y: auto` for long sentence translations
- Text inside wraps normally within the popup width
- Animation: slide-up fade-in (200ms ease)

### 3.6 Popup Lifecycle

1. `mouseup` with valid selection → show popup, debounce 300ms → start translate API call
2. Click outside popup → dismiss
3. Press `Esc` → dismiss
4. New selection while popup open → cancel in-flight request, reposition, debounce new translate
5. Scroll → reposition (throttled at 100ms)
6. Route change → dismiss

### 3.7 Caching

- Module-level `Map<string, TranslationResponse>` shared across the selection translation system
- Keyed by `${normalizeText(text)}::${targetLang}`
- **Not shared** with the existing `useTranslation` hook (which uses per-instance `useRef<Map>`) — they are independent caches to avoid architectural coupling
- No persistence — cache lives for the browser session

### 3.8 Lookup Counter

- Each unique translation lookup calls `db.lookupHistory.get(normalizedText)`:
  - If exists: increment `count`, update `lastLookedUp`
  - If not: insert with `count: 1`
- The `lookupHistory` table persists across sessions in IndexedDB
- If `count >= threshold` (default: 3) and word is not already favorited → trigger auto-collect (see §5)

### 3.9 Accessibility

- Popup uses `role="dialog"` and `aria-label="Translation popup"`
- Focus moves to the popup when it appears; returns to the previously focused element on dismiss
- All buttons have `aria-label` attributes
- Related recommendations list is keyboard-navigable (arrow keys + Enter to select)
- `Esc` to dismiss is already specified in lifecycle

---

## 4. Learning Favorites Feature

### 4.1 Store: `favorite-store.ts`

**Location:** `src/stores/favorite-store.ts`

**State:**
```typescript
interface FavoriteState {
  favorites: FavoriteItem[];
  folders: FavoriteFolder[];
  activeFolderId: string | null;  // null = "All"
  isLoaded: boolean;

  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'normalizedText' | 'createdAt' | 'updatedAt' | 'autoCollected' | 'fsrsCard'>) => Promise<string>;
    // Defaults: autoCollected=false, fsrsCard=new FSRS card, normalizedText=computed
  removeFavorite: (id: string) => Promise<void>;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => Promise<void>;
  isFavorited: (text: string) => boolean;        // matches by normalizedText
  getFavoriteByText: (text: string) => FavoriteItem | undefined;  // matches by normalizedText

  // Folders
  addFolder: (folder: Omit<FavoriteFolder, 'id' | 'createdAt'>) => Promise<string>;
  updateFolder: (id: string, updates: Partial<FavoriteFolder>) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;   // moves items to 'default', cannot delete 'default'/'auto'

  // Filters
  setActiveFolderId: (id: string | null) => void;
  getFilteredFavorites: () => FavoriteItem[];
  getDueForReview: () => FavoriteItem[];

  // FSRS
  gradeReview: (id: string, rating: Rating) => Promise<void>;
}
```

### 4.2 Navigation

Add "Favorites" to sidebar in the "Resources" group:
- Icon: Heart (from lucide-react)
- Position: after "Word Books"
- Badge: show count of items due for review (if > 0)

### 4.3 Favorites Page (`/favorites`)

**Route:** `src/app/(app)/favorites/page.tsx`

**Layout:**
- **Header:** Title "Favorites" + item count + due-for-review count + search input + "开始复习" button
- **Folder chips:** horizontal scrollable chip bar (All, ⭐ Default, 🤖 Smart, user folders, + New)
- **List:** scrollable list of favorite items

**List item row:**
- Type badge (单词/短语/句子) with color coding (blue/purple/emerald)
- Original text + phonetic (for words)
- Translation (truncated)
- Folder indicator
- Review status badge (待复习/学习中/已掌握)
- Auto-collected badge (🤖 for items in the 'auto' folder)
- Hover actions: TTS button, delete button

**Clicking a list item** → expands inline to show full details: translation, context, related words, notes editor, FSRS rating buttons

**UI States:**
- **Empty state:** illustration + "还没有收藏内容" + hint text explaining how to use selection translation to collect words
- **Loading state:** skeleton placeholders for the list (3 rows)
- **Error state:** error message with retry button if Dexie fails to load

### 4.4 Favorites Review Flow

**Route:** `src/app/(app)/favorites/review/page.tsx` (standalone, not integrated into existing `/review/today`)

**Flow:**
1. "开始复习" button filters `favorites` where `nextReview <= now`
2. Shows one item at a time (flashcard style): original text → tap/click to reveal translation
3. After revealing: show FSRS rating buttons (Again / Hard / Good / Easy) with predicted interval labels
4. Rating calls `gradeReview()` which updates `fsrsCard` and `nextReview` on the favorite item
5. Progress bar shows position in review queue

**Empty review state:** "没有待复习的收藏" with a link back to the favorites list.

### 4.5 Folder Management

**Dialog:** `FolderManageDialog`
- Triggered by "+ 新建收藏夹" chip or a "管理收藏夹" menu item
- Create: name + emoji picker
- Edit: rename, change emoji
- Delete: with confirmation (items are moved to "默认收藏", not deleted). Cannot delete 'default' or 'auto' folders.
- Reorder: drag-and-drop or up/down buttons

### 4.6 Command Palette Integration

Add actions to the command palette:
- "Go to Favorites" → navigates to `/favorites`
- "Start Favorites Review" → navigates to `/favorites/review`

### 4.7 Keyboard Shortcuts

- `global:nav-favorites` → navigate to `/favorites` (default: unbound, user can customize)
- `global:toggle-selection-translate` → enable/disable selection translation globally (default: unbound)

---

## 5. Smart Auto-Collection

### 5.1 Trigger Rules

| Rule | Condition | Source | How to extract data |
|------|-----------|--------|---------------------|
| Write errors | Word error rate ≥ threshold in a session | `savePracticeSession()` | The existing `MistakeEntry` type in `LearningRecord.mistakes` contains `{ word, expected, actual }`. Count mistakes per word against total words to get per-word error rate. |
| FSRS "Again" × N | Same content item rated "Again" N consecutive times | `updateRecordWithRating()` | Add a transient `consecutiveAgainCount` field to `LearningRecord`. Increment on "Again" rating, reset to 0 on any other rating. When count reaches threshold → auto-collect. Resolve text/translation by reading the associated `ContentItem`. |
| Lookup frequency | Same word translated ≥ N times | `lookupHistory` table | Persistent counter in IndexedDB (see §2.1 and §3.8). Check after each increment. |

### 5.2 Sensitivity Thresholds

| Level | Write Error Rate | FSRS "Again" Count | Lookup Count |
|-------|-----------------|-------------------|--------------|
| Low | ≥ 70% | ≥ 3 consecutive | ≥ 5 times |
| Medium (default) | ≥ 50% | ≥ 2 consecutive | ≥ 3 times |
| High | ≥ 30% | ≥ 1 | ≥ 2 times |

### 5.3 Auto-Collection Logic

- All auto-collected items go to the 'auto' folder with `autoCollected: true`
- Before auto-collecting, check `isFavorited(normalizedText)` — if already favorited in any folder, skip
- Daily cap: configurable (default: 20 items/day), tracked by counting today's auto-collected items
- A new FSRS card is initialized on auto-collect so the item enters the review queue

### 5.4 Settings

Add to Settings page under a "Smart Collection" section:
- Toggle: "启用智能自动收藏" (default: on)
- Sensitivity: Low / Medium / High radio buttons (default: Medium)
- Daily cap: number input (default: 20)

Store settings in `favorite-store.ts` as persisted state (localStorage via Zustand persist middleware).

---

## 6. Component Tree

```
src/
├── components/
│   ├── selection-translation/
│   │   ├── selection-translation-provider.tsx    # Global context + event listeners
│   │   ├── selection-translation-popup.tsx       # The floating popup UI
│   │   ├── translation-content.tsx               # Body content (phonetic, translation, context)
│   │   └── related-recommendations.tsx           # Collapsible related words section
│   └── favorites/
│       ├── favorites-list.tsx                     # Main list component
│       ├── favorite-item-row.tsx                  # Single list item
│       ├── favorite-detail.tsx                    # Expanded item detail (inline)
│       ├── folder-chips.tsx                       # Folder filter chip bar
│       ├── folder-manage-dialog.tsx               # Create/edit/delete folders
│       ├── favorites-review.tsx                   # Review flashcard flow
│       └── favorites-search.tsx                   # Search component
├── stores/
│   └── favorite-store.ts                          # Zustand store
├── types/
│   └── favorite.ts                                # FavoriteItem, FavoriteFolder, LookupEntry, RelatedData types
├── lib/
│   ├── auto-collect.ts                            # Smart auto-collection rules + thresholds
│   └── text-normalize.ts                          # normalizeText() utility
└── app/(app)/
    └── favorites/
        ├── page.tsx                                # Main favorites page
        └── review/
            └── page.tsx                            # Favorites review page
```

---

## 7. API Changes

### 7.1 `/api/translate` Enhancement

Add to request body (additive, backward compatible):
```typescript
{
  // ...existing fields unchanged...
  includeRelated?: boolean;       // request related words (default: false)
  selectionType?: 'word' | 'phrase' | 'sentence';  // hint for LLM prompt
}
```

When `includeRelated` is absent or false, the response is identical to the current shape. Existing consumers are unaffected.

Update system prompt to conditionally include related word generation instructions when `includeRelated: true`.

### 7.2 No New API Routes

All favorites data is local (Dexie) — no server-side endpoints needed. Cloud sync handled by existing Supabase sync engine once mapper is extended.

---

## 8. Web & Desktop Compatibility

| Aspect | Web | Tauri Desktop |
|--------|-----|---------------|
| Text selection | `document.getSelection()` | Same (Tauri webview supports full Selection API) |
| Popup positioning | `getBoundingClientRect()` | Same |
| Data storage | IndexedDB (Dexie) | Same |
| TTS | Web Speech API / Fish Audio / Kokoro | Same |
| Sync | Supabase | Same |

**No platform-specific code is needed.** Both features work identically in web and desktop.

---

## 9. Testing Strategy

### Unit Tests (Vitest)
- `favorite-store.test.ts` — CRUD operations, folder management, FSRS grading, deduplication, text normalization
- `auto-collect.test.ts` — trigger rules for all three sources, daily cap, dedup logic, sensitivity thresholds
- `text-normalize.test.ts` — normalization edge cases (punctuation, casing, whitespace)
- `selection-type-detection.test.ts` — word/phrase/sentence classification
- `popup-positioning.test.ts` — viewport edge cases, mobile responsiveness

### E2E Tests (Playwright)
- `e2e/selection-translation.spec.ts` — select text → popup appears → shows translation → favorite → verify in favorites page
- `e2e/favorites.spec.ts` — add/remove favorites, folder management, review flow, search, empty states

---

## 10. Migration Path

1. Dexie v9 migration carries forward ALL v8 table schemas plus the 3 new tables (`favorites`, `favoriteFolders`, `lookupHistory`)
2. v9 `upgrade()` callback seeds default folders ('default', 'auto') if they don't exist
3. No data migration needed — new tables start empty
4. Supabase migration creates `favorites` and `favorite_folders` tables (deferred: `lookup_history` is local-only)
5. Sync mapper extended to handle `favorites` and `favoriteFolders`
