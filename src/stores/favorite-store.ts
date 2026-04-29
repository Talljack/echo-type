import { nanoid } from 'nanoid';
import { type Rating } from 'ts-fsrs';
import { create } from 'zustand';
import { db } from '@/lib/db';
import { cardToData, createNewCard, gradeCard } from '@/lib/fsrs';
import { normalizeText } from '@/lib/text-normalize';
import type { AutoCollectSettings, FavoriteFolder, FavoriteItem } from '@/types/favorite';

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
    item: Omit<
      FavoriteItem,
      'id' | 'normalizedText' | 'createdAt' | 'updatedAt' | 'autoCollected' | 'fsrsCard' | 'nextReview'
    > & { autoCollected?: boolean },
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
  } catch {
    /* ignore */
  }
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
      const [favorites, folders] = await Promise.all([db.favorites.toArray(), db.favoriteFolders.toArray()]);
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
      set((state) => ({ favorites: [favorite, ...state.favorites], isLoaded: true }));
      return id;
    },

    removeFavorite: async (id) => {
      await db.favorites.delete(id);
      set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id), isLoaded: true }));
    },

    updateFavorite: async (id, updates) => {
      await db.favorites.update(id, { ...updates, updatedAt: Date.now() });
      set((state) => ({
        favorites: state.favorites.map((f) => (f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f)),
        isLoaded: true,
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
        isLoaded: true,
      }));
      return id;
    },

    updateFolder: async (id, updates) => {
      await db.favoriteFolders.update(id, updates);
      set((state) => ({
        folders: state.folders
          .map((f) => (f.id === id ? { ...f, ...updates } : f))
          .sort((a, b) => a.sortOrder - b.sortOrder),
        isLoaded: true,
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
        favorites: state.favorites.map((f) => (f.folderId === id ? { ...f, folderId: 'default' } : f)),
        isLoaded: true,
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
        isLoaded: true,
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
