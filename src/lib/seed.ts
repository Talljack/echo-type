import { nanoid } from 'nanoid';
import { db } from './db';
import type { ContentItem } from '@/types/content';

const SEED_KEY = 'echotype_seeded_v1';

const builtinWords: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { title: 'hello', text: 'hello', type: 'word', tags: ['greeting'], source: 'builtin', difficulty: 'beginner' },
  { title: 'world', text: 'world', type: 'word', tags: ['basic'], source: 'builtin', difficulty: 'beginner' },
  { title: 'computer', text: 'computer', type: 'word', tags: ['technology'], source: 'builtin', difficulty: 'beginner' },
  { title: 'language', text: 'language', type: 'word', tags: ['education'], source: 'builtin', difficulty: 'beginner' },
  { title: 'practice', text: 'practice', type: 'word', tags: ['education'], source: 'builtin', difficulty: 'beginner' },
  { title: 'beautiful', text: 'beautiful', type: 'word', tags: ['adjective'], source: 'builtin', difficulty: 'beginner' },
  { title: 'important', text: 'important', type: 'word', tags: ['adjective'], source: 'builtin', difficulty: 'beginner' },
  { title: 'experience', text: 'experience', type: 'word', tags: ['noun'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'knowledge', text: 'knowledge', type: 'word', tags: ['education'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'understand', text: 'understand', type: 'word', tags: ['verb'], source: 'builtin', difficulty: 'beginner' },
  { title: 'environment', text: 'environment', type: 'word', tags: ['nature'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'technology', text: 'technology', type: 'word', tags: ['technology'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'communication', text: 'communication', type: 'word', tags: ['social'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'opportunity', text: 'opportunity', type: 'word', tags: ['business'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'development', text: 'development', type: 'word', tags: ['business'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'responsibility', text: 'responsibility', type: 'word', tags: ['character'], source: 'builtin', difficulty: 'advanced' },
  { title: 'extraordinary', text: 'extraordinary', type: 'word', tags: ['adjective'], source: 'builtin', difficulty: 'advanced' },
  { title: 'sophisticated', text: 'sophisticated', type: 'word', tags: ['adjective'], source: 'builtin', difficulty: 'advanced' },
  { title: 'accomplishment', text: 'accomplishment', type: 'word', tags: ['noun'], source: 'builtin', difficulty: 'advanced' },
  { title: 'determination', text: 'determination', type: 'word', tags: ['character'], source: 'builtin', difficulty: 'advanced' },
];

const builtinPhrases: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { title: 'Good morning', text: 'Good morning', type: 'phrase', tags: ['greeting'], source: 'builtin', difficulty: 'beginner' },
  { title: 'How are you', text: 'How are you doing today', type: 'phrase', tags: ['greeting'], source: 'builtin', difficulty: 'beginner' },
  { title: 'Nice to meet you', text: 'Nice to meet you', type: 'phrase', tags: ['greeting'], source: 'builtin', difficulty: 'beginner' },
  { title: 'Thank you very much', text: 'Thank you very much', type: 'phrase', tags: ['polite'], source: 'builtin', difficulty: 'beginner' },
  { title: 'See you later', text: 'See you later', type: 'phrase', tags: ['farewell'], source: 'builtin', difficulty: 'beginner' },
  { title: 'Break a leg', text: 'Break a leg', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'Piece of cake', text: 'It is a piece of cake', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'Hit the nail on the head', text: 'You hit the nail on the head', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'Under the weather', text: 'I am feeling under the weather', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'The ball is in your court', text: 'The ball is in your court', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'advanced' },
];

const builtinSentences: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { title: 'Learning English', text: 'Learning English opens doors to new opportunities around the world.', type: 'sentence', tags: ['motivation'], source: 'builtin', difficulty: 'beginner' },
  { title: 'Practice makes perfect', text: 'Practice makes perfect, so keep trying every day.', type: 'sentence', tags: ['motivation'], source: 'builtin', difficulty: 'beginner' },
  { title: 'Reading books', text: 'Reading books is one of the best ways to improve your vocabulary.', type: 'sentence', tags: ['education'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'Communication skills', text: 'Good communication skills are essential for success in both personal and professional life.', type: 'sentence', tags: ['business'], source: 'builtin', difficulty: 'intermediate' },
  { title: 'Technology and education', text: 'Technology has transformed the way we learn and communicate with each other.', type: 'sentence', tags: ['technology'], source: 'builtin', difficulty: 'intermediate' },
];

const builtinArticles: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'The Joy of Learning',
    text: 'Learning a new language is like opening a window to a different world. Every word you learn brings you closer to understanding another culture. The journey may be challenging, but the rewards are immeasurable. Start with simple words and phrases, then gradually build your way up to more complex sentences and conversations.',
    type: 'article',
    tags: ['motivation', 'education'],
    source: 'builtin',
    difficulty: 'beginner',
  },
  {
    title: 'Digital Communication',
    text: 'In the modern world, digital communication has become an essential part of our daily lives. From emails to social media, we constantly use written English to express our thoughts and ideas. Improving your English writing skills can help you communicate more effectively in both personal and professional settings. The key is consistent practice and a willingness to learn from your mistakes.',
    type: 'article',
    tags: ['technology', 'communication'],
    source: 'builtin',
    difficulty: 'intermediate',
  },
  {
    title: 'The Art of Public Speaking',
    text: 'Public speaking is often cited as one of the most common fears, yet it remains one of the most valuable skills in professional life. Whether you are presenting to a small team or addressing a large audience, the ability to articulate your ideas clearly and confidently can set you apart. The foundation of great public speaking lies in thorough preparation, understanding your audience, and practicing your delivery until it feels natural.',
    type: 'article',
    tags: ['business', 'communication'],
    source: 'builtin',
    difficulty: 'advanced',
  },
];

export async function seedDatabase() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_KEY)) return;

  const count = await db.contents.count();
  if (count > 0) {
    localStorage.setItem(SEED_KEY, 'true');
    return;
  }

  const now = Date.now();
  const allContent = [...builtinWords, ...builtinPhrases, ...builtinSentences, ...builtinArticles];

  const items: ContentItem[] = allContent.map((item) => ({
    ...item,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  }));

  await db.contents.bulkAdd(items);
  localStorage.setItem(SEED_KEY, 'true');
}
