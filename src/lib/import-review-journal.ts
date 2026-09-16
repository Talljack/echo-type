import type { ImportJob } from '@/types/import-job';

type JournalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const fields = [
  'title',
  'tags',
  'tagsText',
  'difficulty',
  'materialType',
  'scenario',
  'blocks',
  'excludedBlockIds',
  'subtitleOffset',
] as const;
function key(scope: string, id: string) {
  return `echo-import-review:${scope}:${id}`;
}

/** Tab-local synchronous recovery copy. Never includes source binaries or credentials. */
export function journalReview(storage: JournalStorage, scope: string, job: ImportJob) {
  if (job.status !== 'needsReview') return;
  const edits = Object.fromEntries(fields.map((field) => [field, job[field]]));
  storage.setItem(key(scope, job.id), JSON.stringify({ version: 1, revision: job.updatedAt, edits }));
}

/** Advance only this tab's pending copy when its own database write commits. */
export function rebaseReview(storage: JournalStorage, scope: string, previous: ImportJob, next: ImportJob) {
  const k = key(scope, previous.id);
  const raw = storage.getItem(k);
  if (!raw) return;
  const saved = JSON.parse(raw);
  if (saved.version === 1 && saved.revision === previous.updatedAt) {
    const unchanged = fields.every((field) => JSON.stringify(saved.edits[field]) === JSON.stringify(previous[field]));
    if (unchanged) journalReview(storage, scope, next);
    else storage.setItem(k, JSON.stringify({ ...saved, revision: next.updatedAt }));
  }
}

export function restoreReview(storage: JournalStorage, scope: string, job: ImportJob): ImportJob {
  const id = key(scope, job.id);
  const raw = storage.getItem(id);
  if (!raw) return job;
  try {
    const saved = JSON.parse(raw);
    if (job.status !== 'needsReview' || saved.version !== 1 || saved.revision !== job.updatedAt) {
      storage.removeItem(id);
      return job;
    }
    // Copy editable fields only; never restore lifecycle, owner, IDs or source bytes.
    return { ...job, ...Object.fromEntries(fields.filter((f) => f in saved.edits).map((f) => [f, saved.edits[f]])) };
  } catch {
    storage.removeItem(id);
    return job;
  }
}
