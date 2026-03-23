# Selection Translation & Learning Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text selection translation popup and learning favorites system with FSRS review, folder management, and smart auto-collection.

**Architecture:** Two features share a data layer (Dexie v9 with 3 new tables) and a Zustand store (`favorite-store`). Selection translation is a global provider mounted in the app layout that renders a floating popup via Portal. Favorites is a standalone page with review flow. Smart auto-collection hooks into existing practice flows.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand, Dexie.js (IndexedDB), ts-fsrs, Tailwind CSS v4, shadcn/ui, Vercel AI SDK, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-selection-translation-favorites-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/types/favorite.ts` | `FavoriteItem`, `FavoriteFolder`, `LookupEntry`, `RelatedData` type definitions |
| `src/lib/text-normalize.ts` | `normalizeText()` utility + `detectSelectionType()` |
| `src/stores/favorite-store.ts` | Zustand store: favorites CRUD, folders, FSRS grading, filtering, auto-collect settings |
| `src/components/selection-translation/selection-translation-provider.tsx` | Global context + mouseup listener + popup state management |
| `src/components/selection-translation/selection-translation-popup.tsx` | Floating popup UI shell (header, body, footer) |
| `src/components/selection-translation/translation-content.tsx` | Body content: phonetic, translation, context by type |
| `src/components/selection-translation/related-recommendations.tsx` | Collapsible related words section |
| `src/components/favorites/favorites-list.tsx` | Main list component with search + empty/loading states |
| `src/components/favorites/favorite-item-row.tsx` | Single list item row |
| `src/components/favorites/favorite-detail.tsx` | Expanded item detail (inline) |
| `src/components/favorites/folder-chips.tsx` | Folder filter chip bar |
| `src/components/favorites/folder-manage-dialog.tsx` | Create/edit/delete folders dialog |
| `src/components/favorites/favorites-review.tsx` | Review flashcard flow component |
| `src/app/(app)/favorites/page.tsx` | Main favorites page route |
| `src/app/(app)/favorites/review/page.tsx` | Favorites review page route |
| `src/lib/auto-collect.ts` | Smart auto-collection rules, thresholds, daily cap |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/lib/db.ts` | Add version(9) with 3 new tables + auto-timestamp hooks for favorites |
| `src/lib/seed.ts` | Seed default folders ('default', 'auto') on first load |
| `src/app/api/translate/route.ts` | Add `includeRelated` + `selectionType` params, enhanced system prompt |
| `src/app/(app)/layout.tsx` | Mount `SelectionTranslationProvider`, add `global:nav-favorites` + `global:toggle-selection-translate` shortcut handlers |
| `src/components/layout/sidebar.tsx` | Add Favorites nav item to Resources group |
| `src/components/layout/command-palette.tsx` | Add "Go to Favorites" + "Start Favorites Review" commands |
| `src/lib/shortcut-definitions.ts` | Add `global:nav-favorites` + `global:toggle-selection-translate` definitions |
| `src/lib/sync/mapper.ts` | Add `toSupabaseFavorite`/`fromSupabaseFavorite` + folder mappers |
| `src/lib/sync/engine.ts` | Add `favorites` + `favoriteFolders` to SyncableTable union and sync flow |
| `src/app/(app)/settings/page.tsx` | Add "Smart Collection" settings section |

### Test Files

| File | What It Tests |
|------|--------------|
| `src/lib/__tests__/text-normalize.test.ts` | normalizeText edge cases, detectSelectionType classification |
| `src/stores/__tests__/favorite-store.test.ts` | CRUD, folder management, FSRS grading, dedup, filtering |
| `src/lib/__tests__/auto-collect.test.ts` | Trigger rules, daily cap, dedup, sensitivity thresholds |

---

## Task 1: Types & Text Normalization Utility

**Files:**
- Create: `src/types/favorite.ts`
- Create: `src/lib/text-normalize.ts`
- Create: `src/lib/__tests__/text-normalize.test.ts`

- [ ] **Step 1: Write the type definitions**

Create `src/types/favorite.ts`:

```typescript
import type { FSRSCardData } from '@/types/content';

export interface RelatedData {
  synonyms?: string[];
  wordFamily?: { word: string; pos: string }[];
  relatedPhrases?: string[];
  keyVocabulary?: { word: string; translation: string }[];
}

export type FavoriteType = 'word' | 'phrase' | 'sentence';
export type FavoriteSourceModule = 'listen' | 'read' | 'write' | 'speak' | 'library' | 'chat';

export interface FavoriteItem {
  id: string;
  text: string;
  normalizedText: string;
  translation: string;
  type: FavoriteType;
  folderId: string;
  sourceContentId?: string;
  sourceModule?: FavoriteSourceModule;
  context?: string;
  targetLang: string;
  pronunciation?: string;
  notes?: string;
  related?: RelatedData;
  fsrsCard?: FSRSCardData;
  nextReview?: number;
  autoCollected: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
}

export interface LookupEntry {
  text: string;
  count: number;
  lastLookedUp: number;
}

export type AutoCollectSensitivity = 'low' | 'medium' | 'high';

export interface AutoCollectSettings {
  enabled: boolean;
  sensitivity: AutoCollectSensitivity;
  dailyCap: number;
}

export const DEFAULT_FOLDERS: FavoriteFolder[] = [
  { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 0 },
  { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 0 },
];

export const SENSITIVITY_THRESHOLDS = {
  low: { writeErrorRate: 0.7, fsrsAgainCount: 3, lookupCount: 5 },
  medium: { writeErrorRate: 0.5, fsrsAgainCount: 2, lookupCount: 3 },
  high: { writeErrorRate: 0.3, fsrsAgainCount: 1, lookupCount: 2 },
} as const;
```

- [ ] **Step 2: Write failing tests for text-normalize**

Create `src/lib/__tests__/text-normalize.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { detectSelectionType, normalizeText } from '../text-normalize';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('strips punctuation', () => {
    expect(normalizeText('Hello, world!')).toBe('hello world');
    expect(normalizeText('"quoted"')).toBe('quoted');
    expect(normalizeText("it's")).toBe('its');
    expect(normalizeText('(parenthetical)')).toBe('parenthetical');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('preserves hyphens and internal spaces', () => {
    expect(normalizeText('well-known phrase')).toBe('well-known phrase');
  });
});

describe('detectSelectionType', () => {
  it('classifies single words', () => {
    expect(detectSelectionType('hello')).toBe('word');
    expect(detectSelectionType('well-known')).toBe('word');
  });

  it('classifies phrases (2-5 words)', () => {
    expect(detectSelectionType('good morning')).toBe('phrase');
    expect(detectSelectionType('a piece of cake')).toBe('phrase');
    expect(detectSelectionType('one two three four five')).toBe('phrase');
  });

  it('classifies sentences (6+ words)', () => {
    expect(detectSelectionType('the quick brown fox jumps over the lazy dog')).toBe('sentence');
  });

  it('classifies text ending with sentence punctuation as sentence', () => {
    expect(detectSelectionType('Hello world.')).toBe('sentence');
    expect(detectSelectionType('Is this right?')).toBe('sentence');
    expect(detectSelectionType('Watch out!')).toBe('sentence');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/text-normalize.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement text-normalize**

Create `src/lib/text-normalize.ts`:

```typescript
import type { FavoriteType } from '@/types/favorite';

export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?;:'"()[\]{}]/g, '');
}

