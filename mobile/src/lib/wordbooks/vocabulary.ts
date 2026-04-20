import type { WordBook } from '@/types/wordbook';
import { collegeBooks } from './data/college';
import { coreVocabBooks } from './data/core-vocab';
import { moreExamBooks } from './data/more-exams';
import { nceBooks } from './data/nce';
import { professionalBooks } from './data/professional';
import { schoolBooks } from './data/school';
import { techBooks } from './data/tech';
import { testBooks } from './data/test';
import { textbookBooks } from './data/textbook';

export const vocabularyBooks: WordBook[] = [
  ...schoolBooks,
  ...textbookBooks,
  ...nceBooks,
  ...collegeBooks,
  ...testBooks,
  ...moreExamBooks,
  ...coreVocabBooks,
  ...professionalBooks,
  ...techBooks,
];
