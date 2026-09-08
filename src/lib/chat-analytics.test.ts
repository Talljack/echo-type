import { afterEach, expect, it, vi } from 'vitest';

const tables = vi.hoisted(() => ({ contents: vi.fn(), sessions: vi.fn(), records: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: Object.fromEntries(Object.entries(tables).map(([key, toArray]) => [key, { toArray }])) }));
import { collectLearningSnapshot } from './chat-analytics';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('derives AI streak from completed sessions, independent of stale legacy plan storage', async () => {
  vi.useFakeTimers();
  const now = new Date(2026, 8, 8, 12).getTime();
  vi.setSystemTime(now);
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'echotype_daily_plan' ? JSON.stringify({ streak: 99 }) : null });
  tables.contents.mockResolvedValue([]);
  tables.records.mockResolvedValue([]);
  tables.sessions.mockResolvedValue([
    { completed: true, startTime: now, module: 'listen' },
    { completed: true, startTime: now - 86400000, module: 'listen' },
    { completed: false, startTime: now - 172800000, module: 'listen' },
  ]);
  expect((await collectLearningSnapshot()).overview.streak).toBe(2);
});
