import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportJob } from '@/types/import-job';
import { db } from './db';
import {
  repairYouTubeHistory,
  YOUTUBE_REPAIR_ATTEMPTS_KEY,
  YOUTUBE_REPAIR_RETRY_INTERVAL_MS,
} from './youtube-timeline-repair';

const url = 'https://www.youtube.com/watch?v=DuLqmyDJPLQ';
const blocks = [{ id: 'cue-1', title: 'Cue 1', text: 'Hello.', start: 0, end: 6, timeStart: 1360, timeEnd: 3900 }];
const job: ImportJob = {
  id: 'old',
  ownerId: 'guest',
  status: 'ready',
  kind: 'url',
  title: 'My title',
  fingerprint: 'old',
  sourceUrl: url,
  blocks,
  originalBlocks: blocks,
  materialIds: ['material'],
  tags: [],
  createdAt: 1,
  updatedAt: 1,
};
const START = new Date('2026-11-09T08:00:00Z').getTime();

/** Node has no Web Storage, so the browser's localStorage is replaced by an in-memory one. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const refused = () => vi.fn<typeof fetch>(async () => new Response('', { status: 403 }));
const attemptLog = () => JSON.parse(localStorage.getItem(YOUTUBE_REPAIR_ATTEMPTS_KEY) || '{}');

async function seed() {
  await db.importJobs.put(job);
  await db.contents.put({
    id: 'material',
    title: 'My title',
    text: 'Hello.',
    tags: [],
    type: 'article',
    source: 'imported',
    createdAt: 1,
    updatedAt: 1,
    metadata: { importJobId: 'old', sourceUrl: url, timestamps: [{ text: 'Hello.', offset: 1360, duration: 2540 }] },
  });
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
  vi.stubGlobal('localStorage', memoryStorage());
  await db.importJobs.clear();
  await db.contents.clear();
  await seed();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('legacy YouTube verification throttle', () => {
  it('attempts a failing video once and skips it on later visits within 24 hours', async () => {
    const fetchImpl = refused();
    expect(await repairYouTubeHistory(db, fetchImpl)).toEqual({ repaired: 0, verified: 0, pending: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(attemptLog()).toEqual({ 'job:old': START, 'content:material': START });

    vi.setSystemTime(START + YOUTUBE_REPAIR_RETRY_INTERVAL_MS - 1);
    // Nothing was attempted on this visit, so there is no failure to report.
    expect(await repairYouTubeHistory(db, fetchImpl)).toEqual({ repaired: 0, verified: 0, pending: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('attempts again once 24 hours have passed', async () => {
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);

    const nextDay = START + YOUTUBE_REPAIR_RETRY_INTERVAL_MS;
    vi.setSystemTime(nextDay);
    expect((await repairYouTubeHistory(db, fetchImpl)).pending).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(attemptLog()).toEqual({ 'job:old': nextDay, 'content:material': nextDay });
  });

  it('lets an explicit retry bypass the throttle', async () => {
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);

    vi.setSystemTime(START + 60_000);
    expect((await repairYouTubeHistory(db, fetchImpl, undefined, { force: true })).pending).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(attemptLog()['job:old']).toBe(START + 60_000);
  });

  it('repairs on a forced retry once the source is reachable again', async () => {
    await repairYouTubeHistory(db, refused());
    const source = vi.fn<typeof fetch>(async () =>
      Response.json({ timeUnit: 'milliseconds', segments: [{ text: 'Hello.', offset: 1360, duration: 2540 }] }),
    );
    expect((await repairYouTubeHistory(db, source, undefined, { force: true })).repaired).toBe(2);
    expect((await db.importJobs.get('old'))?.timelineVersion).toBe(1);
  });

  it('does not record an attempt that the caller cancelled', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      controller.abort();
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    await repairYouTubeHistory(db, fetchImpl, controller.signal);
    expect(localStorage.getItem(YOUTUBE_REPAIR_ATTEMPTS_KEY)).toBeNull();

    const next = refused();
    await repairYouTubeHistory(db, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('records an attempt that timed out on its own', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });
    expect((await repairYouTubeHistory(db, fetchImpl)).pending).toBe(2);
    expect(attemptLog()).toEqual({ 'job:old': START, 'content:material': START });
  });

  it('still verifies a video when one of its items has not been attempted yet', async () => {
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);
    await db.contents.put({
      id: 'material-2',
      title: 'Copy',
      text: 'Hello.',
      tags: [],
      type: 'article',
      source: 'imported',
      createdAt: 2,
      updatedAt: 2,
      metadata: { sourceUrl: url, timestamps: [{ text: 'Hello.', offset: 1360, duration: 2540 }] },
    });

    expect((await repairYouTubeHistory(db, fetchImpl)).pending).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throttles each video independently', async () => {
    const otherUrl = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);
    await db.importJobs.put({ ...job, id: 'other', fingerprint: 'other', sourceUrl: otherUrl, materialIds: [] });

    expect((await repairYouTubeHistory(db, fetchImpl)).pending).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body)).url).toBe(otherUrl);
  });

  it('drops expired entries and ignores timestamps from the future', async () => {
    localStorage.setItem(
      YOUTUBE_REPAIR_ATTEMPTS_KEY,
      JSON.stringify({
        'job:deleted-long-ago': START - YOUTUBE_REPAIR_RETRY_INTERVAL_MS - 1,
        'job:old': START + 5 * YOUTUBE_REPAIR_RETRY_INTERVAL_MS,
        'content:material': START + 5 * YOUTUBE_REPAIR_RETRY_INTERVAL_MS,
      }),
    );
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(attemptLog()).toEqual({ 'job:old': START, 'content:material': START });
  });

  it('treats corrupt stored data as no attempts', async () => {
    localStorage.setItem(YOUTUBE_REPAIR_ATTEMPTS_KEY, '{not json');
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(attemptLog()).toEqual({ 'job:old': START, 'content:material': START });
  });

  it('falls back to attempting every time when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined);
    const fetchImpl = refused();
    await repairYouTubeHistory(db, fetchImpl);
    await repairYouTubeHistory(db, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('survives storage that throws when accessed or written', async () => {
    vi.stubGlobal('localStorage', {
      ...memoryStorage(),
      getItem: () => {
        throw new DOMException('Access denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    });
    const fetchImpl = refused();
    expect((await repairYouTubeHistory(db, fetchImpl)).pending).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
