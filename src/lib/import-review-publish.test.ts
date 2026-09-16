import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db } from './db';
import { createImportJob, publishImportJob } from './import-job-repository';
import type { ImportJob } from '@/types/import-job';

const job: ImportJob = {id:'review-test',ownerId:'guest',fingerprint:'review-test',kind:'document',status:'needsReview',title:'Book',originalText:'Original source',createdAt:1,updatedAt:1,blocks:[{id:'a',title:'First',text:'First chapter',start:0,end:13},{id:'b',title:'Second',text:'Second chapter',start:14,end:28}]};
beforeEach(async () => { await Promise.all([db.importJobs.clear(),db.contents.clear(),db.books.clear()]); });
it('classifies a CSV before parsing so failed jobs retain vocabulary recovery', async () => {
  const source = await createImportJob({file:new File(['word,meaning\nhello,'],'draft.csv'),ownerId:'guest'});
  expect(source.materialType).toBe('wordbook');
});
it('publishes only selected chapters, preserves source and keeps an idempotent book', async () => {
  await db.importJobs.put({...job,excludedBlockIds:['a'],tagsText:'work, release,'});
  await publishImportJob(job.id);
  await publishImportJob(job.id);
  expect(await db.contents.count()).toBe(1);
  expect((await db.contents.toArray())[0].tags).toEqual(['imported','work','release']);
  expect((await db.books.toArray())[0].chapterCount).toBe(1);
  expect((await db.importJobs.get(job.id))?.originalText).toBe('Original source');
  expect((await db.importJobs.get(job.id))?.blocks).toHaveLength(2);
});
it('rejects an empty selection without writing materials', async () => {
  await db.importJobs.put({...job,excludedBlockIds:['a','b']});
  await expect(publishImportJob(job.id)).rejects.toThrow('Review');
  expect(await db.contents.count()).toBe(0);
});
it('publishes batch vocabulary with correct book statistics', async () => {
  await db.importJobs.put({...job,materialType:'wordbook',blocks:[{id:'csv',title:'Words',start:0,end:50,text:'word,meaning\nhello,greeting\nhelpful,useful'}]});
  await publishImportJob(job.id);
  expect((await db.books.toArray())[0]).toMatchObject({chapterCount:1,totalWords:2});
  expect(await db.contents.count()).toBe(2);
});
