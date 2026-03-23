import { nanoid } from 'nanoid';
import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import type { CEFRLevel } from '@/stores/assessment-store';
import type { DailyGoal, PlanTask } from '@/stores/daily-plan-store';
import type { ContentItem, Difficulty, LearningRecord, TypingSession } from '@/types/content';

const DAY_MS = 24 * 60 * 60 * 1000;
const MODULE_ORDER: PlanTask['module'][] = ['write', 'read', 'speak', 'listen'];
const MODULE_BASE_BONUS: Record<PlanTask['module'], number> = {
  write: 4,
  read: 3,
  speak: 2,
  listen: 1,
};

interface DailyPlanOptions {
  currentLevel?: CEFRLevel | null;
  dateKey?: string;
}

interface ModuleStats {
  avgAccuracy: number;
  lastPracticed: number | null;
  attempts: number;
}

interface PlannedCandidate {
  task: PlanTask;
  score: number;
  weeklyPriorityEligible: boolean;
}

/**
 * Generate today's forward-learning plan tasks based on user data.
 *
 * Priority:
 * 1. Skill tasks ranked by weakness + recency + difficulty fit
 *
 * Due review is intentionally handled outside this generator via Today Review
 * so the Dashboard can present plan and review as two separate choices.
 */
export async function generateDailyPlan(goal: DailyGoal, options: DailyPlanOptions = {}): Promise<PlanTask[]> {
  const now = Date.now();
  const dateKey = options.dateKey ?? toLocalDateKey(now);
  const maxTasks = Math.max(1, Math.min(goal.sessionsPerDay, 5));
  const targetDifficulty = levelToDifficulty(options.currentLevel);

  const [records, sessions, contents] = await Promise.all([
    db.records.toArray(),
    db.sessions.toArray(),
    db.contents.toArray(),
  ]);
  const modulePriority = buildModulePriority(records, sessions, now);
  const recentModules = getRecentPracticedModules(records, sessions, now);
  const contentsById = new Map(contents.map((content) => [content.id, content]));

  const candidates: PlannedCandidate[] = [];
  const writeTask = await buildNewWordsTask(goal, targetDifficulty, modulePriority.write, dateKey);
  if (writeTask) candidates.push(writeTask);

  const readTask = await buildArticleTask(contents, sessions, targetDifficulty, modulePriority.read, dateKey);
  if (readTask) candidates.push(readTask);

  const speakTask = await buildSpeakTask(goal, targetDifficulty, modulePriority.speak, sessions, contentsById, dateKey);
  if (speakTask) candidates.push(speakTask);

  const listenTask = await buildListenTask(
    contents,
    sessions,
    targetDifficulty,
    modulePriority.listen,
    dateKey,
    readTask?.task.contentId,
  );
  if (listenTask) candidates.push(listenTask);

  const rankedCandidates = [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      compareTasksForDate(a.task, b.task, dateKey) ||
      MODULE_ORDER.indexOf(a.task.module) - MODULE_ORDER.indexOf(b.task.module),
  );

  return pickCandidatesForCoverage(
    rankedCandidates,
    maxTasks,
    new Set<PlanTask['module']>(),
    new Set(MODULE_ORDER.filter((module) => !recentModules.has(module))),
  ).map((candidate) => candidate.task);
}

export async function getDailyPlanSignature(): Promise<string> {
  const contents = await db.contents.toArray();
  if (contents.length === 0) return '0:0:0';

  const latestUpdate = Math.max(...contents.map((content) => content.updatedAt ?? content.createdAt ?? 0));
  const categoryCount = new Set(contents.map((content) => content.category ?? '')).size;

  return `${contents.length}:${categoryCount}:${latestUpdate}`;
}

function levelToDifficulty(level?: CEFRLevel | null): Difficulty | undefined {
  if (!level) return undefined;
  if (level === 'A1' || level === 'A2') return 'beginner';
  if (level === 'B1' || level === 'B2') return 'intermediate';
  return 'advanced';
}

