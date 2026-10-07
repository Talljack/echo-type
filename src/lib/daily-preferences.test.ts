import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db } from './db';
import { saveDailyPreferences } from './daily-preferences';

beforeEach(async () => { await db.dailyTasks.clear(); });

it('preserves existing learning days when changing practice time', async () => {
  await saveDailyPreferences(db, { minutes: 10, learningDays: [1, 3, 5] });
  const original = await db.dailyTasks.get('preferences:daily');
  await saveDailyPreferences(db, { minutes: 30 });
  expect(await db.dailyTasks.get('preferences:daily')).toMatchObject({
    minutes: 30, learningDays: [1, 3, 5], createdAt: original!.createdAt,
  });
  expect(await db.dailyTasks.count()).toBe(1);
});

it('preserves practice time when changing learning days', async () => {
  await saveDailyPreferences(db, { minutes: 45 });
  await saveDailyPreferences(db, { learningDays: [] });
  expect(await db.dailyTasks.get('preferences:daily')).toMatchObject({ minutes: 45, learningDays: [] });
});
