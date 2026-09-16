import { expect, it } from 'vitest';
import { journalReview, restoreReview, rebaseReview } from './import-review-journal';
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
