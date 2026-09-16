export interface WorkshopDraftScope {
  databaseName: string;
  lessonId: string;
  activity: string;
  source: string;
  sourceWeakSpotId?: string;
  stage?: string;
}
export interface WorkshopDraftData {
  answer: string;
  quote: string;
  notes: string;
  parent?: string;
  usedTranslation?: boolean;
  usedSource?: boolean;
  context?: string;
  improvement?: string;
}
type DraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface DraftResult {
  draft?: WorkshopDraftData;
  error?: string;
  migrated?: boolean;
}
const dataSchema = z.object({
  answer: z.string(),
  quote: z.string(),
  notes: z.string(),
  parent: z.string().optional(),
  usedTranslation: z.boolean().optional(),
  usedSource: z.boolean().optional(),
  context: z.string().optional(),
  improvement: z.string().optional(),
});
const recordSchema = dataSchema.extend({ version: z.literal(1), source: z.string(), scopeKey: z.string() });

/** A short revision identifier keeps long lessons out of storage keys. Exact source is checked too. */
export function workshopDraftKey(scope: WorkshopDraftScope): string {
  let hash = 2166136261;
  for (let i = 0; i < scope.source.length; i++) hash = Math.imul(hash ^ scope.source.charCodeAt(i), 16777619);
  return `workshop-draft:v1:${JSON.stringify([scope.databaseName, scope.lessonId, scope.activity, scope.sourceWeakSpotId ?? '', scope.stage ?? '', `${scope.source.length}-${hash >>> 0}`])}`;
}

function parseRecord(raw: string, scope: WorkshopDraftScope): WorkshopDraftData {
  const record = recordSchema.parse(JSON.parse(raw));
  if (record.source !== scope.source || record.scopeKey !== workshopDraftKey(scope))
    throw new Error('Draft source does not match');
  return dataSchema.parse(record);
}

/** Never delete the legacy copy: failed migration must leave the original recoverable. */
export function loadWorkshopDraft(
  scope: WorkshopDraftScope,
  storage: DraftStorage,
  session?: DraftStorage,
): DraftResult {
  try {
    const raw = storage.getItem(workshopDraftKey(scope));
    if (raw !== null) return { draft: parseRecord(raw, scope) };
    const legacyStage =
      !scope.stage ||
      (scope.stage === 'understand' && scope.activity === 'comprehension') ||
      (scope.stage === 'output' && scope.activity === 'writing');
    if (!session || !legacyStage) return {};
    const legacy = session.getItem(
      `workshop-draft:${scope.databaseName}:${scope.lessonId}:${scope.activity}:${scope.sourceWeakSpotId ?? ''}`,
    );
    if (legacy === null) return {};
    const parsed = dataSchema.extend({ source: z.string() }).parse(JSON.parse(legacy));
    if (parsed.source !== scope.source) return {};
    const draft = dataSchema.parse(parsed);
    const result = saveWorkshopDraft(scope, draft, storage);
    return { draft, ...(result.error ? result : { migrated: true }) };
  } catch {
    return { error: 'Your draft could not be restored. Existing stored work has been preserved.' };
  }
}

/** Refuse damaged or mismatched records rather than silently replacing recoverable work. */
export function saveWorkshopDraft(
  scope: WorkshopDraftScope,
  draft: WorkshopDraftData,
  storage: DraftStorage,
): { error?: string } {
  try {
    const key = workshopDraftKey(scope);
    const previous = storage.getItem(key);
    if (previous !== null) parseRecord(previous, scope);
    storage.setItem(
      key,
      JSON.stringify({ ...dataSchema.parse(draft), version: 1, source: scope.source, scopeKey: key }),
    );
    return {};
  } catch {
    return {
      error: 'Your draft could not be saved on this device. Keep this page open and copy your work before leaving.',
    };
  }
}

import { z } from 'zod';
