import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db, switchDatabaseForUser } from './db';
import { publishTextDraft, readImportDraft, writeImportDraft } from './import-draft';
import type { ContentItem } from '@/types/content';

it('publishes text and its completed draft atomically, and retries without duplicates', async () => {
  const draft = await writeImportDraft('text', { text: 'A source.' }, 0, db);
  const item: ContentItem = { id: 'draft-atomic-test', title: 'Source', text: 'A source.', type: 'article', source: 'imported', tags: [], createdAt: 1, updatedAt: 1 };
  await db.contents.delete(item.id);
  const result = await publishTextDraft(item, draft.revision, db);
  expect(result.data.savedItem).toEqual(item);
  const retry = await publishTextDraft({ ...item, id: 'should-not-exist' }, result.revision, db);
  expect(retry.data.savedItem).toEqual(item);
  expect(await db.contents.get('should-not-exist')).toBeUndefined();
  await db.contents.delete(item.id);
});

beforeEach(async () => { if (db.tables.some(t => t.name === 'importDrafts')) await db.table('importDrafts').clear(); });
it('restores the exact source and corrections, including large wordbooks', async () => {
  const data = { text: 'word,meaning\n'.repeat(500000), edited: 'corrected', review: true };
  await writeImportDraft('vocabulary', data, 0, db);
  expect((await readImportDraft('vocabulary', db))?.data).toEqual(data);
});
it('refuses stale concurrent writes without destroying the saved draft', async () => {
  const saved = await writeImportDraft('text', { text: 'first' }, 0, db);
  await expect(writeImportDraft('text', { text: 'stale' }, 0, db)).rejects.toThrow('another window');
  expect((await readImportDraft('text', db))?.revision).toBe(saved.revision);
});
it('isolates drafts across accounts and refuses late writes after a switch', async () => {
  const owner = db;
  await writeImportDraft('text', { text: 'private' }, 0, owner);
  await switchDatabaseForUser('import-draft-test');
  try {
    expect(await readImportDraft('text', db)).toBeUndefined();
    await expect(writeImportDraft('text', {}, 1, owner)).rejects.toThrow('Account changed');
  } finally { await db.delete(); await switchDatabaseForUser(null); }
});