export function detectSelectionType(text: string): FavoriteType {
  const trimmed = text.trim();
  // Sentence: ends with sentence-terminal punctuation
  if (/[.!?]$/.test(trimmed)) return 'sentence';
  // Count words (split by whitespace)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount === 1) return 'word';
  if (wordCount <= 5) return 'phrase';
  return 'sentence';
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/text-normalize.test.ts`
Expected: PASS — all 9 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/types/favorite.ts src/lib/text-normalize.ts src/lib/__tests__/text-normalize.test.ts
git commit -m "feat(favorites): add type definitions and text normalization utility"
```

---

## Task 2: Dexie v9 Schema Migration + Default Folder Seeding

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/lib/seed.ts`

- [ ] **Step 1: Add v9 schema and table declarations to db.ts**

In `src/lib/db.ts`, add imports at the top:

```typescript
import type { FavoriteFolder, FavoriteItem, LookupEntry } from '@/types/favorite';
```

Add table declarations after `conversations!: Table<Conversation>;` (line 10):

```typescript
favorites!: Table<FavoriteItem>;
favoriteFolders!: Table<FavoriteFolder>;
lookupHistory!: Table<LookupEntry>;
```

Add version(9) after the version(8) block (after line 95):

```typescript
// Version 9: add favorites, favoriteFolders, lookupHistory tables
this.version(9).stores({
  contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
  records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
  sessions: 'id, contentId, module, startTime, completed',
  books: 'id, title, source, createdAt',
  conversations: 'id, updatedAt, createdAt',
  favorites: 'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
  favoriteFolders: 'id, sortOrder, createdAt',
  lookupHistory: 'text, count, lastLookedUp',
});
```

Add auto-timestamp hooks for favorites after the existing records hooks (after line 122):

```typescript
this.favorites.hook('creating', (_primKey, obj) => {
  const now = Date.now();
  if (!obj.updatedAt) obj.updatedAt = now;
  if (!obj.createdAt) obj.createdAt = now;
});

this.favorites.hook('updating', (modifications) => {
  if (!('updatedAt' in modifications)) {
    return { ...modifications, updatedAt: Date.now() };
  }
  return undefined;
});
```

- [ ] **Step 2: Add default folder seeding to seed.ts**

In `src/lib/seed.ts`, add import at top:

```typescript
import { DEFAULT_FOLDERS } from '@/types/favorite';
```

Add a new function before `seedDatabase()`:

```typescript
const FAVORITE_FOLDERS_KEY = 'echotype_favorite_folders_seeded_v1';

async function seedFavoriteFolders() {
  if (localStorage.getItem(FAVORITE_FOLDERS_KEY)) return;

  const now = Date.now();
  const existing = await db.favoriteFolders.count();
  if (existing === 0) {
    await db.favoriteFolders.bulkAdd(
      DEFAULT_FOLDERS.map((f) => ({ ...f, createdAt: now })),
    );
  }

  localStorage.setItem(FAVORITE_FOLDERS_KEY, 'true');
}
```

Call `seedFavoriteFolders()` inside `seedDatabase()` — add after existing seed operations:

```typescript
await seedFavoriteFolders();
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts src/lib/seed.ts
git commit -m "feat(favorites): add Dexie v9 schema with favorites tables and default folder seeding"
```

---

## Task 3: Favorite Store (Zustand)

**Files:**
- Create: `src/stores/favorite-store.ts`
- Create: `src/stores/__tests__/favorite-store.test.ts`

- [ ] **Step 1: Write failing tests for the store**

Create `src/stores/__tests__/favorite-store.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Dexie before importing store
vi.mock('@/lib/db', () => {
  const items: any[] = [];
  const folders: any[] = [
    { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 1 },
    { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 1 },
  ];

  return {
    db: {
      favorites: {
        toArray: vi.fn(() => Promise.resolve([...items])),
        add: vi.fn((item: any) => { items.push(item); return Promise.resolve(item.id); }),
        delete: vi.fn((id: string) => {
          const idx = items.findIndex((i: any) => i.id === id);
          if (idx >= 0) items.splice(idx, 1);
          return Promise.resolve();
        }),
        update: vi.fn((id: string, updates: any) => {
          const idx = items.findIndex((i: any) => i.id === id);
          if (idx >= 0) Object.assign(items[idx], updates);
          return Promise.resolve(1);
        }),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            modify: vi.fn(() => Promise.resolve(0)),
          })),
        })),
      },
      favoriteFolders: {
        toArray: vi.fn(() => Promise.resolve([...folders])),
        add: vi.fn((f: any) => { folders.push(f); return Promise.resolve(f.id); }),
        update: vi.fn((id: string, updates: any) => {
          const idx = folders.findIndex((f: any) => f.id === id);
          if (idx >= 0) Object.assign(folders[idx], updates);
          return Promise.resolve(1);
        }),
        delete: vi.fn((id: string) => {
          const idx = folders.findIndex((f: any) => f.id === id);
          if (idx >= 0) folders.splice(idx, 1);
          return Promise.resolve();
        }),
      },
    },
  };
});

vi.mock('nanoid', () => ({ nanoid: () => 'test-id-' + Math.random().toString(36).slice(2, 8) }));

import { useFavoriteStore } from '../favorite-store';

