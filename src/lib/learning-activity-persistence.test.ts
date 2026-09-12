import 'fake-indexeddb/auto';
import Dexie, { type Table } from 'dexie';
import { expect, it, vi } from 'vitest';
import { createLearningAttempt } from './learning-activity';
import { persistLearningAttempt } from './learning-activity-persistence';
import type { LearningAttempt } from '@/types/learning-activity';
import type { MediaBlobEntry } from './db';

it('aborts an audio submission if the active account changes while hashing', async () => {
  const database = new Dexie('workshop-account-boundary') as Dexie & {learningAttempts:Table<LearningAttempt>;mediaBlobs:Table<MediaBlobEntry>};
  database.version(1).stores({learningAttempts:'id',mediaBlobs:'contentId'});
  let current = true;
  const blob = new Blob(['audio']);
  const buffer = await blob.arrayBuffer();
  vi.spyOn(blob,'arrayBuffer').mockImplementation(async () => {current=false;return buffer;});
  const attempt = createLearningAttempt({lessonId:'l',unitId:'u',activity:'retelling',sourceText:'private source',sourceContentIds:['s'],answer:'private answer'});
  try {
    await expect(persistLearningAttempt(database, attempt, blob, ()=>current)).rejects.toThrow('Account changed');
    expect(await database.learningAttempts.count()).toBe(0);
    expect(await database.mediaBlobs.count()).toBe(0);
  } finally {await database.delete();}
});

it('rolls back both media and response if the account becomes inactive inside the transaction', async () => {
  const database = new Dexie('workshop-account-rollback') as Dexie & {learningAttempts:Table<LearningAttempt>;mediaBlobs:Table<MediaBlobEntry>};
  database.version(1).stores({learningAttempts:'id',mediaBlobs:'contentId'});
  let checks = 0;
  const attempt = createLearningAttempt({lessonId:'l',unitId:'u',activity:'retelling',sourceText:'private source',sourceContentIds:['s'],answer:'private answer'});
  try {
    await expect(persistLearningAttempt(database,attempt,new Blob(['audio']),()=>++checks < 5)).rejects.toThrow('Account changed');
    expect(await database.learningAttempts.count()).toBe(0);
    expect(await database.mediaBlobs.count()).toBe(0);
  } finally {await database.delete();}
});
