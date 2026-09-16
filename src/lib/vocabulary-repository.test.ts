import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db, switchDatabaseForUser } from './db';
import { importVocabulary, saveVocabularySubmission } from './vocabulary-repository';
import { vocabularyRecordId } from './vocabulary';
beforeEach(async()=>{ await Promise.all([db.contents.clear(),db.books.clear(),db.importJobs.clear(),db.records.clear(),db.sessions.clear(),db.learningAttempts.clear(),db.dailyTasks.clear()]); });
it('preserves legacy fingerprints when importing a book again', async () => {
  const original = 'word,meaning\nhelpful,有帮助的';
  const id = await importVocabulary('Legacy', original);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['Legacy', original])));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  await db.importJobs.update(id, {fingerprint});
  expect(await importVocabulary('Legacy', original)).toBe(id);
  expect(await db.contents.count()).toBe(1);
});
it('keeps self-rated Again session counts consistent with its zero accuracy',async()=>{
  await importVocabulary('Words','word,meaning\nhelpful,有帮助的');const word=(await db.contents.toArray())[0];
  await saveVocabularySubmission({id:'honest-again',contentId:word.id,mode:'meaning',answer:'I guessed a meaning incorrectly',revealed:true,rating:1});
  expect((await db.sessions.get('honest-again'))?.correctChars).toBe(0);
});
it('enforces the shared daily new limit across concurrent cards',async()=>{
  await importVocabulary('Words','word,meaning\nhelpful,有帮助的\ntransport,运输');
  const words=await db.contents.toArray();
  await db.dailyTasks.put({id:'preferences:vocabulary',kind:'settings',sourceId:'vocabulary',dateKey:'',originDateKey:'',title:'',titleZh:'',reason:'',reasonZh:'',href:'',minutes:0,status:'pending',createdAt:1,updatedAt:1,newWordsPerDay:1});
  const results=await Promise.allSettled(words.map((w,i)=>saveVocabularySubmission({id:`new-${i}`,contentId:w.id,mode:'meaning',answer:'my recall',revealed:true,rating:3})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
});
it('caps an explicit unknown answer and prevents early rescheduling',async()=>{
  await importVocabulary('Words','word,meaning\nhelpful,有帮助的'); const word=(await db.contents.toArray())[0];
  const submission={id:'unknown',contentId:word.id,mode:'meaning' as const,answer:'[not recalled]',revealed:true,rating:4};
  await saveVocabularySubmission(submission);
  const record=await db.records.get(vocabularyRecordId(word.id,'meaning'));
  expect(record?.accuracy).toBe(0);
  expect((await db.sessions.get('unknown'))?.correctChars).toBe(0);
  await expect(saveVocabularySubmission({...submission,id:'early',answer:'useful',expectedReview:record?.lastPracticed})).rejects.toThrow('not due');
});
it('does not reuse globally unique cloud IDs across accounts importing the same file',async()=>{
  const original='word,meaning\nhelpful,有帮助的';
  const first=await importVocabulary('Same book',original);
  await switchDatabaseForUser('vocabulary-account-test');
  try {await db.delete();await db.open();expect(await importVocabulary('Same book',original)).not.toBe(first);}
  finally {await db.delete();await switchDatabaseForUser(null);}
});
it('imports atomically, archives exact originals and makes repeated import idempotent',async()=>{
  const original='word,meaning,example\nhelpful,有帮助的,A helpful reply.';
  const id=await importVocabulary('My words',original,'words.csv');
  expect(await importVocabulary('My words',original,'words.csv')).toBe(id);
  expect(await db.contents.count()).toBe(1);
  expect((await db.importJobs.toArray())[0].originalText).toBe(original);
  expect((await db.contents.toArray())[0].metadata?.vocabulary?.meaning).toBe('有帮助的');
});
it('rejects invalid imports without writing partial books',async()=>{
  await expect(importVocabulary('Bad','word,meaning\nhello,')).rejects.toThrow(); expect(await db.books.count()).toBe(0);
});
it('stores reviewed vocabulary without replacing the uploaded original', async () => {
  const original = 'word,meaning\nhello,你好';
  await importVocabulary('Corrected', 'word,meaning\nhello,问候', 'words.csv', db, original);
  expect((await db.importJobs.toArray())[0].originalText).toBe(original);
  expect((await db.contents.toArray())[0].metadata?.vocabulary?.meaning).toBe('问候');
});
it('does not award recall for merely revealing, caps wrong spelling and preserves evidence',async()=>{
  await importVocabulary('Words','word,meaning\nhelpful,有帮助的'); const content=(await db.contents.toArray())[0];
  const base={id:'attempt-1',contentId:content.id,mode:'spelling' as const,answer:'helpfull',revealed:true,rating:4};
  await expect(saveVocabularySubmission({...base,answer:''})).rejects.toThrow();
  await saveVocabularySubmission(base);
  const record=await db.records.get(vocabularyRecordId(content.id,'spelling'));
  expect(record?.accuracy).toBe(0); expect(record?.attempts).toBe(1);
  expect((await db.learningAttempts.get('attempt-1'))?.answer).toBe('helpfull');
  await saveVocabularySubmission(base); expect((await db.records.get(record!.id))?.attempts).toBe(1);
});
it('rejects stale parallel review and deleted source without advancing the card',async()=>{
  await importVocabulary('Words','word,meaning\nhelpful,有帮助的'); const content=(await db.contents.toArray())[0];
  const base={contentId:content.id,mode:'meaning' as const,answer:'useful',revealed:true,rating:3};
  const outcomes=await Promise.allSettled([saveVocabularySubmission({...base,id:'a'}),saveVocabularySubmission({...base,id:'b'})]);
  expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);
  await db.contents.update(content.id,{deletedAt:Date.now()});
  await expect(saveVocabularySubmission({...base,id:'c'})).rejects.toThrow();
});
