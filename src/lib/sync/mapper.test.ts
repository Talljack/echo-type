import { expect, it } from 'vitest';
import { fromSupabaseContent, toSupabaseContent, toSupabaseFavoriteFolder, toSupabaseRecord, toSupabaseSession } from './mapper';
it('uses modification times for sessions, review schedules and folder edits', () => {
  expect(toSupabaseSession({ id: 's', startTime: 1000, endTime: 3000, updatedAt: 4000 } as never, 'u').updated_at).toBe(new Date(4000).toISOString());
  expect(toSupabaseRecord({ lastPracticed: 1000, updatedAt: 4000 } as never, 'u').updated_at).toBe(new Date(4000).toISOString());
  expect(toSupabaseFavoriteFolder({ createdAt: 1000, updatedAt: 4000 } as never, 'u').updated_at).toBe(new Date(4000).toISOString());
});
it('round trips content tombstones', () => {
  const row = toSupabaseContent({ id: 'c', createdAt: 1000, updatedAt: 3000, deletedAt: 3000 } as never, 'u');
  expect(row.deleted_at).toBe(new Date(3000).toISOString());
  expect(fromSupabaseContent(row).deletedAt).toBe(3000);
});
