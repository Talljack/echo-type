import 'fake-indexeddb/auto';
import {beforeEach, expect, it} from 'vitest';
import {db} from './db';
import {repairYouTubeHistory} from './youtube-timeline-repair';
import type {ImportJob} from '@/types/import-job';
const url='https://www.youtube.com/watch?v=DuLqmyDJPLQ';
const blocks=[{id:'cue-1',title:'Cue 1',text:'Hello.',start:0,end:6,timeStart:1360,timeEnd:3900}];
const job:ImportJob={id:'old',ownerId:'guest',status:'ready',kind:'url',title:'My title',fingerprint:'old',sourceUrl:url,blocks,originalBlocks:blocks,materialIds:['material'],tags:['my-tag'],createdAt:1,updatedAt:1};
const source=async()=>Response.json({timeUnit:'milliseconds',segments:[{text:'Hello.',offset:1360,duration:2540}]});
beforeEach(async()=>{await db.importJobs.clear();await db.contents.clear();});
async function seed(){await db.importJobs.put(job);await db.contents.put({id:'material',title:'My title',text:'Hello.',tags:['my-tag'],type:'article',source:'imported',createdAt:1,updatedAt:1,metadata:{importJobId:'old',sourceUrl:url,timestamps:[{text:'Hello.',offset:1360,duration:2540}]}});}
it('repairs a legacy job and published material atomically with original timing backup',async()=>{
 await seed();expect((await repairYouTubeHistory(db,source)).repaired).toBe(2);
 const updated=await db.importJobs.get('old');
 expect(updated?.blocks[0].timeStart).toBe(1.36);expect(updated?.originalBlocks?.[0].timeEnd).toBe(3.9);
 expect(updated?.timelineBackup?.blocks).toEqual(blocks);expect(updated?.tags).toEqual(['my-tag']);
 const content=await db.contents.get('material');expect(content?.metadata?.timestamps?.[0].offset).toBe(1.36);
 expect(content?.metadata?.timelineBackup?.[0].offset).toBe(1360);
 expect(content?.title).toBe('My title');
 expect(await repairYouTubeHistory(db,source)).toEqual({repaired:0,verified:0,pending:0});
});
it('preserves a correct seconds timeline and never divides it twice',async()=>{
 await seed();await db.contents.delete('material');
 const correct=blocks.map(b=>({...b,timeStart:1.36,timeEnd:3.9}));await db.importJobs.put({...job,blocks:correct,originalBlocks:correct});
 expect((await repairYouTubeHistory(db,source)).verified).toBe(1);
 expect((await db.importJobs.get('old'))?.blocks).toEqual(correct);
});
it('preserves reviewed text and a user offset when repairing',async()=>{
 await db.importJobs.put({...job,subtitleOffset:2,blocks:blocks.map(b=>({...b,text:'Edited hello.',timeStart:1362,timeEnd:3902}))});
 await repairYouTubeHistory(db,source);
 const block=(await db.importJobs.get('old'))?.blocks[0];
 expect(block?.text).toBe('Edited hello.');expect(block?.timeStart).toBeCloseTo(3.36);expect(block?.timeEnd).toBeCloseTo(5.9);
});
it('leaves data intact when the source fails or captions differ',async()=>{
 await seed();expect((await repairYouTubeHistory(db,async()=>new Response('',{status:403}))).pending).toBe(2);
 expect(await db.importJobs.get('old')).toEqual(job);
 expect((await repairYouTubeHistory(db,async()=>Response.json({timeUnit:'milliseconds',segments:[{text:'Changed source',offset:1360,duration:2540}]}))).pending).toBe(2);
 expect(await db.importJobs.get('old')).toEqual(job);
});
it('does not overwrite concurrent edits while awaiting a source',async()=>{
 await seed();await repairYouTubeHistory(db,async()=>{await db.importJobs.update('old',{title:'New title',updatedAt:2});return source();});
 expect((await db.importJobs.get('old'))?.title).toBe('New title');
 expect((await db.importJobs.get('old'))?.blocks[0].timeStart).toBe(1360);
 expect((await db.contents.get('material'))?.metadata?.timestamps?.[0].offset).toBe(1360);
});
it('cancels before writing if the library closes or account changes',async()=>{
 await seed();const controller=new AbortController();
 await repairYouTubeHistory(db,async()=>{controller.abort();return source();},controller.signal);
 expect(await db.importJobs.get('old')).toEqual(job);
 expect((await db.contents.get('material'))?.metadata?.timestamps?.[0].offset).toBe(1360);
});
it('repairs a legacy standalone material without an import job',async()=>{
 await seed();await db.importJobs.clear();await db.contents.update('material',{'metadata.importJobId':undefined});
 expect((await repairYouTubeHistory(db,source)).repaired).toBe(1);
 expect((await db.contents.get('material'))?.metadata?.timestamps?.[0].offset).toBe(1.36);
});
