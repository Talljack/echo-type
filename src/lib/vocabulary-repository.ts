import { nanoid } from 'nanoid';
import type { Difficulty } from '@/types/content';
import { db } from './db';
import { gradeCard, Rating } from './fsrs';
import { findMorphology } from './morphology';
import { normalizeTags } from './utils';
import {
  introducedVocabularyToday,
  normalizeSpelling,
  parseVocabulary,
  spellingMatches,
  type VocabularyMode,
  validateVocabularyApplication,
  vocabularyRecordId,
} from './vocabulary';
export async function importVocabulary(
  title: string,
  original: string,
  filename?: string,
  database = db,
  uneditedSource = original,
  options: { tags?: string; difficulty?: Difficulty } = {},
): Promise<string> {
  const parsed = parseVocabulary(original);
  if (!title.trim() || title.length > 150 || parsed.errors.length || !parsed.rows.length)
    throw new Error(parsed.errors[0] ?? 'Add a book title and valid words / 请填写词书名及有效词条');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([title.trim(), original])),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  let id = `vocab-book:${nanoid()}`;
  const now = Date.now();
  if (database !== db) throw new Error('Account changed / 账号已切换');
  await database.transaction('rw', [database.contents, database.books, database.importJobs], async () => {
    if (database !== db) throw new Error('Account changed / 账号已切换');
    const imported = await database.importJobs.where('fingerprint').equals(fingerprint).first();
    if (imported && (await database.books.get(imported.id))) {
      id = imported.id;
      return;
    }
    const words = parsed.rows.map((row, index) => ({
      id: `${id}:${index}`,
      title: row.word,
      text: row.example || row.word,
      type: 'word' as const,
      category: id,
      tags: normalizeTags(`vocabulary,${options.tags ?? ''}`),
      difficulty: options.difficulty || 'beginner',
      source: 'imported' as const,
      createdAt: now,
      updatedAt: now,
      metadata: {
        courseTitle: title.trim(),
        sourceFilename: filename,
        vocabulary: {
          meaning: row.meaning,
          example: row.example,
          pronunciation: row.pronunciation,
          bookTitle: title.trim(),
        },
      },
    }));
    for (let offset = 0; offset < words.length; offset += 500) {
      if (database !== db) throw new Error('Account changed / 账号已切换');
      await database.contents.bulkAdd(words.slice(offset, offset + 500));
    }
    await database.books.add({
      id,
      title: title.trim(),
      author: '',
      description: 'Imported vocabulary / 导入词书',
      chapterCount: 1,
      totalWords: words.length,
      difficulty: options.difficulty || 'beginner',
      tags: normalizeTags(`vocabulary,${options.tags ?? ''}`),
      source: 'imported',
      coverEmoji: '',
      metadata: { sourceFilename: filename },
      createdAt: now,
      updatedAt: now,
    });
    await database.importJobs.add({
      id,
      ownerId: database.name,
      status: 'ready',
      kind: 'document',
      title: title.trim(),
      fingerprint,
      filename,
      originalText: uneditedSource,
      blocks: [],
      materialIds: words.map((w) => w.id),
      createdAt: now,
      updatedAt: now,
    });
    if (database !== db) throw new Error('Account changed / 账号已切换');
  });
  return id;
}
export interface VocabularySubmission {
  id: string;
  contentId: string;
  mode: VocabularyMode;
  answer: string;
  revealed: boolean;
  rating: number;
  expectedReview?: number;
  context?: string;
}
export async function saveVocabularySubmission(
  submission: VocabularySubmission,
  database = db,
  now = Date.now(),
): Promise<void> {
  const { contentId, mode, answer, revealed, context } = submission;
  if (
    !['meaning', 'spelling', 'dictation', 'application', 'construction'].includes(mode) ||
    !answer.trim() ||
    answer.length > 5000 ||
    !revealed ||
    ![1, 2, 3, 4].includes(submission.rating)
  )
    throw new Error('Answer first, then compare and rate / 请先作答，再核对评分');
  if (database !== db) throw new Error('Account changed / 账号已切换');
  await database.transaction(
    'rw',
    [database.contents, database.records, database.sessions, database.learningAttempts, database.dailyTasks],
    async () => {
      if (database !== db) throw new Error('Account changed / 账号已切换');
      if (await database.learningAttempts.get(submission.id)) return;
      const content = await database.contents.get(contentId);
      if (!content || content.deletedAt || content.type !== 'word') throw new Error('Word unavailable / 词条已不可用');
      const id = vocabularyRecordId(contentId, mode);
      const previous = await database.records.get(id);
      if (previous?.lastPracticed !== submission.expectedReview)
        throw new Error('This card changed in another window. Reload / 此卡片已更新，请刷新');
      if (previous && (previous.fsrsCard?.due ?? previous.nextReview ?? Infinity) > now)
        throw new Error('Card not due yet / 尚未到复习时间');
      if (!previous) {
        const limit = (await database.dailyTasks.get('preferences:vocabulary'))?.newWordsPerDay ?? 10;
        const introduced = introducedVocabularyToday(await database.learningAttempts.toArray(), mode, now);
        if (introduced >= limit) throw new Error('Daily new-word limit reached / 已达到每日新词上限');
      }
      const morphology = findMorphology(content.title);
      if (mode === 'construction' && !morphology) throw new Error('No verified construction / 暂无核对过的构词资料');
      if (mode === 'spelling' && !content.metadata?.vocabulary?.meaning)
        throw new Error('Definition required / 需要释义');
      const usageIssue =
        mode === 'application'
          ? validateVocabularyApplication(
              content.title,
              answer,
              context ?? '',
              content.metadata?.vocabulary?.example ?? content.text,
            )
          : null;
      if (usageIssue) throw new Error(usageIssue);
      const correct =
        mode === 'construction'
          ? normalizeSpelling(answer).replace(/\s/g, '') === morphology!.parts.map((p) => p.form).join('+')
          : ['spelling', 'dictation'].includes(mode)
            ? spellingMatches(answer, content.title)
            : answer !== '[not recalled]';
      const rating = correct ? (submission.rating as Rating) : Rating.Again;
      const { cardData, nextReview } = gradeCard(previous?.fsrsCard, rating, new Date(now));
      const module = mode === 'meaning' || mode === 'construction' ? 'read' : mode === 'dictation' ? 'listen' : 'write';
      const accuracy = rating === Rating.Again ? 0 : rating === Rating.Hard ? 60 : rating === Rating.Good ? 85 : 100;
      await database.records.put({
        id,
        contentId,
        module,
        attempts: (previous?.attempts ?? 0) + 1,
        correctCount: (previous?.correctCount ?? 0) + (rating > 1 ? 1 : 0),
        accuracy,
        lastPracticed: now,
        nextReview,
        fsrsCard: cardData,
        mistakes: correct
          ? []
          : [
              {
                position: 0,
                expected: mode === 'construction' ? morphology!.parts.map((p) => p.form).join('+') : content.title,
                actual: answer,
                timestamp: now,
              },
            ],
        updatedAt: now,
      });
      await database.learningAttempts.add({
        id: submission.id,
        lessonId: id,
        unitId: content.category ?? contentId,
        activity: mode === 'application' ? 'personal-example' : 'writing',
        sourceContentIds: [contentId],
        sourceText: JSON.stringify({ word: content.title, reference: content.metadata?.vocabulary ?? content.text }),
        prompt: mode,
        answer,
        feedback: { source: 'self', notes: context ?? '', checklist: [`rating:${rating}`] },
        status: 'submitted',
        createdAt: now,
        updatedAt: now,
      });
      await database.sessions.add({
        id: submission.id,
        contentId,
        module,
        startTime: now,
        endTime: now,
        totalChars: answer.length,
        correctChars: rating > Rating.Again ? answer.length : 0,
        wrongChars: rating > Rating.Again ? 0 : answer.length,
        totalWords: 1,
        wpm: 0,
        accuracy,
        completed: true,
        updatedAt: now,
      });
      if (database !== db) throw new Error('Account changed / 账号已切换');
    },
  );
}