describe('favorite-store', () => {
  beforeEach(() => {
    useFavoriteStore.setState({
      favorites: [],
      folders: [
        { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 1 },
        { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 1 },
      ],
      activeFolderId: null,
      isLoaded: false,
    });
  });

  it('adds a favorite and computes normalizedText', async () => {
    const id = await useFavoriteStore.getState().addFavorite({
      text: 'Hello, World!',
      translation: '你好世界',
      type: 'phrase',
      folderId: 'default',
      targetLang: 'zh-CN',
    });
    expect(id).toBeTruthy();
    const fav = useFavoriteStore.getState().favorites[0];
    expect(fav.normalizedText).toBe('hello world');
    expect(fav.autoCollected).toBe(false);
    expect(fav.fsrsCard).toBeDefined();
  });

  it('detects duplicates via isFavorited', async () => {
    await useFavoriteStore.getState().addFavorite({
      text: 'Hello',
      translation: '你好',
      type: 'word',
      folderId: 'default',
      targetLang: 'zh-CN',
    });
    expect(useFavoriteStore.getState().isFavorited('hello')).toBe(true);
    expect(useFavoriteStore.getState().isFavorited('  Hello  ')).toBe(true);
    expect(useFavoriteStore.getState().isFavorited('goodbye')).toBe(false);
  });

  it('removes a favorite', async () => {
    const id = await useFavoriteStore.getState().addFavorite({
      text: 'test',
      translation: '测试',
      type: 'word',
      folderId: 'default',
      targetLang: 'zh-CN',
    });
    await useFavoriteStore.getState().removeFavorite(id);
    expect(useFavoriteStore.getState().favorites).toHaveLength(0);
  });

  it('cannot delete reserved folders', async () => {
    await expect(useFavoriteStore.getState().removeFolder('default')).rejects.toThrow();
    await expect(useFavoriteStore.getState().removeFolder('auto')).rejects.toThrow();
  });

  it('filters by active folder', async () => {
    await useFavoriteStore.getState().addFavorite({
      text: 'word1',
      translation: '词1',
      type: 'word',
      folderId: 'default',
      targetLang: 'zh-CN',
    });
    await useFavoriteStore.getState().addFavorite({
      text: 'word2',
      translation: '词2',
      type: 'word',
      folderId: 'auto',
      targetLang: 'zh-CN',
    });

    // No filter: all items
    expect(useFavoriteStore.getState().getFilteredFavorites()).toHaveLength(2);

    // Filter by 'default'
    useFavoriteStore.getState().setActiveFolderId('default');
    expect(useFavoriteStore.getState().getFilteredFavorites()).toHaveLength(1);
    expect(useFavoriteStore.getState().getFilteredFavorites()[0].text).toBe('word1');
  });

  it('grades review and updates nextReview', async () => {
    const { Rating } = await import('ts-fsrs');
    const id = await useFavoriteStore.getState().addFavorite({
      text: 'study',
      translation: '学习',
      type: 'word',
      folderId: 'default',
      targetLang: 'zh-CN',
    });
    await useFavoriteStore.getState().gradeReview(id, Rating.Good);
    const updated = useFavoriteStore.getState().favorites.find((f) => f.id === id);
    expect(updated?.nextReview).toBeGreaterThan(Date.now() - 1000);
    expect(updated?.fsrsCard?.reps).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/stores/__tests__/favorite-store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the favorite store**

Create `src/stores/favorite-store.ts`:

```typescript
import { nanoid } from 'nanoid';
import { type Rating } from 'ts-fsrs';
import { create } from 'zustand';
import { db } from '@/lib/db';
import { cardToData, createNewCard, gradeCard } from '@/lib/fsrs';
import { normalizeText } from '@/lib/text-normalize';
import type {
  AutoCollectSettings,
  FavoriteFolder,
  FavoriteItem,
} from '@/types/favorite';

const SETTINGS_KEY = 'echotype_favorite_settings';

interface FavoriteState {
  favorites: FavoriteItem[];
  folders: FavoriteFolder[];
  activeFolderId: string | null;
  isLoaded: boolean;
  selectionTranslateEnabled: boolean;
  autoCollectSettings: AutoCollectSettings;

  // Data
  loadFavorites: () => Promise<void>;
  addFavorite: (
    item: Omit<FavoriteItem, 'id' | 'normalizedText' | 'createdAt' | 'updatedAt' | 'autoCollected' | 'fsrsCard' | 'nextReview'> & { autoCollected?: boolean },
  ) => Promise<string>;
  removeFavorite: (id: string) => Promise<void>;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => Promise<void>;
  isFavorited: (text: string) => boolean;
  getFavoriteByText: (text: string) => FavoriteItem | undefined;

  // Folders
  addFolder: (folder: Omit<FavoriteFolder, 'id' | 'createdAt'>) => Promise<string>;
  updateFolder: (id: string, updates: Partial<FavoriteFolder>) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;

  // Filters
  setActiveFolderId: (id: string | null) => void;
  getFilteredFavorites: () => FavoriteItem[];
  getDueForReview: () => FavoriteItem[];

  // FSRS
  gradeReview: (id: string, rating: Rating) => Promise<void>;

  // Settings
  setSelectionTranslateEnabled: (enabled: boolean) => void;
  setAutoCollectSettings: (settings: Partial<AutoCollectSettings>) => void;
}

function loadSettings(): { selectionTranslateEnabled: boolean; autoCollectSettings: AutoCollectSettings } {
  if (typeof window === 'undefined') {
    return {
      selectionTranslateEnabled: true,
      autoCollectSettings: { enabled: true, sensitivity: 'medium', dailyCap: 20 },
    };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    selectionTranslateEnabled: true,
    autoCollectSettings: { enabled: true, sensitivity: 'medium', dailyCap: 20 },
  };
}

function saveSettings(state: { selectionTranslateEnabled: boolean; autoCollectSettings: AutoCollectSettings }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
}

export const useFavoriteStore = create<FavoriteState>((set, get) => {
  const settings = loadSettings();

  return {
    favorites: [],
    folders: [],
    activeFolderId: null,
    isLoaded: false,
    selectionTranslateEnabled: settings.selectionTranslateEnabled,
    autoCollectSettings: settings.autoCollectSettings,

    loadFavorites: async () => {
      const [favorites, folders] = await Promise.all([
        db.favorites.toArray(),
        db.favoriteFolders.toArray(),
      ]);
      set({
        favorites: favorites.sort((a, b) => b.createdAt - a.createdAt),
        folders: folders.sort((a, b) => a.sortOrder - b.sortOrder),
        isLoaded: true,
      });
    },

    addFavorite: async (item) => {
      const id = nanoid();
      const now = Date.now();
      const newCard = createNewCard(new Date(now));
      const fsrsCard = cardToData(newCard);
      const favorite: FavoriteItem = {
        ...item,
        id,
        normalizedText: normalizeText(item.text),
        autoCollected: item.autoCollected ?? false,
        fsrsCard,
        nextReview: fsrsCard.due,
        createdAt: now,
        updatedAt: now,
      };
      await db.favorites.add(favorite);
      set((state) => ({ favorites: [favorite, ...state.favorites] }));
      return id;
    },

    removeFavorite: async (id) => {
      await db.favorites.delete(id);
      set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id) }));
    },

    updateFavorite: async (id, updates) => {
      await db.favorites.update(id, { ...updates, updatedAt: Date.now() });
      set((state) => ({
        favorites: state.favorites.map((f) =>
          f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f,
        ),
      }));
    },

    isFavorited: (text) => {
      const normalized = normalizeText(text);
      return get().favorites.some((f) => f.normalizedText === normalized);
    },

    getFavoriteByText: (text) => {
      const normalized = normalizeText(text);
      return get().favorites.find((f) => f.normalizedText === normalized);
    },

    // Folders
    addFolder: async (folder) => {
      const id = nanoid();
      const now = Date.now();
      const newFolder: FavoriteFolder = { ...folder, id, createdAt: now };
      await db.favoriteFolders.add(newFolder);
      set((state) => ({
        folders: [...state.folders, newFolder].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      return id;
    },

    updateFolder: async (id, updates) => {
      await db.favoriteFolders.update(id, updates);
      set((state) => ({
        folders: state.folders
          .map((f) => (f.id === id ? { ...f, ...updates } : f))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
    },

    removeFolder: async (id) => {
      if (id === 'default' || id === 'auto') {
        throw new Error('Cannot delete reserved folders');
      }
      // Move items in this folder to 'default'
      await db.favorites.where('folderId').equals(id).modify({ folderId: 'default' });
      await db.favoriteFolders.delete(id);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        favorites: state.favorites.map((f) =>
          f.folderId === id ? { ...f, folderId: 'default' } : f,
        ),
      }));
    },

    // Filters
    setActiveFolderId: (id) => set({ activeFolderId: id }),

    getFilteredFavorites: () => {
      const { favorites, activeFolderId } = get();
      if (!activeFolderId) return favorites;
      return favorites.filter((f) => f.folderId === activeFolderId);
    },

    getDueForReview: () => {
      const now = Date.now();
      return get().favorites.filter((f) => f.nextReview != null && f.nextReview <= now);
    },

    // FSRS
    gradeReview: async (id, rating) => {
      const fav = get().favorites.find((f) => f.id === id);
      if (!fav) return;
      const { cardData, nextReview } = gradeCard(fav.fsrsCard, rating);
      await db.favorites.update(id, { fsrsCard: cardData, nextReview, updatedAt: Date.now() });
      set((state) => ({
        favorites: state.favorites.map((f) =>
          f.id === id ? { ...f, fsrsCard: cardData, nextReview, updatedAt: Date.now() } : f,
        ),
      }));
    },

    // Settings
    setSelectionTranslateEnabled: (enabled) => {
      set({ selectionTranslateEnabled: enabled });
      saveSettings({ selectionTranslateEnabled: enabled, autoCollectSettings: get().autoCollectSettings });
    },

    setAutoCollectSettings: (updates) => {
      const current = get().autoCollectSettings;
      const next = { ...current, ...updates };
      set({ autoCollectSettings: next });
      saveSettings({ selectionTranslateEnabled: get().selectionTranslateEnabled, autoCollectSettings: next });
    },
  };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/stores/__tests__/favorite-store.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/stores/favorite-store.ts src/stores/__tests__/favorite-store.test.ts
git commit -m "feat(favorites): add Zustand favorite store with CRUD, folders, FSRS grading"
```

---

## Task 4: Translate API Enhancement

**Files:**
- Modify: `src/app/api/translate/route.ts`

- [ ] **Step 1: Add `includeRelated` and `selectionType` to request parsing**

In `src/app/api/translate/route.ts`, update the destructured request body (around line 11) to include:

```typescript
includeRelated?: boolean;
selectionType?: 'word' | 'phrase' | 'sentence';
```

Add these to the type annotation object.

- [ ] **Step 2: Build enhanced system prompt for `includeRelated: true`**

Before the single-text translation block (around line 103), add a helper function inside the POST handler:

```typescript
function buildSelectionTranslatePrompt(targetLang: string, selectionType?: string): string {
  const base = `Translate the following English text to ${targetLang}.`;
  const jsonInstruction = `Return a JSON object with these fields:
- "translation": the translated text
- "pronunciation": IPA phonetic transcription (for single words only, omit for phrases/sentences)`;

  let relatedInstruction = '';
  if (selectionType === 'word') {
    relatedInstruction = `- "related": { "synonyms": [up to 4 synonym strings], "wordFamily": [up to 3 objects with "word" and "pos" (part of speech)] }`;
  } else if (selectionType === 'phrase') {
    relatedInstruction = `- "related": { "relatedPhrases": [up to 4 related phrase strings] }`;
  } else {
    relatedInstruction = `- "related": { "keyVocabulary": [up to 4 objects with "word" and "translation"] }`;
  }

  return `${base}\n${jsonInstruction}\n${relatedInstruction}\nReturn ONLY valid JSON, no markdown fences, no explanations.`;
}
```

- [ ] **Step 3: Add enhanced translation branch**

Replace the single-text fallback block (lines 103-116) with:

```typescript
if (includeRelated) {
  const system = buildSelectionTranslatePrompt(targetLang!, selectionType);
  const { text: result } = await generateText({ model, system, prompt: text ?? '' });

  try {
    const cleaned = result.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({
      translation: parsed.translation || result,
      pronunciation: parsed.pronunciation,
      related: parsed.related,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch {
    // Fallback: return raw text as translation
    return NextResponse.json({
      translation: result,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  }
}

// Single text fallback (original behavior)
const { text: translation } = await generateText({
  model,
  system: `Translate the following English text to ${targetLang}. Return only the translation, no explanations.`,
  prompt: text ?? '',
});

return NextResponse.json({
  translation,
  providerId: resolution.providerId,
  credentialSource: resolution.credentialSource,
  fallbackApplied: resolution.fallbackApplied,
  fallbackReason: resolution.fallbackReason,
});
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/translate/route.ts
git commit -m "feat(translate): add includeRelated and selectionType params for selection translation"
```

---

## Task 5: Selection Translation Provider & Popup

**Files:**
- Create: `src/components/selection-translation/selection-translation-provider.tsx`
- Create: `src/components/selection-translation/selection-translation-popup.tsx`
- Create: `src/components/selection-translation/translation-content.tsx`
- Create: `src/components/selection-translation/related-recommendations.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create the SelectionTranslationProvider**

Create `src/components/selection-translation/selection-translation-provider.tsx`:

```typescript
'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { detectSelectionType, normalizeText } from '@/lib/text-normalize';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { useContentStore } from '@/stores/content-store';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useProviderStore } from '@/stores/provider-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType } from '@/types/favorite';
import type { RelatedData } from '@/types/favorite';
import { SelectionTranslationPopup } from './selection-translation-popup';

interface TranslationResult {
  translation: string;
  pronunciation?: string;
  related?: RelatedData;
}

interface SelectionState {
  text: string;
  type: FavoriteType;
  context?: string;
  rect: DOMRect;
  sourceModule?: string;
  sourceContentId?: string;
}

interface SelectionTranslationContextValue {
  dismiss: () => void;
}

const SelectionTranslationContext = createContext<SelectionTranslationContextValue>({
  dismiss: () => {},
});

export function useSelectionTranslation() {
  return useContext(SelectionTranslationContext);
}

// Module-level translation cache (session-lived)
const translationCache = new Map<string, TranslationResult>();

const EXCLUSION_SELECTORS = 'input, textarea, select, [contenteditable], [data-no-selection-translate]';

function getModuleFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/^\/(listen|speak|read|write|library)/);
  return match?.[1];
}

function extractContextSentence(selection: Selection): string | undefined {
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return undefined;
  const fullText = container.textContent || '';
  // Find sentence boundaries around selection
  const selectedText = selection.toString().trim();
  const idx = fullText.indexOf(selectedText);
  if (idx === -1) return fullText.trim();
  // Look backward for sentence start
  let start = idx;
  while (start > 0 && !/[.!?]/.test(fullText[start - 1]!)) start--;
  // Look forward for sentence end
  let end = idx + selectedText.length;
  while (end < fullText.length && !/[.!?]/.test(fullText[end]!)) end++;
  if (end < fullText.length) end++; // include the punctuation
  return fullText.slice(start, end).trim();
}

export function SelectionTranslationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const enabled = useFavoriteStore((s) => s.selectionTranslateEnabled);
  const targetLang = useTTSStore((s) => s.targetLang);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const providerConfigs = useProviderStore((s) => s.providers);

  const dismiss = useCallback(() => {
    setSelectionState(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Dismiss on route change
  useEffect(() => {
    dismiss();
  }, [pathname, dismiss]);

  // Translate function
  const translate = useCallback(
    async (text: string, type: FavoriteType) => {
      const cacheKey = `${normalizeText(text)}::${targetLang}`;
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setResult(cached);
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        const headerKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeApiKey && headerKey) headers[headerKey] = activeApiKey;

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            targetLang,
            provider: activeProviderId,
            providerConfigs,
            includeRelated: true,
            selectionType: type,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Translation failed');
          return;
        }

        const data = await res.json();
        const translationResult: TranslationResult = {
          translation: data.translation,
          pronunciation: data.pronunciation,
          related: data.related,
        };
        translationCache.set(cacheKey, translationResult);
        setResult(translationResult);

        // Update lookup history and check auto-collect
        updateLookupHistory(text, translationResult.translation, type, targetLang, getModuleFromPathname(pathname));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    },
    [targetLang, activeProviderId, activeApiKey, providerConfigs, pathname],
  );

  // Mouseup handler
  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Check if click is inside popup
      if (popupRef.current?.contains(e.target as Node)) return;

      // Check exclusion zones
      const target = e.target as HTMLElement;
      if (target.closest(EXCLUSION_SELECTORS)) {
        return;
      }

      // Check if shortcuts are paused (dialog/palette open)
      if (useShortcutStore.getState().paused) return;

      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) {
        dismiss();
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length > 500) {
        dismiss();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const type = detectSelectionType(text);
      const context = type !== 'sentence' ? extractContextSentence(selection) : undefined;
      const sourceModule = getModuleFromPathname(pathname);
      const sourceContentId = useContentStore.getState().activeContentId ?? undefined;

      setSelectionState({ text, type, context, rect, sourceModule, sourceContentId });
      setResult(null);
      setError(null);

      // Debounce the translation call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        translate(text, type);
      }, 300);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [enabled, pathname, dismiss, translate]);

  // Esc to dismiss
  useEffect(() => {
    if (!selectionState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState, dismiss]);

  // Scroll repositioning
  useEffect(() => {
    if (!selectionState) return;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const selection = document.getSelection();
        if (!selection || selection.isCollapsed) {
          dismiss();
          return;
        }
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionState((prev) => (prev ? { ...prev, rect } : null));
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [selectionState, dismiss]);

  const contextValue = { dismiss };

  return (
    <SelectionTranslationContext.Provider value={contextValue}>
      {children}
      {selectionState && (
        <SelectionTranslationPopup
          ref={popupRef}
          selection={selectionState}
          result={result}
          isLoading={isLoading}
          error={error}
          onDismiss={dismiss}
          onTranslateRelated={(word) => {
            const type = detectSelectionType(word);
            const rect = selectionState.rect;
            setSelectionState({ text: word, type, rect, sourceModule: selectionState.sourceModule });
            setResult(null);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            translate(word, type);
          }}
        />
      )}
    </SelectionTranslationContext.Provider>
  );
}

async function updateLookupHistory(text: string, translation: string, type: FavoriteType, targetLang: string, sourceModule?: string) {
  const { db } = await import('@/lib/db');
  const { checkLookupAutoCollect } = await import('@/lib/auto-collect');
  const normalized = normalizeText(text);
  const existing = await db.lookupHistory.get(normalized);
  if (existing) {
    await db.lookupHistory.update(normalized, {
      count: existing.count + 1,
      lastLookedUp: Date.now(),
    });
  } else {
    await db.lookupHistory.add({ text: normalized, count: 1, lastLookedUp: Date.now() });
  }
  // Check if auto-collection threshold is met
  await checkLookupAutoCollect(text, translation, type, targetLang, sourceModule);
}
```

- [ ] **Step 2: Create the popup component**

Create `src/components/selection-translation/selection-translation-popup.tsx`:

```typescript
'use client';

import { forwardRef, useMemo, useState } from 'react';
import { Copy, Headphones, Volume2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType, RelatedData } from '@/types/favorite';
import { TranslationContent } from './translation-content';
import { RelatedRecommendations } from './related-recommendations';

interface SelectionInfo {
  text: string;
  type: FavoriteType;
  context?: string;
  rect: DOMRect;
  sourceModule?: string;
  sourceContentId?: string;
}

interface TranslationResult {
  translation: string;
  pronunciation?: string;
  related?: RelatedData;
}

interface Props {
  selection: SelectionInfo;
  result: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
  onDismiss: () => void;
  onTranslateRelated: (word: string) => void;
}

export const SelectionTranslationPopup = forwardRef<HTMLDivElement, Props>(
  ({ selection, result, isLoading, error, onDismiss, onTranslateRelated }, ref) => {
    const [copied, setCopied] = useState(false);
    const isFavorited = useFavoriteStore((s) => s.isFavorited);
    const addFavorite = useFavoriteStore((s) => s.addFavorite);
    const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
    const getFavoriteByText = useFavoriteStore((s) => s.getFavoriteByText);
    const folders = useFavoriteStore((s) => s.folders);
    const targetLang = useTTSStore((s) => s.targetLang);
    const [selectedFolderId, setSelectedFolderId] = useState('default');

    const alreadyFavorited = isFavorited(selection.text);

    // Position calculation
    const position = useMemo(() => {
      const { rect } = selection;
      const popupWidth = Math.min(340, window.innerWidth - 24);
      const margin = 12;
      const gap = 8;

      let top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - popupWidth / 2;

      // Adjust if below viewport
      if (top + 400 > window.innerHeight) {
        top = rect.top - gap - 200; // approximate popup height
      }

      // Clamp horizontal
      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

      return { top, left, width: popupWidth };
    }, [selection]);

    const handleCopy = () => {
      const copyText = result
        ? `${selection.text}\n${result.translation}`
        : selection.text;
      navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    const handleTTS = () => {
      window.dispatchEvent(new CustomEvent('echotype:speak-text', { detail: selection.text }));
    };

    const handleFavorite = async () => {
      if (alreadyFavorited) {
        const existing = getFavoriteByText(selection.text);
        if (existing) await removeFavorite(existing.id);
      } else if (result) {
        await addFavorite({
          text: selection.text,
          translation: result.translation,
          type: selection.type,
          folderId: selectedFolderId,
          sourceContentId: selection.sourceContentId,
          sourceModule: selection.sourceModule as any,
          context: selection.context,
          targetLang,
          pronunciation: result.pronunciation,
          related: result.related,
        });
      }
    };

    const typeBadge: Record<FavoriteType, { label: string; color: string }> = {
      word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
      phrase: { label: '短语', color: 'bg-purple-100 text-purple-700' },
      sentence: { label: '句子', color: 'bg-emerald-100 text-emerald-700' },
    };

    const badge = typeBadge[selection.type];

    return createPortal(
      <div
        ref={ref}
        role="dialog"
        aria-label="Translation popup"
        className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: position.top, left: position.left, width: position.width }}
      >
        <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', badge.color)}>
                {badge.label}
              </span>
              <span className="text-sm font-medium text-slate-900 truncate">{selection.text}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTTS} aria-label="Speak">
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} aria-label="Copy">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss} aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5">
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {isLoading && !result && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                Translating...
              </div>
            )}
            {result && (
              <TranslationContent
                type={selection.type}
                text={selection.text}
                translation={result.translation}
                pronunciation={result.pronunciation}
                context={selection.context}
              />
            )}
          </div>

          {/* Related recommendations */}
          {result?.related && (
            <RelatedRecommendations
              type={selection.type}
              related={result.related}
              onSelect={onTranslateRelated}
            />
          )}

          {/* Footer */}
          {result && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/30">
              <Button
                variant={alreadyFavorited ? 'default' : 'outline'}
                size="sm"
                className={cn('h-7 text-xs', alreadyFavorited && 'bg-green-500 hover:bg-green-600')}
                onClick={handleFavorite}
              >
                {alreadyFavorited ? '✓ 已收藏' : '♡ 收藏'}
              </Button>
              {!alreadyFavorited && (
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="h-7 text-xs border rounded px-1.5 bg-white text-slate-600"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  },
);

SelectionTranslationPopup.displayName = 'SelectionTranslationPopup';
```

- [ ] **Step 3: Create TranslationContent component**

Create `src/components/selection-translation/translation-content.tsx`:

```typescript
import type { FavoriteType } from '@/types/favorite';

interface Props {
  type: FavoriteType;
  text: string;
  translation: string;
  pronunciation?: string;
  context?: string;
}

export function TranslationContent({ type, text, translation, pronunciation, context }: Props) {
  return (
    <div className="space-y-1.5">
      {/* Pronunciation (words only) */}
      {type === 'word' && pronunciation && (
        <p className="text-xs text-slate-400 font-mono">{pronunciation}</p>
      )}

      {/* Translation */}
      <p className="text-sm text-slate-800">{translation}</p>

      {/* Context sentence (words and phrases) */}
      {context && type !== 'sentence' && (
        <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-500 leading-relaxed">
          {highlightInContext(context, text)}
        </div>
      )}
    </div>
  );
}

function highlightInContext(context: string, text: string): React.ReactNode {
  const lowerContext = context.toLowerCase();
  const lowerText = text.toLowerCase();
  const idx = lowerContext.indexOf(lowerText);
  if (idx === -1) return context;

  return (
    <>
      {context.slice(0, idx)}
      <span className="font-medium text-indigo-600 underline decoration-indigo-200">
        {context.slice(idx, idx + text.length)}
      </span>
      {context.slice(idx + text.length)}
    </>
  );
}
```

- [ ] **Step 4: Create RelatedRecommendations component**

Create `src/components/selection-translation/related-recommendations.tsx`:

```typescript
'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FavoriteType, RelatedData } from '@/types/favorite';

interface Props {
  type: FavoriteType;
  related: RelatedData;
  onSelect: (word: string) => void;
}

export function RelatedRecommendations({ type, related, onSelect }: Props) {
  const [expanded, setExpanded] = useState(true);

  const hasContent =
    (related.synonyms && related.synonyms.length > 0) ||
    (related.wordFamily && related.wordFamily.length > 0) ||
    (related.relatedPhrases && related.relatedPhrases.length > 0) ||
    (related.keyVocabulary && related.keyVocabulary.length > 0);

  if (!hasContent) return null;

  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
      >
        相关推荐
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded ? '' : '-rotate-90')} />
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {/* Words: synonyms + word family */}
          {type === 'word' && related.synonyms && related.synonyms.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">近义词</p>
              <div className="flex flex-wrap gap-1">
                {related.synonyms.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelect(s)}
                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === 'word' && related.wordFamily && related.wordFamily.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">词族</p>
              <div className="flex flex-wrap gap-1">
                {related.wordFamily.map((w) => (
                  <button
                    key={w.word}
                    type="button"
                    onClick={() => onSelect(w.word)}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {w.word} <span className="text-slate-400">({w.pos})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phrases: related phrases */}
          {type === 'phrase' && related.relatedPhrases && related.relatedPhrases.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">相关短语</p>
              <div className="flex flex-wrap gap-1">
                {related.relatedPhrases.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSelect(p)}
                    className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sentences: key vocabulary */}
          {type === 'sentence' && related.keyVocabulary && related.keyVocabulary.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">关键词汇</p>
              <div className="space-y-0.5">
                {related.keyVocabulary.map((kv) => (
                  <button
                    key={kv.word}
                    type="button"
                    onClick={() => onSelect(kv.word)}
                    className="flex items-center gap-2 text-xs w-full px-2 py-1 rounded hover:bg-emerald-50 transition-colors text-left"
                  >
                    <span className="font-medium text-emerald-700">{kv.word}</span>
                    <span className="text-slate-400">{kv.translation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Mount provider in layout**

In `src/app/(app)/layout.tsx`:

Add import:
```typescript
import { SelectionTranslationProvider } from '@/components/selection-translation/selection-translation-provider';
```

Wrap `{children}` inside `<main>` with the provider. Replace the return JSX to wrap main content:

```tsx
<SelectionTranslationProvider>
  <main className="flex-1 overflow-y-auto" data-seeded={seeded}>
    <div className="min-h-full p-6 md:p-8">{children}</div>
  </main>
</SelectionTranslationProvider>
```

Also add to the `useEffect` initialization block:
```typescript
void useFavoriteStore.getState().loadFavorites();
```

And import it:
```typescript
import { useFavoriteStore } from '@/stores/favorite-store';
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/components/selection-translation/ src/app/\(app\)/layout.tsx
git commit -m "feat(selection-translation): add global selection translation popup with caching and lookup history"
```

---

## Task 6: Favorites Page & Route

**Files:**
- Create: `src/app/(app)/favorites/page.tsx`
- Create: `src/components/favorites/favorites-list.tsx`
- Create: `src/components/favorites/favorite-item-row.tsx`
- Create: `src/components/favorites/favorite-detail.tsx`
- Create: `src/components/favorites/folder-chips.tsx`
- Create: `src/components/favorites/favorites-search.tsx`

- [ ] **Step 1: Create the favorites page**

Create `src/app/(app)/favorites/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { FavoritesList } from '@/components/favorites/favorites-list';
import { useFavoriteStore } from '@/stores/favorite-store';

export default function FavoritesPage() {
  const loadFavorites = useFavoriteStore((s) => s.loadFavorites);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) loadFavorites();
  }, [isLoaded, loadFavorites]);

  return <FavoritesList />;
}
```

- [ ] **Step 2: Create FavoritesList component**

Create `src/components/favorites/favorites-list.tsx`:

```typescript
'use client';

import { Heart, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FavoriteItemRow } from './favorite-item-row';
import { FavoriteDetail } from './favorite-detail';
import { FolderChips } from './folder-chips';

export function FavoritesList() {
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const getFilteredFavorites = useFavoriteStore((s) => s.getFilteredFavorites);
  const getDueForReview = useFavoriteStore((s) => s.getDueForReview);
  const favorites = getFilteredFavorites();
  const dueCount = getDueForReview().length;
  const totalCount = useFavoriteStore((s) => s.favorites.length);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = search
    ? favorites.filter(
        (f) =>
          f.text.toLowerCase().includes(search.toLowerCase()) ||
          f.translation.toLowerCase().includes(search.toLowerCase()),
      )
    : favorites;

  // Loading
  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-[var(--font-poppins)]">Favorites</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} items{dueCount > 0 && <span className="text-amber-600 ml-2">{dueCount} due for review</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-9"
          />
          {dueCount > 0 && (
            <Link href="/favorites/review">
              <Button size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                开始复习 ({dueCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Folder chips */}
      <FolderChips />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-medium text-slate-600">还没有收藏内容</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            选中页面上的文字，即可翻译并收藏到此处进行复习
          </p>
        </div>
      )}

      {/* List */}
      <div className="space-y-1 mt-4">
        {filtered.map((item) => (
          <div key={item.id}>
            <FavoriteItemRow
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
            {expandedId === item.id && <FavoriteDetail item={item} />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create FavoriteItemRow component**

Create `src/components/favorites/favorite-item-row.tsx`:

```typescript
'use client';

import { Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';

interface Props {
  item: FavoriteItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const TYPE_BADGE = {
  word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
  phrase: { label: '短语', color: 'bg-purple-100 text-purple-700' },
  sentence: { label: '句子', color: 'bg-emerald-100 text-emerald-700' },
} as const;

function getReviewStatus(item: FavoriteItem): { label: string; color: string } {
  if (!item.fsrsCard) return { label: '新', color: 'text-slate-400' };
  const state = item.fsrsCard.state;
  if (state === 0) return { label: '新', color: 'text-slate-400' };
  if (state === 1 || state === 3) return { label: '学习中', color: 'text-amber-500' };
  if (state === 2) return { label: '已掌握', color: 'text-green-500' };
  return { label: '待复习', color: 'text-amber-500' };
}

export function FavoriteItemRow({ item, isExpanded, onToggle }: Props) {
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
  const badge = TYPE_BADGE[item.type];
  const reviewStatus = getReviewStatus(item);

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('echotype:speak-text', { detail: item.text }));
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFavorite(item.id);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group',
        isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50',
      )}
      onClick={onToggle}
    >
      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0', badge.color)}>
        {badge.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{item.text}</span>
          {item.type === 'word' && item.pronunciation && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.pronunciation}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{item.translation}</p>
      </div>

      {item.autoCollected && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">🤖</span>
      )}

      <span className={cn('text-[10px] shrink-0', reviewStatus.color)}>{reviewStatus.label}</span>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTTS}>
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create FavoriteDetail component**

Create `src/components/favorites/favorite-detail.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { gradeCard, previewRatings } from '@/lib/fsrs';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';
import { Rating } from 'ts-fsrs';

interface Props {
  item: FavoriteItem;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  [Rating.Again]: { label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
  [Rating.Hard]: { label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600' },
  [Rating.Good]: { label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
  [Rating.Easy]: { label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600' },
};

export function FavoriteDetail({ item }: Props) {
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const updateFavorite = useFavoriteStore((s) => s.updateFavorite);
  const [notes, setNotes] = useState(item.notes || '');

  const previews = previewRatings(item.fsrsCard);

  const handleSaveNotes = () => {
    updateFavorite(item.id, { notes });
  };

  return (
    <div className="ml-12 mr-3 mb-2 p-3 rounded-lg bg-white border border-slate-100 space-y-3">
      {/* Full translation */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Translation</p>
        <p className="text-sm text-slate-800">{item.translation}</p>
      </div>

      {/* Context */}
      {item.context && (
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Context</p>
          <p className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">{item.context}</p>
        </div>
      )}

      {/* Related */}
      {item.related && (
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Related</p>
          <div className="flex flex-wrap gap-1">
            {item.related.synonyms?.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{s}</span>
            ))}
            {item.related.wordFamily?.map((w) => (
              <span key={w.word} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {w.word} ({w.pos})
              </span>
            ))}
            {item.related.relatedPhrases?.map((p) => (
              <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{p}</span>
            ))}
            {item.related.keyVocabulary?.map((kv) => (
              <span key={kv.word} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                {kv.word}: {kv.translation}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add notes..."
          className="w-full text-xs p-2 rounded border border-slate-200 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      {/* FSRS rating */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Review</p>
        <div className="flex gap-1.5">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => {
            const { label, color } = RATING_LABELS[r]!;
            const preview = previews[r];
            return (
              <Button
                key={r}
                size="sm"
                className={`h-7 text-xs text-white ${color} flex-1`}
                onClick={() => gradeReview(item.id, r)}
              >
                {label} ({preview.interval})
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create FolderChips component**

Create `src/components/favorites/folder-chips.tsx`:

```typescript
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FolderManageDialog } from './folder-manage-dialog';

export function FolderChips() {
  const folders = useFavoriteStore((s) => s.folders);
  const activeFolderId = useFavoriteStore((s) => s.activeFolderId);
  const setActiveFolderId = useFavoriteStore((s) => s.setActiveFolderId);
  const [showManage, setShowManage] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {/* All chip */}
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            activeFolderId === null
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          All
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFolderId(f.id)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeFolderId === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f.emoji} {f.name}
          </button>
        ))}

        {/* New folder button */}
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> 新建
        </button>
      </div>

      <FolderManageDialog open={showManage} onOpenChange={setShowManage} />
    </>
  );
}
```

- [ ] **Step 6: Create FolderManageDialog component**

Create `src/components/favorites/folder-manage-dialog.tsx`:

```typescript
'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFavoriteStore } from '@/stores/favorite-store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['📚', '🎯', '💼', '🌍', '🔬', '🎨', '🏠', '✈️', '🍔', '🎵'];

export function FolderManageDialog({ open, onOpenChange }: Props) {
  const folders = useFavoriteStore((s) => s.folders);
  const addFolder = useFavoriteStore((s) => s.addFolder);
  const updateFolder = useFavoriteStore((s) => s.updateFolder);
  const removeFolder = useFavoriteStore((s) => s.removeFolder);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📚');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const maxOrder = Math.max(0, ...folders.map((f) => f.sortOrder));
    await addFolder({ name: newName.trim(), emoji: newEmoji, sortOrder: maxOrder + 1 });
    setNewName('');
    setNewEmoji('📚');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await updateFolder(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('删除后，该收藏夹中的内容将移至默认收藏。确定删除？')) return;
    await removeFolder(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理收藏夹</DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div className="flex items-center gap-2">
          <select
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className="h-9 w-14 text-center border rounded"
          >
            {EMOJI_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <Input
            placeholder="收藏夹名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 h-9"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
            创建
          </Button>
        </div>

        {/* Existing folders */}
        <div className="space-y-1 mt-2">
          {folders.map((f) => {
            const isReserved = f.id === 'default' || f.id === 'auto';
            return (
              <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50">
                <span className="text-sm">{f.emoji}</span>
                {editingId === f.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleUpdate(f.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(f.id)}
                    className="flex-1 h-7 text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-slate-700">{f.name}</span>
                )}
                {!isReserved && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditingId(f.id); setEditName(f.name); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(f.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/favorites/page.tsx src/components/favorites/
git commit -m "feat(favorites): add favorites page with list, detail, folder chips, and folder management"
```

---

## Task 7: Favorites Review Page

**Files:**
- Create: `src/app/(app)/favorites/review/page.tsx`
- Create: `src/components/favorites/favorites-review.tsx`

- [ ] **Step 1: Create the review page**

Create `src/app/(app)/favorites/review/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { FavoritesReview } from '@/components/favorites/favorites-review';
import { useFavoriteStore } from '@/stores/favorite-store';

export default function FavoritesReviewPage() {
  const loadFavorites = useFavoriteStore((s) => s.loadFavorites);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) loadFavorites();
  }, [isLoaded, loadFavorites]);

  return <FavoritesReview />;
}
```

- [ ] **Step 2: Create FavoritesReview component**

Create `src/components/favorites/favorites-review.tsx`:

```typescript
'use client';

import { ArrowLeft, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Rating } from 'ts-fsrs';
import { Button } from '@/components/ui/button';
import { previewRatings } from '@/lib/fsrs';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';

export function FavoritesReview() {
  const getDueForReview = useFavoriteStore((s) => s.getDueForReview);
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const dueItems = useMemo(() => getDueForReview(), [getDueForReview]);
  const totalCount = dueItems.length;

  if (!isLoaded) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (totalCount === 0 || currentIndex >= totalCount) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-4xl mb-4">🎉</div>
        <p className="text-lg font-medium text-slate-700">
          {completedCount > 0 ? `已完成 ${completedCount} 项复习！` : '没有待复习的收藏'}
        </p>
        <Link href="/favorites">
          <Button variant="outline" className="mt-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            返回收藏列表
          </Button>
        </Link>
      </div>
    );
  }

  const item = dueItems[currentIndex]!;
  const previews = previewRatings(item.fsrsCard);

  const handleGrade = async (rating: Rating) => {
    await gradeReview(item.id, rating);
    setCompletedCount((c) => c + 1);
    setRevealed(false);
    setCurrentIndex((i) => i + 1);
  };

  const handleTTS = () => {
    window.dispatchEvent(new CustomEvent('echotype:speak-text', { detail: item.text }));
  };

  const RATING_BUTTONS = [
    { rating: Rating.Again, label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
    { rating: Rating.Hard, label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600' },
    { rating: Rating.Good, label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
    { rating: Rating.Easy, label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/favorites" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center min-h-[240px] flex flex-col items-center justify-center',
          !revealed && 'cursor-pointer hover:bg-slate-50 transition-colors',
        )}
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-bold text-slate-900">{item.text}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleTTS(); }}>
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        {item.type === 'word' && item.pronunciation && (
          <p className="text-sm text-slate-400 font-mono mb-4">{item.pronunciation}</p>
        )}

        {revealed ? (
          <div className="mt-4 space-y-2">
            <p className="text-lg text-slate-700">{item.translation}</p>
            {item.context && (
              <p className="text-xs text-slate-400 mt-2">{item.context}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-4">点击翻转查看翻译</p>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2 mt-6">
          {RATING_BUTTONS.map(({ rating, label, color }) => {
            const preview = previews[rating];
            return (
              <button
                key={rating}
                onClick={() => handleGrade(rating)}
                className={cn('py-3 rounded-xl text-white font-medium text-sm transition-colors', color)}
              >
                <span className="block">{label}</span>
                <span className="block text-[10px] opacity-80 mt-0.5">{preview.interval}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/favorites/review/ src/components/favorites/favorites-review.tsx
git commit -m "feat(favorites): add flashcard review page with FSRS rating"
```

---

## Task 8: Navigation, Shortcuts, Command Palette Integration

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/command-palette.tsx`
- Modify: `src/lib/shortcut-definitions.ts`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add Favorites to sidebar**

In `src/components/layout/sidebar.tsx`, add `Heart` to the lucide imports:

```typescript
import { ..., Heart, ... } from 'lucide-react';
```

Add to the Resources group items array (after the Word Books entry):

```typescript
{ href: '/favorites', label: 'Favorites', icon: Heart },
```

- [ ] **Step 2: Add shortcut definitions**

In `src/lib/shortcut-definitions.ts`, add two new entries to `SHORTCUT_DEFINITIONS` array (in the global section, before the Listen Mode section):

```typescript
{
  id: 'global:nav-favorites',
  label: 'Go to Favorites',
  description: 'Navigate to Favorites page',
  scope: 'global',
  defaultKey: '',
  requiresMod: true,
},
{
  id: 'global:toggle-selection-translate',
  label: 'Toggle Selection Translate',
  description: 'Enable or disable selection translation popup',
  scope: 'global',
  defaultKey: '',
  requiresMod: true,
},
```

- [ ] **Step 3: Add command palette entries**

In `src/components/layout/command-palette.tsx`, add `Heart, Play` to the lucide imports:

```typescript
import { BookOpen, Headphones, Heart, MessageCircle, Play, Settings2, SquarePen } from 'lucide-react';
```

Add to the `items` array inside `useMemo`:

```typescript
{
  id: 'global:nav-favorites',
  label: 'Go to Favorites',
  icon: Heart,
  action: () => router.push('/favorites'),
},
{
  id: 'global:start-favorites-review',
  label: 'Start Favorites Review',
  icon: Play,
  action: () => router.push('/favorites/review'),
},
```

- [ ] **Step 4: Add shortcut handlers in layout**

In `src/app/(app)/layout.tsx`, add to the `useShortcuts('global', {...})` object:

```typescript
'global:nav-favorites': () => router.push('/favorites'),
'global:toggle-selection-translate': () => useFavoriteStore.getState().setSelectionTranslateEnabled(
  !useFavoriteStore.getState().selectionTranslateEnabled,
),
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/command-palette.tsx src/lib/shortcut-definitions.ts src/app/\(app\)/layout.tsx
git commit -m "feat(favorites): add sidebar nav, command palette actions, and keyboard shortcuts"
```

---

## Task 9: Auto-Collection Logic

**Files:**
- Create: `src/lib/auto-collect.ts`
- Create: `src/lib/__tests__/auto-collect.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/auto-collect.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAutoCollectByLookup, shouldAutoCollectByWriteErrors, getTodayAutoCollectCount } from '../auto-collect';
import type { AutoCollectSensitivity } from '@/types/favorite';

describe('auto-collect', () => {
  describe('shouldAutoCollectByLookup', () => {
    it('returns true when lookup count meets medium threshold', () => {
      expect(shouldAutoCollectByLookup(3, 'medium')).toBe(true);
    });

    it('returns false below threshold', () => {
      expect(shouldAutoCollectByLookup(2, 'medium')).toBe(false);
    });

    it('respects high sensitivity', () => {
      expect(shouldAutoCollectByLookup(2, 'high')).toBe(true);
      expect(shouldAutoCollectByLookup(1, 'high')).toBe(false);
    });

    it('respects low sensitivity', () => {
      expect(shouldAutoCollectByLookup(5, 'low')).toBe(true);
      expect(shouldAutoCollectByLookup(4, 'low')).toBe(false);
    });
  });

  describe('shouldAutoCollectByWriteErrors', () => {
    it('returns true at medium threshold', () => {
      expect(shouldAutoCollectByWriteErrors(0.5, 'medium')).toBe(true);
    });

    it('returns false below threshold', () => {
      expect(shouldAutoCollectByWriteErrors(0.49, 'medium')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/auto-collect.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement auto-collect**

Create `src/lib/auto-collect.ts`:

```typescript
import { db } from '@/lib/db';
import { normalizeText } from '@/lib/text-normalize';
import { type AutoCollectSensitivity, SENSITIVITY_THRESHOLDS } from '@/types/favorite';
import { useFavoriteStore } from '@/stores/favorite-store';

export function shouldAutoCollectByLookup(count: number, sensitivity: AutoCollectSensitivity): boolean {
  return count >= SENSITIVITY_THRESHOLDS[sensitivity].lookupCount;
}

export function shouldAutoCollectByWriteErrors(errorRate: number, sensitivity: AutoCollectSensitivity): boolean {
  return errorRate >= SENSITIVITY_THRESHOLDS[sensitivity].writeErrorRate;
}

export function shouldAutoCollectByFSRSAgain(consecutiveAgainCount: number, sensitivity: AutoCollectSensitivity): boolean {
  return consecutiveAgainCount >= SENSITIVITY_THRESHOLDS[sensitivity].fsrsAgainCount;
}

export async function getTodayAutoCollectCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStart = startOfDay.getTime();

  const count = await db.favorites
    .where('autoCollected')
    .equals(1) // Dexie stores booleans as 0/1 in indexes
    .filter((f) => f.createdAt >= todayStart)
    .count();

  return count;
}

export async function tryAutoCollect(
  text: string,
  translation: string,
  type: 'word' | 'phrase' | 'sentence',
  targetLang: string,
  sourceModule?: string,
  sourceContentId?: string,
): Promise<boolean> {
  const store = useFavoriteStore.getState();
  const { autoCollectSettings } = store;

  if (!autoCollectSettings.enabled) return false;
  if (store.isFavorited(text)) return false;

  const todayCount = await getTodayAutoCollectCount();
  if (todayCount >= autoCollectSettings.dailyCap) return false;

  await store.addFavorite({
    text,
    translation,
    type,
    folderId: 'auto',
    targetLang,
    sourceModule: sourceModule as any,
    sourceContentId,
    autoCollected: true,
  });

  return true;
}

/**
 * Check lookup history and auto-collect if threshold met.
 * Called after each translation lookup.
 */
export async function checkLookupAutoCollect(
  text: string,
  translation: string,
  type: 'word' | 'phrase' | 'sentence',
  targetLang: string,
  sourceModule?: string,
): Promise<void> {
  const store = useFavoriteStore.getState();
  if (!store.autoCollectSettings.enabled) return;

  const normalized = normalizeText(text);
  const entry = await db.lookupHistory.get(normalized);
  if (!entry) return;

  if (shouldAutoCollectByLookup(entry.count, store.autoCollectSettings.sensitivity)) {
    await tryAutoCollect(text, translation, type, targetLang, sourceModule);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/auto-collect.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auto-collect.ts src/lib/__tests__/auto-collect.test.ts
git commit -m "feat(favorites): add smart auto-collection logic with sensitivity thresholds"
```

---

## Task 10: Settings Section for Smart Collection

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add Smart Collection settings section**

In `src/app/(app)/settings/page.tsx`, add import:

```typescript
import { useFavoriteStore } from '@/stores/favorite-store';
```

Add state hooks inside the `SettingsContent` component:

```typescript
const selectionTranslateEnabled = useFavoriteStore((s) => s.selectionTranslateEnabled);
const setSelectionTranslateEnabled = useFavoriteStore((s) => s.setSelectionTranslateEnabled);
const autoCollectSettings = useFavoriteStore((s) => s.autoCollectSettings);
const setAutoCollectSettings = useFavoriteStore((s) => s.setAutoCollectSettings);
```

Add a new `<Section>` block after the existing Translation section (use `Sparkles` icon which is already imported):

```tsx
<Section title="Selection Translation" icon={Sparkles}>
  <div className="space-y-4">
    <label className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700">启用划词翻译</p>
        <p className="text-xs text-slate-400">选中文本时自动显示翻译弹窗</p>
      </div>
      <input
        type="checkbox"
        checked={selectionTranslateEnabled}
        onChange={(e) => setSelectionTranslateEnabled(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
    </label>

    <label className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700">启用智能自动收藏</p>
        <p className="text-xs text-slate-400">自动收藏高频查询和易错词汇</p>
      </div>
      <input
        type="checkbox"
        checked={autoCollectSettings.enabled}
        onChange={(e) => setAutoCollectSettings({ enabled: e.target.checked })}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
    </label>

    {autoCollectSettings.enabled && (
      <>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">灵敏度</p>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setAutoCollectSettings({ sensitivity: level })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  autoCollectSettings.sensitivity === level
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {{ low: '低', medium: '中', high: '高' }[level]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">每日收藏上限</p>
            <p className="text-xs text-slate-400">每天最多自动收藏的数量</p>
          </div>
          <Input
            type="number"
            min={1}
            max={100}
            value={autoCollectSettings.dailyCap}
            onChange={(e) => setAutoCollectSettings({ dailyCap: Number(e.target.value) || 20 })}
            className="w-20 h-8 text-sm text-center"
          />
        </label>
      </>
    )}
  </div>
</Section>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/settings/page.tsx
git commit -m "feat(settings): add selection translation and smart collection settings section"
```

---

## Task 11: Sync Mapper Extension

**Files:**
- Modify: `src/lib/sync/mapper.ts`
- Modify: `src/lib/sync/engine.ts`

- [ ] **Step 1: Add favorite and folder mappers**

In `src/lib/sync/mapper.ts`, add import:

```typescript
import type { FavoriteFolder, FavoriteItem } from '@/types/favorite';
```

Add mapper functions at the end of the file:

```typescript
// ─── Favorite ─────────────────────────────────────────────────────────────────

export function toSupabaseFavorite(item: FavoriteItem, userId: string): Record<string, unknown> {
  return {
    id: item.id,
    user_id: userId,
    text: item.text,
    normalized_text: item.normalizedText,
    translation: item.translation,
    type: item.type,
    folder_id: item.folderId,
    source_content_id: item.sourceContentId ?? null,
    source_module: item.sourceModule ?? null,
    context: item.context ?? null,
    target_lang: item.targetLang,
    pronunciation: item.pronunciation ?? null,
    notes: item.notes ?? null,
    related: item.related ?? null,
    fsrs_card: item.fsrsCard ?? null,
    next_review: item.nextReview != null ? new Date(item.nextReview).toISOString() : null,
    auto_collected: item.autoCollected,
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

export function fromSupabaseFavorite(row: Record<string, unknown>): FavoriteItem {
  return {
    id: row.id as string,
    text: row.text as string,
    normalizedText: row.normalized_text as string,
    translation: row.translation as string,
    type: row.type as FavoriteItem['type'],
    folderId: row.folder_id as string,
    sourceContentId: (row.source_content_id as string) ?? undefined,
    sourceModule: (row.source_module as FavoriteItem['sourceModule']) ?? undefined,
    context: (row.context as string) ?? undefined,
    targetLang: row.target_lang as string,
    pronunciation: (row.pronunciation as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    related: (row.related as FavoriteItem['related']) ?? undefined,
    fsrsCard: (row.fsrs_card as FavoriteItem['fsrsCard']) ?? undefined,
    nextReview: row.next_review != null ? new Date(row.next_review as string).getTime() : undefined,
    autoCollected: (row.auto_collected as boolean) ?? false,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

// ─── Favorite Folder ──────────────────────────────────────────────────────────

export function toSupabaseFavoriteFolder(folder: FavoriteFolder, userId: string): Record<string, unknown> {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    emoji: folder.emoji,
    color: folder.color ?? null,
    sort_order: folder.sortOrder,
    created_at: new Date(folder.createdAt).toISOString(),
  };
}

export function fromSupabaseFavoriteFolder(row: Record<string, unknown>): FavoriteFolder {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: row.emoji as string,
    color: (row.color as string) ?? undefined,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}
```

- [ ] **Step 2: Update sync engine**

In `src/lib/sync/engine.ts`, update the `SyncableTable` type:

```typescript
type SyncableTable = 'contents' | 'records' | 'sessions' | 'favorites' | 'favoriteFolders';
```

Update `SyncResult` interface to include the new tables:

```typescript
export interface SyncResult {
  pulled: { contents: number; records: number; sessions: number; favorites: number; favoriteFolders: number };
  pushed: { contents: number; records: number; sessions: number; favorites: number; favoriteFolders: number };
  errors: string[];
}
```

Update `emptySyncResult()` accordingly:

```typescript
function emptySyncResult(): SyncResult {
  return {
    pulled: { contents: 0, records: 0, sessions: 0, favorites: 0, favoriteFolders: 0 },
    pushed: { contents: 0, records: 0, sessions: 0, favorites: 0, favoriteFolders: 0 },
    errors: [],
  };
}
```

Add imports for new mappers and add pull/push calls for favorites and favoriteFolders in `fullSync()` and `incrementalSync()` following the existing pattern for contents/records/sessions.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/sync/mapper.ts src/lib/sync/engine.ts
git commit -m "feat(sync): add favorites and favoriteFolders to sync mapper and engine"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Manual smoke test**

Start dev server: `pnpm dev`
Verify:
1. Select text on any page → popup appears with translation
2. Click favorite button → item saved
3. Navigate to `/favorites` → list shows saved items
4. Click "开始复习" → review flow works
5. Folder management dialog works
6. Settings page shows new section
7. Command palette shows new entries

- [ ] **Step 6: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address linting and build issues from integration"
```
