import { describe, expect, it } from 'vitest';
import { loadWorkshopDraft, saveWorkshopDraft, workshopDraftKey } from './workshop-draft';

class MemoryStorage {
  entries = new Map<string, string>();
  getItem(key: string) { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string) { this.entries.set(key, value); }
}
const scope = { databaseName: 'EchoType-user-a', lessonId: 'lesson', activity: 'writing', source: 'Original source', stage: 'correct' };
const draft = { answer: 'My original answer', quote: 'Original', notes: 'Check tense', parent: 'attempt-1', usedTranslation: true, usedSource: true, context: 'At work', improvement: 'Past tense' };

describe('durable workshop drafts', () => {
  it('recovers every text and assistance field from durable storage after reopening', () => {
    const durable = new MemoryStorage();
    expect(saveWorkshopDraft(scope, draft, durable)).toEqual({});
    expect(loadWorkshopDraft(scope, durable).draft).toEqual(draft);
  });
  it('isolates accounts, activities, stages, source revisions and weak spot tasks', () => {
    const durable = new MemoryStorage();
    saveWorkshopDraft(scope, draft, durable);
    for (const change of [{ databaseName: 'EchoType-user-b' }, { activity: 'comprehension' }, { stage: 'recall' }, { source: 'Changed source' }, { sourceWeakSpotId: 'weak-1' }]) {
      const other = { ...scope, ...change };
      expect(loadWorkshopDraft(other, durable).draft).toBeUndefined();
      saveWorkshopDraft(other, { ...draft, answer: 'Other answer' }, durable);
    }
    expect(loadWorkshopDraft(scope, durable).draft).toEqual(draft);
  });
  it('migrates matching session drafts without deleting the recoverable original', () => {
    const durable = new MemoryStorage();
    const session = new MemoryStorage();
    const legacyKey = `workshop-draft:${scope.databaseName}:${scope.lessonId}:${scope.activity}:`;
    session.setItem(legacyKey, JSON.stringify({ source: scope.source, ...draft }));
    expect(loadWorkshopDraft({ ...scope, stage: undefined }, durable, session)).toMatchObject({ draft, migrated: true });
    expect(session.getItem(legacyKey)).not.toBeNull();
    expect(loadWorkshopDraft({ ...scope, stage: undefined }, durable).draft).toEqual(draft);
  });
  it('keeps a mismatched legacy source intact and never loads it into a new revision', () => {
    const durable = new MemoryStorage();
    const session = new MemoryStorage();
    session.setItem(`workshop-draft:${scope.databaseName}:${scope.lessonId}:${scope.activity}:`, JSON.stringify({ source: 'Older source', ...draft }));
    expect(loadWorkshopDraft(scope, durable, session).draft).toBeUndefined();
    expect(session.entries.size).toBe(1);
  });
  it('does not overwrite malformed or source-mismatched durable records', () => {
    for (const raw of ['{bad json', 'null', JSON.stringify({ version: 1, source: 'Wrong source', ...draft })]) {
      const durable = new MemoryStorage();
      durable.setItem(workshopDraftKey(scope), raw);
      expect(loadWorkshopDraft(scope, durable).error).toBeTruthy();
      expect(saveWorkshopDraft(scope, draft, durable).error).toBeTruthy();
      expect(durable.getItem(workshopDraftKey(scope))).toBe(raw);
    }
  });
  it('surfaces denied reads and quota errors, keeping migrated text available', () => {
    const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } };
    expect(loadWorkshopDraft(scope, denied).error).toBeTruthy();
    expect(saveWorkshopDraft(scope, draft, denied).error).toBeTruthy();
    const session = new MemoryStorage();
    session.setItem(`workshop-draft:${scope.databaseName}:${scope.lessonId}:${scope.activity}:`, JSON.stringify({ source: scope.source, ...draft }));
    const full = { getItem() { return null; }, setItem() { throw new Error('Quota'); } };
    expect(loadWorkshopDraft({ ...scope, stage: undefined }, full, session)).toMatchObject({ draft, error: expect.any(String) });
  });
  it('rejects invalid JSON field types without losing the original', () => {
    const durable = new MemoryStorage();
    saveWorkshopDraft(scope, draft, durable);
    const key = workshopDraftKey(scope);
    const invalid = JSON.stringify({ ...JSON.parse(durable.getItem(key)!), answer: 42 });
    durable.setItem(key, invalid);
    expect(loadWorkshopDraft(scope, durable).error).toBeTruthy();
    expect(saveWorkshopDraft(scope, draft, durable).error).toBeTruthy();
    expect(durable.getItem(key)).toBe(invalid);
  });
});
