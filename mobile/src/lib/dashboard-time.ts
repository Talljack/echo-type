/** Local start of calendar day (00:00:00.000). */
export function startOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local end of calendar day (23:59:59.999). */
export function endOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Monday 00:00:00 of the week containing `date` (local). */
export function startOfLocalWeekMonday(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.getTime();
}

/** Sunday 23:59:59.999 of the week containing `date` (Mon–Sun week). */
export function endOfLocalWeekSunday(date: Date): number {
  const start = startOfLocalWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function formatSessionDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export function formatTimeAgo(completedAt: number, nowMs: number = Date.now()): string {
  const diffSec = Math.floor((nowMs - completedAt) / 1000);
  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;

  const then = new Date(completedAt);
  const now = new Date(nowMs);
  const startThen = startOfLocalDay(then);
  const startNow = startOfLocalDay(now);
  const dayDiff = Math.round((startNow - startThen) / (24 * 60 * 60 * 1000));
  if (dayDiff === 1) return 'Yesterday';

  const sameYear = then.getFullYear() === now.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return then.toLocaleDateString(undefined, opts);
}

export interface ReviewForecastCounts {
  today: number;
  tomorrow: number;
  thisWeek: number;
}

/**
 * Counts items with FSRS due timestamps in: today (incl. overdue), tomorrow only,
 * remainder of Mon–Sun week after tomorrow.
 */
export function computeReviewForecastCounts(dueTimestamps: number[], now: Date = new Date()): ReviewForecastCounts {
  const endToday = endOfLocalDay(now);
  const startTomorrow = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const endTomorrow = endOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const endWeek = endOfLocalWeekSunday(now);

  let today = 0;
  let tomorrow = 0;
  let thisWeek = 0;

  for (const due of dueTimestamps) {
    if (due <= endToday) {
      today += 1;
      continue;
    }
    if (due >= startTomorrow && due <= endTomorrow) {
      tomorrow += 1;
      continue;
    }
    if (due > endTomorrow && due <= endWeek) {
      thisWeek += 1;
    }
  }

  return { today, tomorrow, thisWeek };
}