function difficultyDistance(target: Difficulty | undefined, actual: Difficulty | undefined): number {
  if (!target || !actual) return 1;
  const order: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
  return Math.abs(order.indexOf(target) - order.indexOf(actual));
}

function difficultyFitScore(target: Difficulty | undefined, actual: Difficulty | undefined): number {
  const distance = difficultyDistance(target, actual);
  if (distance === 0) return 12;
  if (distance === 1) return 6;
  if (distance >= 2) return -12;
  return actual ? 0 : 4;
}

function isWeeklyBalanceEligible(target: Difficulty | undefined, actual: Difficulty | undefined): boolean {
  if (!target || !actual) return true;
  return difficultyDistance(target, actual) <= 1;
}

function getSessionTimestamp(session: TypingSession): number {
  return session.endTime ?? session.startTime;
}

function getRecentPracticedModules(
  records: LearningRecord[],
  sessions: TypingSession[],
  now: number,
): Set<PlanTask['module']> {
  const windowStart = now - 7 * DAY_MS;
  const modules = new Set<PlanTask['module']>();

  for (const record of records) {
    if (typeof record.lastPracticed === 'number' && record.lastPracticed >= windowStart) {
      modules.add(record.module);
    }
  }

  for (const session of sessions) {
    if (getSessionTimestamp(session) >= windowStart) {
      modules.add(session.module);
    }
  }

  return modules;
}

function buildModulePriority(
  records: LearningRecord[],
  sessions: TypingSession[],
  now: number,
): Record<PlanTask['module'], number> {
  const stats = MODULE_ORDER.reduce<Record<PlanTask['module'], ModuleStats>>(
    (acc, module) => {
      const moduleRecords = records.filter((record) => record.module === module);
      const moduleSessions = sessions.filter((session) => session.module === module);
      const attempts = Math.max(moduleRecords.length, moduleSessions.length);
      const avgAccuracy = moduleRecords.length
        ? moduleRecords.reduce((sum, record) => sum + record.accuracy, 0) / moduleRecords.length
        : 70;
      const lastPracticedValues = [
        ...moduleRecords.map((record) => record.lastPracticed),
        ...moduleSessions.map(getSessionTimestamp),
      ].filter((value) => typeof value === 'number');
      acc[module] = {
        avgAccuracy,
        lastPracticed: lastPracticedValues.length > 0 ? Math.max(...lastPracticedValues) : null,
        attempts,
      };
      return acc;
    },
    {
      listen: { avgAccuracy: 70, lastPracticed: null, attempts: 0 },
      speak: { avgAccuracy: 70, lastPracticed: null, attempts: 0 },
      read: { avgAccuracy: 70, lastPracticed: null, attempts: 0 },
      write: { avgAccuracy: 70, lastPracticed: null, attempts: 0 },
    },
  );

  return MODULE_ORDER.reduce<Record<PlanTask['module'], number>>(
    (acc, module) => {
      const stat = stats[module];
      const inactivityDays = stat.lastPracticed ? Math.min(14, Math.floor((now - stat.lastPracticed) / DAY_MS)) : 7;
      const weakness = Math.max(0, 100 - Math.round(stat.avgAccuracy));
      const neverPracticedBonus = stat.attempts === 0 ? 18 : 0;
      acc[module] = weakness + inactivityDays * 4 + neverPracticedBonus + MODULE_BASE_BONUS[module];
      return acc;
    },
    { listen: 0, speak: 0, read: 0, write: 0 },
  );
}

