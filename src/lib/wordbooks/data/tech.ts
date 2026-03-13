import type { WordBook } from '@/types/wordbook';

export const techBooks: WordBook[] = [
  {
    id: 'it-words',
    name: 'IT行业词汇',
    nameEn: 'IT Industry Words',
    description:
      'Essential vocabulary for the IT industry, covering programming, networking, databases, and software development.',
    kind: 'vocabulary',
    emoji: '💻',
    difficulty: 'intermediate',
    filterTag: 'Tech',
    tags: ['tech', 'it', 'programming', 'professional'],
    itemCount: 1699,
  },
  {
    id: 'it-vocab',
    name: 'IT技术术语',
    nameEn: 'IT Technical Terms',
    description:
      'Technical vocabulary for software engineers and IT professionals, from algorithms to system architecture.',
    kind: 'vocabulary',
    emoji: '⌨️',
    difficulty: 'intermediate',
    filterTag: 'Tech',
    tags: ['tech', 'it', 'software', 'professional'],
    itemCount: 1665,
  },
  {
    id: 'ai-science',
    name: 'AI科学词汇',
    nameEn: 'AI for Science',
    description: 'Vocabulary at the intersection of artificial intelligence and scientific research.',
    kind: 'vocabulary',
    emoji: '🔬',
    difficulty: 'advanced',
    filterTag: 'Tech',
    tags: ['tech', 'ai', 'science', 'research'],
    itemCount: 491,
  },
  {
    id: 'ai-ml',
    name: 'AI/机器学习词汇',
    nameEn: 'AI & Machine Learning',
    description:
      'Core vocabulary for artificial intelligence and machine learning, from neural networks to transformers.',
    kind: 'vocabulary',
    emoji: '🤖',
    difficulty: 'advanced',
    filterTag: 'Tech',
    tags: ['tech', 'ai', 'machine-learning', 'deep-learning'],
    itemCount: 725,
  },
  {
    id: 'biomedical',
    name: '生物医学词汇',
    nameEn: 'Biomedical',
    description:
      'Specialized vocabulary for biomedical science, covering anatomy, pharmacology, and clinical research.',
    kind: 'vocabulary',
    emoji: '🧬',
    difficulty: 'advanced',
    filterTag: 'Tech',
    tags: ['tech', 'biomedical', 'medical', 'science'],
    itemCount: 536,
  },
];
