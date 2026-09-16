import type { ContentItem } from '@/types/content';
import { db } from './db';

export interface ImportDraft {
  id: string;
  data: Record<string, unknown>;
  revision: number;
}

export async function readImportDraft(id: string, owner = db) {
  return owner.importDrafts.get(id);
}

export async function writeImportDraft(id: string, data: Record<string, unknown>, revision: number, owner = db) {
  if (owner !== db) throw new Error('Account changed. Reopen imports.');
  return owner.transaction('rw', owner.importDrafts, async () => {
    if (owner !== db) throw new Error('Account changed. Reopen imports.');
    const previous = await owner.importDrafts.get(id);
    if ((previous?.revision ?? 0) !== revision)
      throw new Error('Draft changed in another window. Reload to recover it.');
    const next = { id, data, revision: revision + 1 };
    await owner.importDrafts.put(next);
    return next;
  });
}

export async function publishTextDraft(item: ContentItem, revision: number, owner = db): Promise<ImportDraft> {
  if (owner !== db) throw new Error('Account changed. Reopen imports.');
  return owner.transaction('rw', owner.importDrafts, owner.contents, async () => {
    if (owner !== db) throw new Error('Account changed. Reopen imports.');
    const draft = await owner.importDrafts.get('text');
    if (!draft || draft.revision !== revision)
      throw new Error('Draft changed in another window. Reload to recover it.');
    if (draft.data.savedItem) return draft;
    if (typeof draft.data.text !== 'string' || draft.data.text.trim() !== item.text || !item.text.trim())
      throw new Error('Review the latest text before saving.');
    await owner.contents.add(item);
    const next = { ...draft, revision: revision + 1, data: { ...draft.data, savedItem: item } };
    await owner.importDrafts.put(next);
    return next;
  });
}