async function buildNewWordsTask(
  goal: DailyGoal,
  targetDifficulty: Difficulty | undefined,
  modulePriority: number,
  dateKey: string,
): Promise<PlannedCandidate | null> {
  const candidates: PlannedCandidate[] = [];

  for (const book of ALL_WORDBOOKS) {
    if (book.kind !== 'vocabulary') continue;

    const bookContents = await db.contents.where('category').equals(book.id).toArray();
    if (bookContents.length === 0) continue;

    const practicedIds = new Set<string>();
    for (const content of bookContents) {
      const record = await db.records.where('contentId').equals(content.id).first();
      if (record) practicedIds.add(content.id);
    }

    const unpracticedCount = bookContents.length - practicedIds.size;
    if (unpracticedCount <= 0) continue;

    const wordCount = Math.min(unpracticedCount, goal.wordsPerDay);
    candidates.push({
      task: {
        id: nanoid(),
        type: 'new-words',
        title: `Learn ${wordCount} new words`,
        description: `From ${book.nameEn}`,
        module: 'write',
        bookId: book.id,
        limit: wordCount,
        completed: false,
        skipped: false,
      },
      score: modulePriority + difficultyFitScore(targetDifficulty, book.difficulty) + 3 + Math.min(wordCount, 20) / 20,
      weeklyPriorityEligible: isWeeklyBalanceEligible(targetDifficulty, book.difficulty),
    });
  }

  return pickBestCandidate(candidates, dateKey);
}

async function buildArticleTask(
  contents: ContentItem[],
  sessions: TypingSession[],
  targetDifficulty: Difficulty | undefined,
  modulePriority: number,
  dateKey: string,
): Promise<PlannedCandidate | null> {
  const articles = contents.filter((content) => content.type === 'article');
  if (articles.length === 0) return null;

  const candidates = articles.map((article) => {
    const practiceCount = sessions.filter((session) => session.contentId === article.id).length;
    return {
      task: {
        id: nanoid(),
        type: 'article' as const,
        title: 'Practice an article',
        description: article.title,
        module: 'read' as const,
        contentId: article.id,
        completed: false,
        skipped: false,
      },
      score:
        modulePriority +
        difficultyFitScore(targetDifficulty, article.difficulty) +
        Math.max(0, 3 - Math.min(practiceCount, 3)),
      weeklyPriorityEligible: isWeeklyBalanceEligible(targetDifficulty, article.difficulty),
    };
  });

  return pickBestCandidate(candidates, dateKey);
}

async function buildListenTask(
  contents: ContentItem[],
  sessions: TypingSession[],
  targetDifficulty: Difficulty | undefined,
  modulePriority: number,
  dateKey: string,
  excludeContentId?: string,
): Promise<PlannedCandidate | null> {
  const listenable = contents.filter((content) => content.type !== 'word');
  if (listenable.length === 0) return null;

  const filtered = listenable.filter((content) => content.id !== excludeContentId);
  const pool = filtered.length > 0 ? filtered : listenable;

  const candidates = pool.map((content) => {
    const practiceCount = sessions.filter(
      (session) => session.module === 'listen' && session.contentId === content.id,
    ).length;
    return {
      task: {
        id: nanoid(),
        type: 'listen' as const,
        title: content.type === 'article' ? 'Listen to an article' : 'Listen practice',
        description: content.title,
        module: 'listen' as const,
        contentId: content.id,
        completed: false,
        skipped: false,
      },
      score:
        modulePriority +
        difficultyFitScore(targetDifficulty, content.difficulty) +
        Math.max(0, 3 - Math.min(practiceCount, 3)),
      weeklyPriorityEligible: isWeeklyBalanceEligible(targetDifficulty, content.difficulty),
    };
  });

  return pickBestCandidate(candidates, dateKey);
}

