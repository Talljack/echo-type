import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import type { DailyTask } from '@/types/daily-task';

export const DEFAULT_LEARNING_DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function saveDailyPreferences(
  database: typeof db,
  patch: Pick<Partial<DailyTask>, 'minutes' | 'learningDays'>,
) {
  await database.transaction('rw', database.dailyTasks, async () => {
    const current = await database.dailyTasks.get('preferences:daily');
    if (database !== db) throw new Error('Account changed. Try again.');
    const now = Date.now();
    const dateKey = toLocalDateKey(now);
    await database.dailyTasks.put({
      id: 'preferences:daily',
      kind: 'settings',
      sourceId: 'daily',
      dateKey,
      originDateKey: dateKey,
      title: 'Daily preferences',
      titleZh: '每日偏好',
      reason: '',
      reasonZh: '',
      href: '/dashboard',
      minutes: 20,
      status: 'pending',
      createdAt: now,
      learningDays: DEFAULT_LEARNING_DAYS,
      ...current,
      ...patch,
      updatedAt: now,
    });
  });
}
