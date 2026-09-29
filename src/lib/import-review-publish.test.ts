import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { db } from './db';
import { createImportJob, publishImportJob } from './import-job-repository';
import type { ImportJob } from '@/types/import-job';

const job: ImportJob = {id:'review-test',ownerId:'guest',fingerprint:'review-test',kind:'document',status:'needsReview',title:'Book',originalText:'Original source',createdAt:1,updatedAt:1,blocks:[{id:'a',title:'First',text:'First chapter',start:0,end:13},{id:'b',title:'Second',text:'Second chapter',start:14,end:28}]};
beforeEach(async () => { await Promise.all([db.importJobs.clear(),db.contents.clear(),db.books.clear(),db.mediaBlobs.clear()]); });
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

it('publishes reviewed audio directly with corrected cues and durable original bytes', async () => {
  const audio: ImportJob = {...job, kind:'media', filename:'voice.wav', mimeType:'audio/wav', materialType:'sentences', requiresAudioStructure:true, originalFile:new Blob(['audio bytes'],{type:'audio/wav'}), blocks:[{id:'cue-1',title:'Cue 1',text:'Corrected sentence.',start:0,end:18,timeStart:1,timeEnd:3}]};
  await db.importJobs.put(audio);
  const ready=await publishImportJob(audio.id);
  await publishImportJob(audio.id);
  const content=await db.contents.get(ready.materialIds![0]);
  expect(content).toMatchObject({text:'Corrected sentence.',metadata:{audioUrl:`idb:${content!.id}`,timestamps:[{text:'Corrected sentence.',offset:1,duration:2}]}});
  expect((await db.mediaBlobs.get(content!.id))?.blob.size).toBe(audio.originalFile!.size);
  expect(await db.mediaBlobs.count()).toBe(1);
  expect((await db.importJobs.get(audio.id))?.originalText).toBe('Original source');
});
it('retains original audio after optional AI organization', async () => {
  await db.importJobs.put({...job,kind:'media',materialType:'scenario',audioStructured:true,originalFile:new Blob(['recording']),scenario:{situation:'At a hotel',role:'Guest',goal:'Book a room'}});
  const ready=await publishImportJob(job.id);
  expect((await db.mediaBlobs.get(ready.materialIds![0]))?.blob.size).toBe(9);
});
it('does not publish an audio course when its original recording is missing', async () => {
  await db.importJobs.put({...job,kind:'media',materialType:'sentences',requiresAudioStructure:true});
  await expect(publishImportJob(job.id)).rejects.toThrow('original media');
  expect(await db.contents.count()).toBe(0);
});
