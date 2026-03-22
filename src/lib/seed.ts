import { nanoid } from 'nanoid';
import type { ContentItem } from '@/types/content';
import { DEFAULT_FOLDERS } from '@/types/favorite';
import { db } from './db';
import { builtinArticles } from './seed-data/articles';
import { builtinPhrases } from './seed-data/phrases';
import { builtinSentences } from './seed-data/sentences';
import { builtinWords } from './seed-data/words';
import { loadWordBookItems } from './wordbooks';

const SEED_KEY = 'echotype_seeded_v3';
const PREV_SEED_KEYS = ['echotype_seeded_v2', 'echotype_seeded_v1'];
const STARTER_PACKS_KEY = 'echotype_starter_packs_v1';
const STARTER_BOOK_IDS = ['daily-vocab', 'cet4', 'coffee-shop', 'restaurant', 'office-meeting'] as const;

const FAVORITE_FOLDERS_KEY = 'echotype_favorite_folders_seeded_v1';

async function seedFavoriteFolders() {
  if (localStorage.getItem(FAVORITE_FOLDERS_KEY)) return;

  const now = Date.now();
  const existing = await db.favoriteFolders.count();
  if (existing === 0) {
    await db.favoriteFolders.bulkAdd(DEFAULT_FOLDERS.map((f) => ({ ...f, createdAt: now })));
  }

  localStorage.setItem(FAVORITE_FOLDERS_KEY, 'true');
}

async function seedStarterPacks(now: number) {
  if (localStorage.getItem(STARTER_PACKS_KEY)) return;

  for (const bookId of STARTER_BOOK_IDS) {
    const existingCount = await db.contents.where('category').equals(bookId).count();
    if (existingCount > 0) continue;

    const items = await loadWordBookItems(bookId);
    if (items.length === 0) continue;

    await db.contents.bulkAdd(
      items.map((item) => ({
        ...item,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  localStorage.setItem(STARTER_PACKS_KEY, 'true');
}

export async function seedDatabase() {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (!localStorage.getItem(SEED_KEY)) {
    const allContent = [...builtinWords, ...builtinPhrases, ...builtinSentences, ...builtinArticles];
    const hadPrevious = PREV_SEED_KEYS.some((key) => localStorage.getItem(key));

    if (hadPrevious) {
      const existingTitles = new Set(
        (await db.contents.where('source').equals('builtin').toArray()).map((i) => i.title),
      );
      const newItems: ContentItem[] = allContent
        .filter((item) => !existingTitles.has(item.title))
        .map((item) => ({ ...item, id: nanoid(), createdAt: now, updatedAt: now }));
      if (newItems.length > 0) {
        await db.contents.bulkAdd(newItems);
      }
    } else {
      const count = await db.contents.count();
      if (count === 0) {
        const items: ContentItem[] = allContent.map((item) => ({
          ...item,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        }));
        await db.contents.bulkAdd(items);
      }
    }

    localStorage.setItem(SEED_KEY, 'true');
  }

  await seedStarterPacks(now);
  await seedFavoriteFolders();
}
