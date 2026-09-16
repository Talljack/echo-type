import type { ContentItem, LearningRecord } from '@/types/content';
import type { DailyTask } from '@/types/daily-task';
import type { LearningAttempt } from '@/types/learning-activity';
import { toLocalDateKey } from './date-key';
import { VOCABULARY_MAX_BYTES, VOCABULARY_MAX_ROWS } from './import-limits';
export function introducedVocabularyToday(attempts: LearningAttempt[], mode: VocabularyMode, now: number) {
  const first = new Map<string, number>();
  for (const a of attempts)
    if (a.lessonId.startsWith(`vocabulary:${mode}:`))
      first.set(a.lessonId, Math.min(first.get(a.lessonId) ?? Infinity, a.createdAt));
  return [...first.values()].filter((time) => toLocalDateKey(time) === toLocalDateKey(now)).length;
}
export function buildVocabularyTasks(
  contents: ContentItem[],
  records: LearningRecord[],
  attempts: LearningAttempt[],
  limit: number,
  now: number,
): DailyTask[] {
  const modes: VocabularyMode[] = ['meaning', 'spelling', 'dictation', 'application', 'construction'];
  const dateKey = toLocalDateKey(now);
  const result: DailyTask[] = [];
  for (const mode of modes) {
    const queue = vocabularyQueue(
      contents,
      records,
      mode,
      mode === 'meaning' ? limit : 0,
      now,
      introducedVocabularyToday(attempts, mode, now),
    );
    for (const content of queue) {
      const sourceId = vocabularyRecordId(content.id, mode);
      const record = records.find((r) => r.id === sourceId);
      result.push({
        id: `${dateKey}:${sourceId}:${record?.lastPracticed ?? 'new'}`,
        dateKey,
        originDateKey: dateKey,
        kind: record ? 'review' : 'course',
        sourceId,
        contentIds: [content.id],
        vocabularyMode: mode,
        dueAt: record ? (record.fsrsCard?.due ?? record.nextReview) : undefined,
        title: `${content.title} · ${mode}`,
        titleZh: `${content.title} · ${{ meaning: '回忆词义', spelling: '拼写', dictation: '听写', application: '造句', construction: '构词' }[mode]}`,
        reason: record ? 'Word review due' : 'Recall a new word',
        reasonZh: record ? '单词复习已到期' : '主动回忆一个新词',
        href: `/library/vocabulary?word=${encodeURIComponent(content.id)}&mode=${mode}`,
        minutes: 2,
        status: 'pending',
        priority: record ? 40 : 15,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return result;
}
export type VocabularyMode = 'meaning' | 'spelling' | 'dictation' | 'application' | 'construction';
export function validateVocabularyApplication(
  word: string,
  answer: string,
  context: string,
  example: string,
): string | null {
  const escaped = normalizeSpelling(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (
    !context.trim() ||
    answer.trim().split(/\s+/).length < 4 ||
    !new RegExp(`(?:^|[^a-z])${escaped}(?=$|[^a-z])`, 'i').test(normalizeSpelling(answer)) ||
    normalizeSpelling(answer) === normalizeSpelling(example)
  )
    return 'Use the word in your own sentence (4+ words) and describe a new situation / 请用该词写至少四词的新句子，并说明新语境，勿照抄例句';
  return null;
}
export interface VocabularyRow {
  word: string;
  meaning: string;
  example: string;
  pronunciation: string;
}
export function parseVocabulary(
  text: string,
  preserveIncompleteRows = false,
): { rows: VocabularyRow[]; duplicates: number; errors: string[] } {
  const result = { rows: [] as VocabularyRow[], duplicates: 0, errors: [] as string[] };
  if (text.length > VOCABULARY_MAX_BYTES || new TextEncoder().encode(text).byteLength > VOCABULARY_MAX_BYTES)
    return { ...result, errors: ['Maximum input size: 20 MB / 输入最多 20 MB'] };
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const separator = text.split('\n')[0]?.includes('\t') ? '\t' : ',';
  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  const pushCell = () => {
    row.push(cell.trim());
    cell = '';
    closed = false;
  };
  const pushRow = () => {
    pushCell();
    if (row.some(Boolean) || (preserveIncompleteRows && row.length > 1)) table.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === separator) pushCell();
    else if (char === '\n') pushRow();
    else if (char === '"' && !cell && !closed) quoted = true;
    else if ((closed && char.trim()) || char === '"') return { ...result, errors: ['Invalid quotes / 引号格式错误'] };
    else cell += char;
  }
  if (quoted) return { ...result, errors: ['Unclosed quote / 引号未闭合'] };
  pushRow();
  const aliases: Record<string, keyof VocabularyRow> = {
    word: 'word',
    term: 'word',
    单词: 'word',
    meaning: 'meaning',
    definition: 'meaning',
    释义: 'meaning',
    example: 'example',
    例句: 'example',
    pronunciation: 'pronunciation',
    音标: 'pronunciation',
  };
  const header = table[0]?.map((value) => aliases[value.toLowerCase()]);
  const hasHeader = header?.includes('word') && header.includes('meaning');
  if (table.length - (hasHeader ? 1 : 0) > VOCABULARY_MAX_ROWS)
    return { ...result, errors: ['Maximum 100,000 words / 最多 100000 个词条'] };
  const columns = hasHeader ? header : (['word', 'meaning', 'example', 'pronunciation'] as const);
  const seen = new Set<string>();
  for (const [index, fields] of table.slice(hasHeader ? 1 : 0).entries()) {
    const item: VocabularyRow = { word: '', meaning: '', example: '', pronunciation: '' };
    columns?.forEach((key, i) => {
      if (key) item[key] = fields[i] ?? '';
    });
    if (
      !/^[A-Za-z][A-Za-z ’'\-‐‑–.]*$/.test(item.word) ||
      !item.meaning ||
      item.word.length > 100 ||
      fields.some((f) => f.length > 5000) ||
      fields.length > (columns?.length ?? 4)
    ) {
      result.errors.push(
        `Row ${index + (hasHeader ? 2 : 1)}: check English word, meaning and columns / 检查英文、释义和列数`,
      );
      if (preserveIncompleteRows) result.rows.push(item);
      continue;
    }
    const key = JSON.stringify([normalizeSpelling(item.word), item.meaning, item.example, item.pronunciation]);
    if (seen.has(key)) result.duplicates++;
    else {
      seen.add(key);
      result.rows.push(item);
    }
  }
  return result;
}
export function vocabularyRecordId(contentId: string, mode: VocabularyMode) {
  return `vocabulary:${mode}:${contentId}`;
}
export function vocabularyQueue(
  contents: ContentItem[],
  records: LearningRecord[],
  mode: VocabularyMode,
  limit: number,
  now: number,
  introducedToday?: number,
): ContentItem[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const live = contents.filter((c) => c.type === 'word' && !c.deletedAt && !c.metadata?.lessonSourceId);
  live.sort(
    (a, b) =>
      Number(b.source === 'imported') - Number(a.source === 'imported') ||
      b.createdAt - a.createdAt ||
      (a.category && a.category === b.category ? a.id.localeCompare(b.id, 'en', { numeric: true }) : 0),
  );
  const todayNew =
    introducedToday ??
    live.filter((c) => {
      const r = byId.get(vocabularyRecordId(c.id, mode));
      return r?.attempts === 1 && toLocalDateKey(r.lastPracticed) === toLocalDateKey(now);
    }).length;
  const due = live.filter((c) => {
    const r = byId.get(vocabularyRecordId(c.id, mode));
    return r && (r.fsrsCard?.due ?? r.nextReview ?? Infinity) <= now;
  });
  due.sort(
    (a, b) =>
      (byId.get(vocabularyRecordId(a.id, mode))?.nextReview ?? 0) -
      (byId.get(vocabularyRecordId(b.id, mode))?.nextReview ?? 0),
  );
  return [
    ...due,
    ...live
      .filter((c) => !byId.has(vocabularyRecordId(c.id, mode)))
      .slice(0, Math.max(0, Math.min(100, Math.floor(limit) || 0) - todayNew)),
  ];
}
export function normalizeSpelling(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ');
}
export function spellingMatches(answer: string, word: string) {
  return !!answer.trim() && normalizeSpelling(answer) === normalizeSpelling(word);
}
