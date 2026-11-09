import type { ContentMetadata } from '@/types/content';
import type { ImportJob, ImportSourceBlock } from '@/types/import-job';
import type { db } from './db';
import { extractYouTubeVideoId } from './youtube-transcript';

type Cue = NonNullable<ContentMetadata['timestamps']>[number];
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.002;
function scaleOf(saved: Cue[], reference: Cue[]): 1 | 1000 | undefined {
  if (!saved.length || saved.length !== reference.length) return;
  for (const scale of [1, 1000] as const) {
    if (
      saved.every(
        (cue, i) =>
          normalized(cue.text) === normalized(reference[i].text) &&
          close(cue.offset / scale, reference[i].offset) &&
          close(cue.duration / scale, reference[i].duration),
      )
    )
      return scale;
  }
}
const cues = (blocks: ImportSourceBlock[]): Cue[] =>
  blocks.map((b) => ({ text: b.text, offset: b.timeStart!, duration: b.timeEnd! - b.timeStart! }));
function fixJob(job: ImportJob, reference: Cue[]): ImportJob | undefined {
  const original = job.originalBlocks || job.blocks;
  const scale = scaleOf(cues(original), reference);
  if (!scale) return;
  const offset = job.subtitleOffset || 0;
  const originals = new Map(original.map((b) => [b.id, b]));
  // Unknown per-cue edits require manual review. Never infer a unit from magnitude alone.
  if (
    !job.blocks.every((b) => {
      const o = originals.get(b.id);
      return o && close(b.timeStart!, o.timeStart! + offset) && close(b.timeEnd!, o.timeEnd! + offset);
    })
  )
    return;
  const blocks = job.blocks.map((b) => ({
    ...b,
    timeStart: (b.timeStart! - offset) / scale + offset,
    timeEnd: (b.timeEnd! - offset) / scale + offset,
  }));
  return {
    ...job,
    blocks,
    originalBlocks: original.map((b) => ({ ...b, timeStart: b.timeStart! / scale, timeEnd: b.timeEnd! / scale })),
    timelineVersion: 1,
    timelineBackup:
      scale === 1000
        ? { blocks: job.blocks, originalBlocks: job.originalBlocks, subtitleOffset: job.subtitleOffset }
        : job.timelineBackup,
    updatedAt: Date.now(),
  };
}

/** localStorage key holding `{ [itemKey]: lastAttemptEpochMs }` for legacy YouTube timeline verification. */
export const YOUTUBE_REPAIR_ATTEMPTS_KEY = 'echotype:youtube-timeline-repair:attempts';
/** Unless the user presses "Retry", an unverified legacy item is sent to YouTube at most this often. */
export const YOUTUBE_REPAIR_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000;

type AttemptLog = Record<string, number>;

