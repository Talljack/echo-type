import type { WordBook } from '@/types/wordbook';

export const coreVocabBooks: WordBook[] = [
  {
    id: 'oxford3000',
    name: '牛津3000核心词',
    nameEn: 'Oxford 3000',
    description:
      'The Oxford 3000 — the most important and useful words to learn in English, selected by language experts.',
    kind: 'vocabulary',
    emoji: '🔤',
    difficulty: 'beginner',
    filterTag: 'Core Vocabulary',
    tags: ['core', 'oxford', 'frequency'],
    itemCount: 1338,
  },
  {
    id: 'oxford5000',
    name: '牛津5000核心词',
    nameEn: 'Oxford 5000',
    description:
      'The Oxford 5000 — an expanded list of 5000 important words for upper-intermediate to advanced learners.',
    kind: 'vocabulary',
    emoji: '🔤',
    difficulty: 'intermediate',
    filterTag: 'Core Vocabulary',
    tags: ['core', 'oxford', 'frequency'],
    itemCount: 5497,
  },
  {
    id: 'coca20000',
    name: 'COCA两万词频',
    nameEn: 'COCA 20000',
    description:
      'The top 20,000 most frequent words from the Corpus of Contemporary American English — the gold standard for word frequency.',
    kind: 'vocabulary',
    emoji: '📚',
    difficulty: 'advanced',
    filterTag: 'Core Vocabulary',
    tags: ['core', 'coca', 'frequency', 'academic'],
    itemCount: 17631,
  },
  {
    id: 'essential4000',
    name: '4000必备英语词',
    nameEn: '4000 Essential Words',
    description:
      'The 4000 Essential English Words series — carefully selected vocabulary with example sentences for effective learning.',
    kind: 'vocabulary',
    emoji: '📖',
    difficulty: 'intermediate',
    filterTag: 'Core Vocabulary',
    tags: ['core', 'essential', 'esl'],
    itemCount: 3593,
  },
];
