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
