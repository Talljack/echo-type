import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { resolveSyncConflict } from './resolution';
import { clearSyncCheckpoints } from './checkpoints';
import { restoreBackup } from '../backup';
import { vi } from 'vitest';
it('invalidates per-table checkpoints when the restore helper runs', async () => {
 const database=new Dexie('echotype:user:restore');database.version(1).stores({books:'id'});await database.open();
 const values=new Map([['echotype_sync_table_v3_restore_books','checkpoint']]);
 vi.stubGlobal('localStorage',{get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 try {await restoreBackup(database,{books:[{id:'b',updatedAt:1}]});expect(values.has('echotype_sync_table_v3_restore_books')).toBe(false);expect(values.get('echotype_sync_epoch_restore')).toBe('1');}finally{await database.delete();vi.unstubAllGlobals();}
});
it('clears every current-account cursor without touching another account', () => {
 const values = new Map([['echotype_last_synced_a','x'],['echotype_sync_table_v3_a_books','x'],['echotype_sync_table_v3_a_future','x'],['echotype_sync_table_v3_b_books','y']]);
 const storage = {get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,removeItem:(k:string)=>values.delete(k),getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 clearSyncCheckpoints('a',storage);
 expect([...values.keys()]).toEqual(['echotype_sync_table_v3_b_books','echotype_sync_epoch_a']);
});
it('does not replace a newer local edit when resolving an old conflict', async () => {
 const database=new Dexie('resolution-test');database.version(1).stores({books:'id',syncConflicts:'id',syncEntityState:'id'});await database.open();
 const conflict={id:'c',tableName:'books',entityId:'b',local:{id:'b',title:'old',updatedAt:1},remote:{id:'b',title:'cloud',updatedAt:2},createdAt:3};
 try {
  await database.table('syncConflicts').put(conflict);await database.table('books').put({id:'b',title:'new edit',updatedAt:4});
  expect(await resolveSyncConflict(database,conflict,'remote')).toBe('stale');
  expect((await database.table('books').get('b')).title).toBe('new edit');
  const refreshed=await database.table('syncConflicts').get('c');expect(refreshed.resolvedAt).toBeUndefined();
  expect(await resolveSyncConflict(database,refreshed,'remote')).toBe('resolved');
  expect((await database.table('books').get('b')).title).toBe('cloud');
 } finally {await database.delete();}
});
it('refreshes a newer observed cloud version rather than publishing an obsolete choice', async () => {
 const database=new Dexie('resolution-remote');database.version(1).stores({books:'id',syncConflicts:'id',syncEntityState:'id'});await database.open();
 const conflict={id:'c',tableName:'books',entityId:'b',local:{id:'b',title:'local',updatedAt:1},remote:{id:'b',title:'old cloud',updatedAt:2},createdAt:3};
 try {await database.table('books').put(conflict.local);await database.table('syncConflicts').put(conflict);await database.table('syncEntityState').put({id:'books:b',revision:3,snapshot:{id:'b',title:'new cloud',updatedAt:4}});
 expect(await resolveSyncConflict(database,conflict,'remote')).toBe('stale');expect((await database.table('books').get('b')).title).toBe('local');expect((await database.table('syncConflicts').get('c')).remote.title).toBe('new cloud');
 }finally{await database.delete();}
});
