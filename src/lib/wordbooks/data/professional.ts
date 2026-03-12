import type { WordBook } from '@/types/wordbook';

export const professionalBooks: WordBook[] = [
  {
    id: 'business-english',
    name: '商务英语核心词汇',
    nameEn: 'Business English',
    description: 'Professional vocabulary for the modern workplace, from emails and meetings to negotiations.',
    kind: 'vocabulary',
    emoji: '💼',
    difficulty: 'intermediate',
    filterTag: 'Professional',
    tags: ['professional', 'business', 'workplace'],
    itemCount: 100,
  },
  {
    id: 'bec',
    name: 'BEC商务英语证书词汇',
    nameEn: 'BEC Certificate',
    description: 'Targeted vocabulary for the Cambridge Business English Certificate exam series.',
    kind: 'vocabulary',
    emoji: '📋',
    difficulty: 'intermediate',
    filterTag: 'Professional',
    tags: ['professional', 'bec', 'cambridge'],
    itemCount: 2822,
  },
  {
    id: 'daily-vocab',
    name: '日常高频词汇',
    nameEn: 'Daily Essentials',
    description:
      'The most useful everyday English words for daily conversation, shopping, travel, and social situations.',
    kind: 'vocabulary',
    emoji: '☀️',
    difficulty: 'beginner',
    filterTag: 'General',
    tags: ['general', 'daily', 'conversation'],
    itemCount: 100,
  },
  {
    id: 'coca',
    name: 'COCA高频学术词汇',
    nameEn: 'COCA Academic',
    description:
      'Top academic words from the Corpus of Contemporary American English, essential for reading comprehension.',
    kind: 'vocabulary',
    emoji: '📚',
    difficulty: 'intermediate',
    filterTag: 'Academic',
    tags: ['academic', 'coca', 'corpus'],
    itemCount: 100,
  },
];
