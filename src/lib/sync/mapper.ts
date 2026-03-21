import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

// ─── Content ────────────────────────────────────────────────────────────────────

export function toSupabaseContent(item: ContentItem, userId: string): Record<string, unknown> {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    text: item.text,
    type: item.type,
    category: item.category ?? null,
    tags: item.tags,
    source: item.source,
    difficulty: item.difficulty ?? null,
    metadata: item.metadata ?? null,
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

export function fromSupabaseContent(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    title: row.title as string,
    text: row.text as string,
    type: row.type as ContentItem['type'],
    category: (row.category as string) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    source: row.source as ContentItem['source'],
    difficulty: (row.difficulty as ContentItem['difficulty']) ?? undefined,
    metadata: (row.metadata as ContentItem['metadata']) ?? undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

// ─── Learning Record ────────────────────────────────────────────────────────────

export function toSupabaseRecord(record: LearningRecord, userId: string): Record<string, unknown> {
  return {
    id: record.id,
    user_id: userId,
    content_id: record.contentId,
    module: record.module,
    attempts: record.attempts,
    correct_count: record.correctCount,
    accuracy: record.accuracy,
    wpm: record.wpm ?? null,
    last_practiced: new Date(record.lastPracticed).toISOString(),
    next_review: record.nextReview != null ? new Date(record.nextReview).toISOString() : null,
    fsrs_card: record.fsrsCard ?? null,
    mistakes: record.mistakes ?? [],
    updated_at: new Date(record.lastPracticed).toISOString(),
  };
}

export function fromSupabaseRecord(row: Record<string, unknown>): LearningRecord {
  return {
    id: row.id as string,
    contentId: row.content_id as string,
    module: row.module as LearningRecord['module'],
    attempts: (row.attempts as number) ?? 0,
    correctCount: (row.correct_count as number) ?? 0,
    accuracy: (row.accuracy as number) ?? 0,
    wpm: (row.wpm as number) ?? undefined,
    lastPracticed: new Date(row.last_practiced as string).getTime(),
    nextReview: row.next_review != null ? new Date(row.next_review as string).getTime() : undefined,
    fsrsCard: (row.fsrs_card as LearningRecord['fsrsCard']) ?? undefined,
    mistakes: (row.mistakes as LearningRecord['mistakes']) ?? [],
  };
}

// ─── Typing Session ─────────────────────────────────────────────────────────────

export function toSupabaseSession(session: TypingSession, userId: string): Record<string, unknown> {
  return {
    id: session.id,
    user_id: userId,
    content_id: session.contentId,
    module: session.module,
    start_time: new Date(session.startTime).toISOString(),
    end_time: session.endTime != null ? new Date(session.endTime).toISOString() : null,
    total_chars: session.totalChars,
    correct_chars: session.correctChars,
    wrong_chars: session.wrongChars,
    total_words: session.totalWords,
    wpm: session.wpm,
    accuracy: session.accuracy,
    completed: session.completed,
    updated_at: new Date(session.startTime).toISOString(),
  };
}

export function fromSupabaseSession(row: Record<string, unknown>): TypingSession {
  return {
    id: row.id as string,
    contentId: row.content_id as string,
    module: row.module as TypingSession['module'],
    startTime: new Date(row.start_time as string).getTime(),
    endTime: row.end_time != null ? new Date(row.end_time as string).getTime() : undefined,
    totalChars: (row.total_chars as number) ?? 0,
    correctChars: (row.correct_chars as number) ?? 0,
    wrongChars: (row.wrong_chars as number) ?? 0,
    totalWords: (row.total_words as number) ?? 0,
    wpm: (row.wpm as number) ?? 0,
    accuracy: (row.accuracy as number) ?? 0,
    completed: (row.completed as boolean) ?? false,
  };
}