/** `localStorage`, or null during SSR or when the browser blocks storage (even reading the global can throw). */
function attemptStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readAttempts(storage: Storage | null): AttemptLog {
  if (!storage) return {};
  try {
    const parsed: unknown = JSON.parse(storage.getItem(YOUTUBE_REPAIR_ATTEMPTS_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
    );
  } catch {
    return {};
  }
}

/** A timestamp from the future (clock changed) is ignored rather than blocking the item indefinitely. */
const attemptedRecently = (at: number | undefined, now: number) =>
  at !== undefined && at <= now && now - at < YOUTUBE_REPAIR_RETRY_INTERVAL_MS;

function recordAttempt(storage: Storage | null, itemKeys: string[]) {
  if (!storage) return;
  const now = Date.now();
  // Re-read so attempts recorded meanwhile by another tab are kept.
  const log = readAttempts(storage);
  for (const key of itemKeys) log[key] = now;
  // Expired entries are dropped, so repaired or deleted items do not accumulate.
  const live = Object.fromEntries(Object.entries(log).filter(([, at]) => attemptedRecently(at, now)));
  try {
    storage.setItem(YOUTUBE_REPAIR_ATTEMPTS_KEY, JSON.stringify(live));
  } catch {
    /* Quota exceeded or storage disabled: verification is simply not throttled. */
  }
}

export interface RepairYouTubeHistoryOptions {
  /** Ignore the once-per-day throttle, e.g. when the user presses "Retry verification". */
  force?: boolean;
}

/**
 * Fetch outside the transaction; validate all snapshots before atomically changing a video's rows.
 * Each legacy item is attempted at most once per {@link YOUTUBE_REPAIR_RETRY_INTERVAL_MS} unless `force` is set:
 * YouTube often refuses these requests (403), and asking again on every library visit only repeats the failure.
 * `pending` therefore only counts items that were actually attempted in this call.
 */
export async function repairYouTubeHistory(
  database: typeof db,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  { force = false }: RepairYouTubeHistoryOptions = {},
) {
  const jobs = (await database.importJobs.toArray()).filter(
    (j) =>
      !j.timelineVersion && j.blocks.some((b) => b.timeStart !== undefined) && extractYouTubeVideoId(j.sourceUrl || ''),
  );
  const contents = (await database.contents.toArray()).filter(
    (c) =>
      !c.deletedAt &&
      !c.metadata?.timelineVersion &&
      c.metadata?.timestamps?.length &&
      extractYouTubeVideoId(c.metadata.sourceUrl || ''),
  );
  const ids = new Set([
    ...jobs.map((j) => extractYouTubeVideoId(j.sourceUrl!)!),
    ...contents.map((c) => extractYouTubeVideoId(c.metadata!.sourceUrl!)!),
  ]);
  const result = { repaired: 0, verified: 0, pending: 0 };
  const storage = attemptStorage();
  const attempts = readAttempts(storage);
  const startedAt = Date.now();
  for (const id of ids) {
    if (signal?.aborted) break;
    const groupJobs = jobs.filter((j) => extractYouTubeVideoId(j.sourceUrl!) === id);
    const groupContents = contents.filter((c) => extractYouTubeVideoId(c.metadata!.sourceUrl!) === id);
    const count = groupJobs.length + groupContents.length;
    // One request covers every row of a video; it is due as soon as any of those rows is.
    const itemKeys = [...groupJobs.map((j) => `job:${j.id}`), ...groupContents.map((c) => `content:${c.id}`)];
    if (!force && itemKeys.every((key) => attemptedRecently(attempts[key], startedAt))) continue;
    try {
      const response = await fetchImpl('/api/import/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}` }),
        signal: AbortSignal.any([AbortSignal.timeout(35000), ...(signal ? [signal] : [])]),
      });
      if (!response.ok) throw new Error('Source unavailable');
      const payload = await response.json();
      if (payload.timeUnit !== 'milliseconds' || !Array.isArray(payload.segments))
        throw new Error('Unknown timing contract');
      const reference: Cue[] = payload.segments.map((s: Cue) => ({
        ...s,
        offset: s.offset / 1000,
        duration: s.duration / 1000,
      }));
      const outcome = await database.transaction('rw', [database.importJobs, database.contents], async () => {
        const counts = { repaired: 0, verified: 0, pending: 0 };
        if (signal?.aborted) throw new Error('Cancelled');
        for (const j of groupJobs)
          if (JSON.stringify(await database.importJobs.get(j.id)) !== JSON.stringify(j))
            throw new Error('Concurrent edit');
        for (const c of groupContents)
          if (JSON.stringify(await database.contents.get(c.id)) !== JSON.stringify(c))
            throw new Error('Concurrent edit');
        const fixedJobs = new Map<string, ImportJob>();
        for (const job of groupJobs) {
          const fixed = fixJob(job, reference);
          if (!fixed) {
            counts.pending++;
            continue;
          }
          fixedJobs.set(job.id, fixed);
          await database.importJobs.put(fixed);
          counts[fixed.timelineBackup && !job.timelineBackup ? 'repaired' : 'verified']++;
        }
        for (const item of groupContents) {
          const metadata = item.metadata!;
          const old = metadata.timestamps!;
          const oldJob = groupJobs.find((j) => j.id === metadata.importJobId);
          const fixed = oldJob && fixedJobs.get(oldJob.id);
          let next: Cue[] | undefined;
          if (oldJob) {
            if (fixed && scaleOf(old, cues(oldJob.blocks)) === 1) next = cues(fixed.blocks);
          } else {
            const scale = scaleOf(old, reference);
            if (scale) next = old.map((c) => ({ ...c, offset: c.offset / scale, duration: c.duration / scale }));
          }
          if (!next) {
            counts.pending++;
            continue;
          }
          const changed = old.some(
            (c, i) => !close(c.offset, next![i].offset) || !close(c.duration, next![i].duration),
          );
          await database.contents.put({
            ...item,
            metadata: {
              ...metadata,
              timestamps: next,
              timelineVersion: 1,
              ...(changed ? { timelineBackup: old } : {}),
            },
            updatedAt: Date.now(),
          });
          counts[changed ? 'repaired' : 'verified']++;
        }
        return counts;
      });
      result.repaired += outcome.repaired;
      result.verified += outcome.verified;
      result.pending += outcome.pending;
    } catch {
      result.pending += count;
    } finally {
      // A run cancelled by the caller (library closed, account switched) never really tried, so it does not count.
      if (!signal?.aborted) recordAttempt(storage, itemKeys);
    }
  }
  return result;
}
