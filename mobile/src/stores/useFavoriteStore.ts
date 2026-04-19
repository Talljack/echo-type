import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type FSRSCardData, gradeCard, type Rating, State } from '@/lib/fsrs';
import type { FavoriteFolder, FavoriteItem, FavoriteSourceModule, FavoriteType, RelatedData } from '@/types/favorite';
import { DEFAULT_FOLDERS } from '@/types/favorite';

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function ensureDefaultFolders(folders: FavoriteFolder[]): FavoriteFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f] as const));
  for (const d of DEFAULT_FOLDERS) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

interface LegacyReviewCard {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  fsrsData: FSRSCardData;
}

interface LegacyReviewPersist {
  state?: {
    cards?: LegacyReviewCard[];
    todayReviewCount?: number;
    lastReviewDate?: string | null;
  };
}

async function migrateLegacyReviewStorage(
  set: (partial: Partial<FavoriteState> | ((s: FavoriteState) => Partial<FavoriteState>)) => void,
) {
  const legacyRaw = await AsyncStorage.getItem('review-storage');
  if (!legacyRaw) return;
  try {
    const parsed = JSON.parse(legacyRaw) as LegacyReviewPersist;
    const cards = parsed?.state?.cards;
    if (!Array.isArray(cards) || cards.length === 0) {
      await AsyncStorage.removeItem('review-storage');
      return;
    }
    const now = Date.now();
    const mapped: FavoriteItem[] = cards.map((c) => ({
      id: c.id,
      text: c.word,
      normalizedText: normalizeText(c.word),
      translation: c.meaning,
      type: 'word',
      folderId: 'default',
      context: c.example,
      targetLang: 'en',
      fsrsCard: c.fsrsData,
      nextReview: c.fsrsData?.due,
      autoCollected: false,
      createdAt: now,
      updatedAt: now,
    }));
    set((s) => {
      const existingIds = new Set(s.items.map((i) => i.id));
      const toAdd = mapped.filter((m) => !existingIds.has(m.id));
      return {
        items: [...toAdd, ...s.items],
        todayReviewCount: parsed.state?.todayReviewCount ?? s.todayReviewCount,
        lastReviewDate: parsed.state?.lastReviewDate ?? s.lastReviewDate,
        folders: ensureDefaultFolders(s.folders),
      };
    });
    await AsyncStorage.removeItem('review-storage');
  } catch {
    await AsyncStorage.removeItem('review-storage');
  }
}

export interface FavoriteState {
  items: FavoriteItem[];
  folders: FavoriteFolder[];
  isLoaded: boolean;

  addFavorite: (params: {
    text: string;
    translation: string;
    type: FavoriteType;
    folderId?: string;
    sourceContentId?: string;
    sourceModule?: FavoriteSourceModule;
    context?: string;
    targetLang?: string;
    pronunciation?: string;
    notes?: string;
    related?: RelatedData;
    autoCollected?: boolean;
  }) => void;
  removeFavorite: (id: string) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => void;
  isFavorited: (text: string) => boolean;

