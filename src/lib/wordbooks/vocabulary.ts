import type { WordBook } from '@/types/wordbook';
import { collegeBooks } from './data/college';
import { professionalBooks } from './data/professional';
import { schoolBooks } from './data/school';
import { testBooks } from './data/test';

export const vocabularyBooks: WordBook[] = [...schoolBooks, ...collegeBooks, ...testBooks, ...professionalBooks];
