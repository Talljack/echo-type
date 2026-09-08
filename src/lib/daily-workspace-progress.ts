import { toLocalDateKey } from '@/lib/date-key';
import type { ContentItem, TypingSession } from '@/types/content';

/** Practice evidence, not a mastery score or a count of newly acquired words. */
export function dailyWorkspaceProgress(sessions: TypingSession[], contents: ContentItem[], now = Date.now()) {
  const day = toLocalDateKey(now);
  const completed = sessions.filter(
    (session) => session.completed && toLocalDateKey(session.endTime ?? session.startTime) === day,
  );
  const vocabulary = new Set(contents.filter((content) => content.type === 'word').map((content) => content.id));
  return {
    practices: completed.length,
    words: new Set(completed.filter((session) => vocabulary.has(session.contentId)).map((session) => session.contentId))
      .size,
  };
}
