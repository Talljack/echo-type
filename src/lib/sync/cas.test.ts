import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ tables: new Map<string,Map<string,any>>(), calls: [] as any[] }));
vi.mock('@/lib/db',()=>({db:new Proxy({name:'echotype:user:u'}, {get:(target,key)=> key==='transaction'?async(...args:any[])=>args.at(-1)():key==='name'?target.name:key==='table'?(name:string)=>table(name):table(String(key))})}));
function table(name:string) {const rows=()=>{if(!state.tables.has(name))state.tables.set(name,new Map());return state.tables.get(name)!;};return {toArray:async()=>[...rows().values()],get:async(id:string)=>rows().get(id),put:async(row:any)=>rows().set(row.id,row)};}
import { SyncEngine } from './engine';
import { hasSyncConflict } from './conflict';
it('does not overwrite a newer local edit made while the RPC is in flight',async()=>{
 state.tables.clear(); state.calls=[];
 vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
 await table('books').put({id:'book',title:'submitted',updatedAt:1000});
 const client={from:()=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:[],error:null})};return q;},rpc:async(name:string,args:any)=>{
  if(name==='sync_server_clock')return {data:new Date(3000).toISOString(),error:null};
  await table('books').put({id:'book',title:'edited while uploading',updatedAt:2000});
  return {data:{status:'applied',row:{id:'book',data:args.entity.data,updated_at:new Date(3000).toISOString(),sync_revision:1}},error:null};
 }} as any;
 const result=await new SyncEngine(client,'u').fullSync();
 expect(result.errors).toEqual([]);
 expect((await table('books').get('book')).title).toBe('edited while uploading');
 expect((await table('syncEntityState').get('books:book')).revision).toBe(1);
});
it('checkpoints successful tables independently when a new cloud table is missing',async()=>{
 state.tables.clear();state.calls=[];const storage=new Map<string,string>();
 vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});
 const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,then:(r:any)=>r({data:[],error:name==='dailyTasks'?{message:'schema missing'}:null})};return q;},rpc:async()=>({data:new Date(3000).toISOString(),error:null})} as any;
 const result=await new SyncEngine(client,'u').fullSync();
 expect(result.errors.join()).toContain('dailyTasks');
 expect(storage.get('echotype_sync_table_v3_u_contents')).toBe(new Date(3000).toISOString());
 expect(storage.has('echotype_sync_table_v3_u_dailyTasks')).toBe(false);
 expect(storage.has('echotype_last_synced_u')).toBe(false);
});
it('compares nested JSON independent of PostgreSQL JSONB key order',()=>{
 expect(hasSyncConflict({id:'c',metadata:{z:1,a:2}},{metadata:{a:2,z:1},id:'c'},0)).toBe(false);
});
it('sends observed revision and retains both versions when server rejects a stale write',async()=>{
  state.tables.clear();state.calls=[];
  vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
  await table('books').put({id:'book',title:'offline',updatedAt:2000});
  const remote={id:'book',user_id:'u',data:{id:'book',title:'baseline',updatedAt:1000},updated_at:new Date(1000).toISOString(),sync_revision:1};
  await table('syncEntityState').put({id:'books:book',revision:1,snapshot:remote.data});
  const client={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:()=>q,range:()=>q,gte:()=>q,then:(r:any)=>r({data:name==='books'?[remote]:[],error:null})};return q;},rpc:async(name:string,args:any)=>{
    if(name==='sync_server_clock')return {data:new Date(3000).toISOString(),error:null};
    state.calls.push(args);
    return {data:{status:'conflict',row:{...remote,data:{id:'book',title:'unseen edit',updatedAt:2500},updated_at:new Date(2500).toISOString(),sync_revision:2}},error:null};
  }} as any;
  const result=await new SyncEngine(client,'u').fullSync();
  expect(state.calls[0]?.expected_revision).toBe(1);
  expect(result.errors.join()).toMatch(/conflict|review/i);
  const conflicts=await table('syncConflicts').toArray();
  expect(conflicts.some(c=>c.local.title==='offline'&&c.remote.title==='unseen edit')).toBe(true);
  expect((await table('books').get('book')).title).toBe('offline');
});