  addFolder: (name: string, emoji: string, color?: string) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<FavoriteFolder>) => void;

  gradeFavorite: (id: string, rating: Rating) => void;
  getDueFavorites: () => FavoriteItem[];
  getFavoriteCount: () => { total: number; due: number; new: number; learning: number; review: number };

  incrementReviewCount: () => void;
  todayReviewCount: number;
  lastReviewDate: string | null;

  addSampleFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      items: [],
      folders: [...DEFAULT_FOLDERS],
      isLoaded: false,
      todayReviewCount: 0,
      lastReviewDate: null,

      addFavorite: (params) => {
        const now = Date.now();
        const id = newId('fav');
        const text = params.text.trim();
        const translation = params.translation.trim();
        const folderId = params.folderId ?? 'default';
        const targetLang = params.targetLang ?? 'en';
        const date = new Date();
        const fsrsCard = gradeCard(undefined, 3, date).cardData;

        const item: FavoriteItem = {
          id,
          text,
          normalizedText: normalizeText(text),
          translation,
          type: params.type,
          folderId,
          sourceContentId: params.sourceContentId,
          sourceModule: params.sourceModule,
          context: params.context,
          targetLang,
          pronunciation: params.pronunciation,
          notes: params.notes,
          related: params.related,
          fsrsCard,
          nextReview: fsrsCard.due,
          autoCollected: params.autoCollected ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          items: [...state.items, item],
          folders: ensureDefaultFolders(state.folders),
        }));
      },

      removeFavorite: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateFavorite: (id, updates) => {
        const now = Date.now();
        set((state) => ({
          items: state.items.map((i) => {
            if (i.id !== id) return i;
            const next: FavoriteItem = { ...i, ...updates, updatedAt: now };
            if (updates.text !== undefined) {
              next.normalizedText = normalizeText(updates.text);
            }
            return next;
          }),
        }));
      },

      isFavorited: (text) => {
        const key = normalizeText(text);
        return get().items.some((i) => i.normalizedText === key);
      },

      addFolder: (name, emoji, color) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const now = Date.now();
        const folders = ensureDefaultFolders(get().folders);
        const maxOrder = folders.reduce((m, f) => Math.max(m, f.sortOrder), 0);
        const folder: FavoriteFolder = {
          id: newId('folder'),
          name: trimmed,
          emoji: emoji.trim() || '📁',
          color,
          sortOrder: maxOrder + 1,
          createdAt: now,
        };
        set({ folders: [...folders, folder].sort((a, b) => a.sortOrder - b.sortOrder) });
      },

      removeFolder: (id) => {
        if (id === 'default' || id === 'auto') return;
        set((state) => {
          const nextFolders = state.folders.filter((f) => f.id !== id);
          const nextItems = state.items.map((i) => (i.folderId === id ? { ...i, folderId: 'default' } : i));
          return { folders: ensureDefaultFolders(nextFolders), items: nextItems };
        });
      },

      updateFolder: (id, updates) => {
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
      },

      gradeFavorite: (id, rating) => {
        const now = new Date();
        set((state) => ({
          items: state.items.map((i) => {
            if (i.id !== id) return i;
            const { cardData, nextReview } = gradeCard(i.fsrsCard, rating, now);
            return { ...i, fsrsCard: cardData, nextReview, updatedAt: Date.now() };
          }),
        }));
        get().incrementReviewCount();
      },

      getDueFavorites: () => {
        const now = Date.now();
        return get().items.filter((i) => {
          if (!i.fsrsCard) return true;
          return i.fsrsCard.due <= now;
        });
      },

      getFavoriteCount: () => {
        const items = get().items;
        const now = Date.now();
        const due = items.filter((i) => !i.fsrsCard || i.fsrsCard.due <= now);
        return {
          total: items.length,
          due: due.length,
          new: items.filter((i) => i.fsrsCard?.state === State.New).length,
          learning: items.filter((i) => i.fsrsCard?.state === State.Learning || i.fsrsCard?.state === State.Relearning)
            .length,
          review: items.filter((i) => i.fsrsCard?.state === State.Review).length,
        };
      },

      incrementReviewCount: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastReviewDate, todayReviewCount } = get();
        if (lastReviewDate !== today) {
          set({ todayReviewCount: 1, lastReviewDate: today });
        } else {
          set({ todayReviewCount: todayReviewCount + 1 });
        }
      },

      addSampleFavorites: () => {
        const samples: Array<{
          text: string;
          translation: string;
          type: FavoriteType;
          pronunciation?: string;
          context?: string;
        }> = [
          {
            text: 'resilient',
            translation: '有弹性的；能迅速恢复的',
            type: 'word',
            pronunciation: '/rɪˈzɪliənt/',
            context: 'She is a resilient person who always bounces back.',
          },
          {
            text: 'break the ice',
            translation: '打破僵局；消除隔阂',
            type: 'phrase',
            context: 'He told a joke to break the ice at the meeting.',
          },
          {
            text: 'The early bird catches the worm',
            translation: '早起的鸟儿有虫吃',
            type: 'sentence',
          },
          {
            text: 'eloquent',
            translation: '雄辩的；有说服力的',
            type: 'word',
            pronunciation: '/ˈeləkwənt/',
            context: 'The speaker gave an eloquent speech about justice.',
          },
          {
            text: 'take it for granted',
            translation: '认为理所当然',
            type: 'phrase',
            context: "Don't take your health for granted.",
          },
          { text: 'pragmatic', translation: '务实的；实用主义的', type: 'word', pronunciation: '/præɡˈmætɪk/' },
          { text: 'a blessing in disguise', translation: '塞翁失马，焉知非福', type: 'phrase' },
          {
            text: 'diligent',
            translation: '勤奋的；刻苦的',
            type: 'word',
            pronunciation: '/ˈdɪlɪdʒənt/',
            context: 'She is a diligent student who always completes her homework.',
          },
        ];

        const now = new Date();
        const date = Date.now();
        const newItems: FavoriteItem[] = samples.map((s) => {
          const fsrsCard = gradeCard(undefined, 3, now).cardData;
          return {
            id: newId('fav'),
            text: s.text,
            normalizedText: normalizeText(s.text),
            translation: s.translation,
            type: s.type,
            folderId: 'default',
            context: s.context,
            targetLang: 'zh',
            pronunciation: s.pronunciation,
            fsrsCard,
            nextReview: fsrsCard.due,
            autoCollected: false,
            createdAt: date,
            updatedAt: date,
          };
        });

        set((state) => {
          const existing = new Set(state.items.map((i) => i.normalizedText));
          const toAdd = newItems.filter((i) => !existing.has(i.normalizedText));
          return {
            items: [...state.items, ...toAdd],
            folders: ensureDefaultFolders(state.folders),
          };
        });
      },
    }),
    {
      name: 'favorite-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        items: s.items,
        folders: s.folders,
        todayReviewCount: s.todayReviewCount,
        lastReviewDate: s.lastReviewDate,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FavoriteState>;
        return {
          ...current,
          ...p,
          folders: ensureDefaultFolders(p.folders ?? current.folders),
          isLoaded: false,
        };
      },
      onRehydrateStorage: () => () => {
        void (async () => {
          await migrateLegacyReviewStorage(useFavoriteStore.setState);
          useFavoriteStore.setState((s) => ({
            isLoaded: true,
            folders: ensureDefaultFolders(s.folders),
          }));
        })();
      },
    },
  ),
);
