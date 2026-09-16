import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {db} from './db';
import {scheduleImportedMaterial} from './import-schedule';
it('adds the first imported lesson once to today without marking it completed',async()=>{
 await db.contents.put({id:'schedule-import',title:'Practice',text:'An English article.',type:'article',source:'imported',tags:[],createdAt:1,updatedAt:1});
 const first=await scheduleImportedMaterial(['schedule-import']);
 expect(first?.status).toBe('pending');expect(first?.stage).toBe('understand');
 expect((await scheduleImportedMaterial(['schedule-import']))?.id).toBe(first?.id);
});
it('schedules a wordbook using vocabulary evidence rather than text comprehension',async()=>{
 await db.contents.put({id:'schedule-word',title:'hello',text:'hello',type:'word',source:'imported',tags:[],metadata:{materialType:'wordbook',vocabulary:{meaning:'greeting',example:'',pronunciation:'',bookTitle:''}},createdAt:1,updatedAt:1});
 const task=await scheduleImportedMaterial(['schedule-word']);
 expect(task?.vocabularyMode).toBe('meaning');expect(task?.stage).toBeUndefined();
});
