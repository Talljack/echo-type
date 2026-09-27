import { expect, it } from 'vitest';
import { journalReview, reconcileSavedImportJob, restoreReview, rebaseReview } from './import-review-journal';
import type { ImportJob } from '@/types/import-job';
const source = { id:'a',ownerId:'guest',status:'needsReview',title:'Original',blocks:[],updatedAt:1 } as unknown as ImportJob;
function storage() { const data=new Map<string,string>(); return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}}; }
it('synchronously restores edits before an asynchronous database save can finish',()=>{
 const s=storage();journalReview(s,'guest-db',{...source,title:'Edited',tags:['practice']});
 expect(restoreReview(s,'guest-db',source)).toMatchObject({title:'Edited',tags:['practice']});
 expect(restoreReview(s,'other-db',source).title).toBe('Original');
});
it('never replaces a newer or published database record',()=>{
 const s=storage();journalReview(s,'guest-db',{...source,title:'Edited'});
 expect(restoreReview(s,'guest-db',{...source,updatedAt:2}).title).toBe('Original');
 expect(restoreReview(s,'guest-db',{...source,status:'ready'}).status).toBe('ready');
});
it('keeps an edit made while the previous save is still in flight',()=>{
 const s=storage();journalReview(s,'guest-db',{...source,title:'Newer edit'});
 rebaseReview(s,'guest-db',source,{...source,updatedAt:2});
 expect(restoreReview(s,'guest-db',{...source,title:'Earlier edit',updatedAt:2}).title).toBe('Newer edit');
});
it('does not restore old fields over a newly committed subtitle or AI result',()=>{
 const s=storage();journalReview(s,'guest-db',source);
 const committed={...source,title:'AI result',updatedAt:2};
 rebaseReview(s,'guest-db',source,committed);
 expect(restoreReview(s,'guest-db',committed).title).toBe('AI result');
});
it('applies an AI result after a previous draft save only advanced the revision',()=>{
 const previous={...source,materialType:'scenario',scenario:{situation:'Hotel',role:'Learner',goal:''}} as ImportJob;
 const latest={...previous,updatedAt:2};
 const organized={...previous,updatedAt:3,title:'Hotel booking',scenario:{situation:'Hotel',role:'Guest',goal:'Reserve a room'}};
 expect(reconcileSavedImportJob(latest,previous,organized)).toEqual(organized);
});
it('keeps newer user edits while applying the saved revision',()=>{
 const previous={...source,title:'Old title'};
 const latest={...previous,title:'Newer title',updatedAt:2};
 const saved={...previous,title:'AI title',updatedAt:3};
 expect(reconcileSavedImportJob(latest,previous,saved)).toEqual({...latest,updatedAt:3});
});