async function buildSpeakTask(
  goal: DailyGoal,
  targetDifficulty: Difficulty | undefined,
  modulePriority: number,
  sessions: TypingSession[],
  contentsById: Map<string, ContentItem>,
  dateKey: string,
): Promise<PlannedCandidate | null> {
  const candidates: PlannedCandidate[] = [];

  for (const book of ALL_WORDBOOKS) {
    if (book.kind !== 'scenario') continue;
    const bookContents = await db.contents.where('category').equals(book.id).toArray();
    if (bookContents.length === 0) continue;

    const practicedIds = new Set<string>();
    for (const session of sessions) {
      if (session.module !== 'speak') continue;
      const content = contentsById.get(session.contentId);
      if (content?.category === book.id) practicedIds.add(session.contentId);
    }

    const unpracticedCount = bookContents.length - practicedIds.size;
    const speakLimit = unpracticedCount > 0 ? Math.min(unpracticedCount, goal.sessionsPerDay) : goal.sessionsPerDay;

    candidates.push({
      task: {
        id: nanoid(),
        type: 'speak',
        title: `Practice ${speakLimit} scenarios`,
        description: book.nameEn,
        module: 'speak',
        bookId: book.id,
        limit: speakLimit,
        completed: false,
        skipped: false,
      },
      score:
        modulePriority +
        difficultyFitScore(targetDifficulty, book.difficulty) +
        Math.max(0, 3 - Math.min(practicedIds.size, 3)),
      weeklyPriorityEligible: isWeeklyBalanceEligible(targetDifficulty, book.difficulty),
    });
  }

  return pickBestCandidate(candidates, dateKey);
}

function pickBestCandidate(candidates: PlannedCandidate[], dateKey: string): PlannedCandidate | null {
  if (candidates.length === 0) return null;
  const ranked = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const byKey = getTaskKey(a.task).localeCompare(getTaskKey(b.task));
    if (byKey !== 0) return byKey;
    return MODULE_ORDER.indexOf(a.task.module) - MODULE_ORDER.indexOf(b.task.module);
  });

  const [best] = ranked;
  if (!best) return null;

  // Rotate among similarly strong candidates so the plan changes across days
  // without overriding difficulty fit or weakness weighting.
  const shortlist = ranked.filter((candidate) => best.score - candidate.score <= 1);
  return shortlist[getDateSeed(dateKey) % shortlist.length] ?? best;
}

function pickCandidatesForCoverage(
  rankedCandidates: PlannedCandidate[],
  limit: number,
  existingModules: Set<PlanTask['module']>,
  weeklyMissingModules: Set<PlanTask['module']>,
): PlannedCandidate[] {
  if (limit <= 0 || rankedCandidates.length === 0) return [];

  const selected: PlannedCandidate[] = [];
  const remaining = [...rankedCandidates];
  const coveredModules = new Set(existingModules);
  const missingThisWeek = new Set([...weeklyMissingModules].filter((module) => !coveredModules.has(module)));

  while (selected.length < limit) {
    const weeklyIndex = remaining.findIndex(
      (candidate) => missingThisWeek.has(candidate.task.module) && candidate.weeklyPriorityEligible,
    );
    const unseenIndex = remaining.findIndex((candidate) => !coveredModules.has(candidate.task.module));
    const nextIndex = weeklyIndex >= 0 ? weeklyIndex : unseenIndex >= 0 ? unseenIndex : 0;
    const [next] = remaining.splice(nextIndex, 1);
    if (!next) break;

    selected.push(next);
    coveredModules.add(next.task.module);
    missingThisWeek.delete(next.task.module);
  }

  return selected;
}

function getDateSeed(dateKey: string): number {
  const numeric = Number(dateKey.replaceAll('-', ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function compareTasksForDate(a: PlanTask, b: PlanTask, dateKey: string): number {
  const aHash = hashString(`${dateKey}:${getTaskKey(a)}`);
  const bHash = hashString(`${dateKey}:${getTaskKey(b)}`);
  if (aHash !== bHash) return aHash - bHash;
  return getTaskKey(a).localeCompare(getTaskKey(b));
}

function getTaskKey(task: PlanTask): string {
  return [task.type, task.module, task.bookId ?? '', task.contentId ?? '', task.description].join(':');
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
