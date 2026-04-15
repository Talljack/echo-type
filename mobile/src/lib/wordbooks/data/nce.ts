import type { WordBook } from '@/types/wordbook';

export const nceBooks: WordBook[] = [
  {
    id: 'nce1',
    name: '新概念英语第一册',
    nameEn: 'NCE Book 1',
    description:
      'Vocabulary from New Concept English Book 1 — First Things First. Foundation-level words for beginners.',
    kind: 'vocabulary',
    emoji: '📕',
    difficulty: 'beginner',
    filterTag: 'Textbook',
    tags: ['textbook', 'nce', 'new-concept', 'beginner'],
    itemCount: 866,
  },
  {
    id: 'nce2',
    name: '新概念英语第二册',
    nameEn: 'NCE Book 2',
    description:
      'Vocabulary from New Concept English Book 2 — Practice and Progress. Building fluency with intermediate words.',
    kind: 'vocabulary',
    emoji: '📕',
    difficulty: 'intermediate',
    filterTag: 'Textbook',
    tags: ['textbook', 'nce', 'new-concept', 'intermediate'],
    itemCount: 840,
  },
  {
    id: 'nce3',
    name: '新概念英语第三册',
    nameEn: 'NCE Book 3',
    description:
      'Vocabulary from New Concept English Book 3 — Developing Skills. Advanced vocabulary for proficient learners.',
    kind: 'vocabulary',
    emoji: '📕',
    difficulty: 'advanced',
    filterTag: 'Textbook',
    tags: ['textbook', 'nce', 'new-concept', 'advanced'],
    itemCount: 1050,
  },
  {
    id: 'nce4',
    name: '新概念英语第四册',
    nameEn: 'NCE Book 4',
    description:
      'Vocabulary from New Concept English Book 4 — Fluency in English. Mastery-level words for advanced learners.',
    kind: 'vocabulary',
    emoji: '📕',
    difficulty: 'advanced',
    filterTag: 'Textbook',
    tags: ['textbook', 'nce', 'new-concept', 'advanced'],
    itemCount: 1050,
  },
];
