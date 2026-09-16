import 'fake-indexeddb/auto';
import Dexie, { type Table } from 'dexie';
import { expect, it, vi } from 'vitest';
import { createLearningAttempt } from './learning-activity';
import { persistLearningAttempt } from './learning-activity-persistence';
import type { LearningAttempt } from '@/types/learning-activity';
import type { MediaBlobEntry } from './db';

it('preserves cycle metadata and rejects invalid evidence inside persistence', async () => {
  const database = new Dexie('workshop-cycle-validation') as Dexie & {learningAttempts:Table<LearningAttempt>;mediaBlobs:Table<MediaBlobEntry>};
  database.version(1).stores({learningAttempts:'id',mediaBlobs:'contentId'});
  const cycle = {stage:'recall' as const,referenceAttemptId:'missing',rating:'good' as const};
  const attempt = createLearningAttempt({lessonId:'l',unitId:'u',activity:'writing',sourceText:'source',sourceContentIds:[],answer:'answer',cycle,usedTranslation:true}, 10);
  try {
    expect(attempt.cycle).toEqual(cycle);
    expect(attempt.usedTranslation).toBe(true);
    await expect(persistLearningAttempt(database, attempt, undefined, () => true)).rejects.toThrow('reference');
    expect(await database.learningAttempts.count()).toBe(0);
  } finally {await database.delete();}
});

it('accepts only one concurrent review for the same due schedule', async () => {
  const database = new Dexie('workshop-cycle-concurrent') as Dexie & {learningAttempts:Table<LearningAttempt>;mediaBlobs:Table<MediaBlobEntry>};
  database.version(1).stores({learningAttempts:'id',mediaBlobs:'contentId'});
  const base = {lessonId:'l',unitId:'u',sourceText:'Original source material.',sourceContentIds:[]};
  const understand = createLearningAttempt({...base,activity:'comprehension',answer:'The central meaning.',evidenceQuote:'source material'},1);
  const output = createLearningAttempt({...base,activity:'writing',answer:'My original interpretation.'},2);
  const correction = createLearningAttempt({...base,activity:'writing',answer:'My clearer interpretation.',parentAttemptId:output.id,notes:'Made the main point explicit.'},3);
  const recall = () => createLearningAttempt({...base,activity:'writing',answer:'My recalled interpretation.',cycle:{stage:'recall',referenceAttemptId:correction.id,rating:'good'}},86_400_003);
  try {
    await database.learningAttempts.bulkAdd([understand,output,correction]);
    const results = await Promise.allSettled([persistLearningAttempt(database, recall(), undefined,()=>true),persistLearningAttempt(database, recall(), undefined,()=>true)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await database.learningAttempts.count()).toBe(4);
  } finally {await database.delete();}
});

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
