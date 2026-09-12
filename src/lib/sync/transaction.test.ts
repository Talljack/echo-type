import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, expect, it, vi } from 'vitest';
const context=vi.hoisted(()=>({database:null as any}));
vi.mock('@/lib/db',()=>({get db(){return context.database;}}));
import { SyncEngine, SYNC_TABLES } from './engine';
import { toSupabaseFavorite } from './mapper';
for (const edited of [false,true]) it(`persists hard-delete intent and ${edited?'conflicts with a newer remote favorite edit':'sends a revision-checked tombstone'}`,async()=>{
 const db=await setup();const favorite={id:'f',text:'hello',normalizedText:'hello',translation:'你好',type:'word',folderId:'default',targetLang:'zh',autoCollected:false,createdAt:1000,updatedAt:1000};
 await db.table('favorites').put(favorite);await db.table('syncEntityState').put({id:'favorites:f',revision:1,snapshot:favorite});
 await db.table('favorites').delete('f');const calls:any[]=[];
 const raw={...toSupabaseFavorite(favorite as any,'transaction-test'),text:edited?'remote edit':'hello',sync_revision:edited?2:1};
 const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:name==='favorites'?[raw]:[],error:null})};return q;},rpc:async(name:string,args:any)=>{
  if(name==='sync_server_clock')return{data:new Date(5000).toISOString(),error:null};calls.push(args);
  return{data:{status:'applied',row:{...raw,sync_deleted_at:new Date(3000).toISOString(),sync_revision:2}},error:null};
 }} as any;
 const result=await new SyncEngine(client,'transaction-test').fullSync();
 expect(await db.table('favorites').get('f')).toBeUndefined();
 if(edited){expect(result.errors.join()).toMatch(/review|conflict/i);expect((await db.table('syncConflicts').toArray())[0].localMissing).toBe(true);expect(calls).toHaveLength(0);}
 else{expect(result.errors).toEqual([]);expect(calls[0].entity._sync_delete).toBe(true);expect(calls[0].expected_revision).toBe(1);expect((await db.table('syncEntityState').get('favorites:f')).snapshot._syncDeleted).toBe(true);}
});
afterEach(async()=>{if(context.database)await context.database.delete();vi.unstubAllGlobals();});
async function setup(){
 const db=new Dexie('echotype:user:transaction-test');
 db.version(1).stores(Object.fromEntries([...SYNC_TABLES,'syncEntityState','syncConflicts'].map(name=>[name,'id'])));
 await db.open();context.database=db;vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});return db;
}
it('retains first-upload deletion intent when the server succeeded but the acknowledgement was lost',async()=>{
 const db=await setup();await db.table('books').put({id:'new',title:'first upload',updatedAt:1000});let remote:any=null;const deletes:any[]=[];
 const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:name==='books'&&remote?[remote]:[],error:null})};return q;},rpc:async(name:string,args:any)=>{
  if(name==='sync_server_clock')return{data:new Date(5000).toISOString(),error:null};
  if(!args.entity._sync_delete){remote={id:'new',data:args.entity.data,sync_revision:1,updated_at:new Date(3000).toISOString()};return{error:{message:'lost acknowledgement'},data:null};}
  deletes.push(args);remote={...remote,sync_revision:2,sync_deleted_at:new Date(4000).toISOString()};return{data:{status:'applied',row:remote},error:null};
 }} as any;
 expect((await new SyncEngine(client,'transaction-test').fullSync()).errors.join()).toContain('lost acknowledgement');
 expect((await db.table('syncEntityState').get('books:new')).revision).toBe(0);
 await db.table('books').delete('new');
 expect((await new SyncEngine(client,'transaction-test').fullSync()).errors).toEqual([]);
 expect(deletes[0].expected_revision).toBe(1);expect(await db.table('books').get('new')).toBeUndefined();
});
it('applies a remote deletion without resurrecting the row or losing its revision',async()=>{
 const db=await setup();const local={id:'b',title:'baseline',updatedAt:1000};await db.table('books').put(local);await db.table('syncEntityState').put({id:'books:b',revision:1,snapshot:local});
 const remote={id:'b',data:local,updated_at:new Date(3000).toISOString(),sync_revision:2,sync_deleted_at:new Date(3000).toISOString()};
 const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:name==='books'?[remote]:[],error:null})};return q;},rpc:async()=>({data:new Date(5000).toISOString(),error:null})} as any;
 const result=await new SyncEngine(client,'transaction-test').fullSync();expect(result.errors).toEqual([]);expect(await db.table('books').get('b')).toBeUndefined();expect((await db.table('syncEntityState').get('books:b')).revision).toBe(2);
});
it('serializes remote apply with a user edit queued after the local read',async()=>{
 const db=await setup();const other=new Dexie(db.name);await other.open();
 await db.table('books').put({id:'b',title:'baseline',updatedAt:1000});
 await db.table('syncEntityState').put({id:'books:b',revision:1,snapshot:{id:'b',title:'baseline',updatedAt:1000}});
 const metadata=(db as any).syncEntityState;const original=metadata.get.bind(metadata);let userWrite:Promise<unknown>|undefined;
 vi.spyOn(metadata,'get').mockImplementation(async(key:any)=>{
   const value=await original(key);
   if(key==='books:b'&&!userWrite)userWrite=Dexie.ignoreTransaction(()=>other.table('books').put({id:'b',title:'user edit',updatedAt:4000}));
   return value;
 });
 const raw={id:'b',data:{id:'b',title:'remote',updatedAt:3000},updated_at:new Date(3000).toISOString(),sync_revision:2};
 const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:name==='books'?[raw]:[],error:null})};return q;},rpc:async(name:string,args:any)=>name==='sync_server_clock'?{data:new Date(5000).toISOString(),error:null}:{data:{status:'applied',row:{...raw,data:args.entity.data,sync_revision:3}},error:null}} as any;
 try{const result=await new SyncEngine(client,'transaction-test').fullSync();expect(result.errors).toEqual([]);expect(userWrite).toBeDefined();await userWrite;expect((await db.table('books').get('b')).title).toBe('user edit');}finally{other.close();}
});
