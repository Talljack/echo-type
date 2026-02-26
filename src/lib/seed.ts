import { nanoid } from 'nanoid';
import { db } from './db';
import type { ContentItem } from '@/types/content';
import { builtinWords } from './seed-data/words';
import { builtinPhrases } from './seed-data/phrases';
import { builtinSentences } from './seed-data/sentences';
import { builtinArticles } from './seed-data/articles';

const SEED_KEY = 'echotype_seeded_v2';
const PREV_SEED_KEY = 'echotype_seeded_v1';

export async function seedDatabase() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_KEY)) return;

  const now = Date.now();
  const allContent = [...builtinWords, ...builtinPhrases, ...builtinSentences, ...builtinArticles];
  const hadV1 = localStorage.getItem(PREV_SEED_KEY);

  if (hadV1) {
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
