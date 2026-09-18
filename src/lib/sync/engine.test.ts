import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: {} as Record<string, any[]>, failure: false, ranges: [] as number[], writes: [] as any[], name: 'echotype:user:u' }));
vi.mock('@/lib/db', () => ({ db: new Proxy({}, { get: (_, key) => key === 'transaction' ? async (...args: any[]) => args.at(-1)() : key === 'name' ? state.name : key === 'table' ? (name: string) => table(name) : table(String(key)) }) }));
function table(name: string) { return { toArray: async () => state.rows[name] ?? [], get: async (id: string) => state.rows[name]?.find(r => r.id === id), put: async (r: any) => { state.writes.push(r); }, where: () => ({ equals: () => ({ delete: async () => {}, toArray: async () => [] }), above: () => ({ toArray: async () => [] }) }) }; }
import { SyncEngine } from './engine';
import { hasSyncConflict } from './conflict';
it('detects divergent offline edits without treating server timestamp changes as edits', () => {
  expect(hasSyncConflict({id:'c',text:'offline',updatedAt:2000},{id:'c',text:'remote',updatedAt:3000},1000)).toBe(true);
  expect(hasSyncConflict({id:'c',text:'same',updatedAt:2000},{id:'c',text:'same',updatedAt:3000},1000)).toBe(false);
  expect(hasSyncConflict({id:'c',text:'old',updatedAt:500},{id:'c',text:'new',updatedAt:3000},1000)).toBe(false);
});
const storage = new Map<string, string>();
it('uploads a long session completed after its start passed the checkpoint', async () => {
  storage.set('echotype_sync_schema_u', '2');
  storage.set('echotype_last_synced_u', new Date(2000).toISOString());
  state.rows.sessions = [{id:'late-session',startTime:1000,endTime:3000,updatedAt:3000,completed:true}];
  await new SyncEngine(client(), 'u').incrementalSync();
  expect(state.writes.some(row=>row.id==='late-session' && row.completed)).toBe(true);
});
beforeEach(() => { state.rows = {}; state.failure = false; state.ranges = []; state.writes = []; state.name = 'echotype:user:u'; storage.clear(); vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) }); });
function client(remote: any[] = []) { return { rpc: async (name:string, args:any) => {
 if(name==='sync_server_clock')return {data:new Date().toISOString(),error:null};
 state.writes.push(args.entity); return {data:{status:'applied',row:{...args.entity,sync_revision:1,updated_at:new Date().toISOString()}},error:null};
}, from: (name: string) => { let after = ''; const q: any = { select: () => q, eq: () => q, gte: () => q, gt: (_:string,id:string) => {after=id;return q;}, order: () => q, limit: () => q, then: (resolve: any) => resolve({ data: name === 'contents' ? remote.filter(row=>row.id>after).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,500).map(row=>({...row,sync_revision:1})) : [], error: state.failure ? { message: 'network' } : null }) }; return q; } } as any; }
it('falls back to the legacy schema while the sync v3 migration is not deployed', async () => {
  state.rows.contents = [
    {
      id: 'local-content',
      title: 'Local',
      text: 'Pending upload',
      type: 'article',
      tags: [],
      source: 'imported',
      createdAt: 1000,
      updatedAt: 2000,
    },
  ];
  const uploaded: Array<Record<string, unknown>> = [];
  const api = {
    rpc: async (name: string) =>
      name === 'sync_server_clock'
        ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.sync_server_clock' } }
        : { data: null, error: { message: 'unexpected rpc' } },
    from: (name: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        gt: () => query,
        then: (resolve: any) => resolve({ data: [], error: null }),
        upsert: async (rows: Array<Record<string, unknown>>) => {
          uploaded.push(...rows);
          return { error: null };
        },
      };
      return query;
    },
  } as any;

  const result = await new SyncEngine(api, 'u').fullSync();

  expect(result.errors).toEqual([]);
  expect(uploaded).toContainEqual(expect.objectContaining({ id: 'local-content', user_id: 'u' }));
  expect(storage.get('echotype_last_synced_u')).toBeTruthy();
});
it('paginates legacy pulls before advancing the checkpoint', async () => {
  const remote = Array.from({ length: 501 }, (_, index) => ({
    id: String(index).padStart(4, '0'),
    title: `Remote ${index}`,
    text: 'Remote content',
    type: 'article',
    tags: [],
    source: 'imported',
    created_at: '2020-01-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
  }));
  let afterId = '';
  const api = {
    rpc: async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.sync_server_clock' },
    }),
    from: (name: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        gt: (column: string, value: string) => {
          if (column === 'id') afterId = value;
          return query;
        },
        then: (resolve: any) =>
          resolve({
            data: name === 'contents' ? remote.filter((row) => row.id > afterId).slice(0, 500) : [],
            error: null,
          }),
        upsert: async () => ({ error: null }),
      };
      return query;
    },
  } as any;

  const result = await new SyncEngine(api, 'u').fullSync();

  expect(result.errors).toEqual([]);
  expect(result.pulled.contents).toBe(501);
  expect(state.writes).toHaveLength(501);
  expect(storage.get('echotype_last_synced_u')).toBeTruthy();
});
it('preserves the legacy remote journal deletion cascade', async () => {
  state.rows.journals = [
    {
      id: 'deleted-journal',
      title: 'Deleted',
      lessonDate: '2026-09-18',
      source: 'manual',
      turns: [],
      tags: [],
      contentIds: [],
      createdAt: 1000,
      updatedAt: 2000,
      deletedAt: 2000,
    },
  ];
  const deletes: Array<{ table: string; filters: Array<[string, string]> }> = [];
  const api = {
    rpc: async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.sync_server_clock' },
    }),
    from: (name: string) => {
      const filters: Array<[string, string]> = [];
      const query: any = {
        select: () => query,
        order: () => query,
        limit: () => query,
        gt: () => query,
        eq: (column: string, value: string) => {
          filters.push([column, value]);
          return query;
        },
        then: (resolve: any) => resolve({ data: [], error: null }),
        upsert: async () => ({ error: null }),
        delete: () => {
          deletes.push({ table: name, filters });
          return query;
        },
      };
      return query;
    },
  } as any;

  const result = await new SyncEngine(api, 'u').fullSync();

  expect(result.errors).toEqual([]);
  expect(deletes).toEqual([
    {
      table: 'contents',
      filters: [
        ['user_id', 'u'],
        ['category', 'journal:deleted-journal'],
      ],
    },
    {
      table: 'favorites',
      filters: [
        ['user_id', 'u'],
        ['source_module', 'journal'],
        ['source_content_id', 'deleted-journal'],
      ],
    },
  ]);
});
it('does not fall back when the sync clock fails for a reason other than a missing RPC', async () => {
  const from = vi.fn();
  const api = {
    rpc: async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }),
    from,
  } as any;

  const result = await new SyncEngine(api, 'u').fullSync();

  expect(result.errors).toEqual(['permission denied']);
  expect(from).not.toHaveBeenCalled();
  expect(storage.has('echotype_last_synced_u')).toBe(false);
});
it('does not advance checkpoint on partial failure', async () => { storage.set('echotype_last_synced_u', '2020-01-01T00:00:00.000Z'); state.failure = true; await new SyncEngine(client(), 'u').fullSync(); expect(storage.get('echotype_last_synced_u')).toBe('2020-01-01T00:00:00.000Z'); });
it('paginates beyond the API page limit', async () => { const rows = Array.from({length: 501}, (_, id) => ({ id: String(id), updated_at: '2020-01-01', created_at: '2020-01-01' })); const result = await new SyncEngine(client(rows), 'u').fullSync(); expect(result.pulled.contents).toBe(501); });
it('does not skip rows when journal cascade deletes an earlier page between requests', async () => {
 let rows=Array.from({length:501},(_,i)=>({id:String(i).padStart(4,'0'),updated_at:'2020-01-01',created_at:'2020-01-01',sync_revision:1}));let calls=0;
 const api=client();api.from=(name:string)=>{let after='',offset=0;const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,range:(start:number)=>{offset=start;return q;},gt:(_:string,id:string)=>{after=id;return q;},then:(resolve:any)=>{const data=name==='contents'?rows.filter(row=>row.id>after).slice(offset,offset+500):[];if(name==='contents'&&calls++===0)rows=rows.slice(1);return resolve({data,error:null});}};return q;};
 const result=await new SyncEngine(api,'u').fullSync();expect(result.pulled.contents).toBe(501);
});
it('rejects sync against a different active account database', async () => { state.name = 'echotype:user:other'; const result = await new SyncEngine(client(), 'u').fullSync(); expect(result.errors.join()).toMatch(/account/i); expect(state.writes).toHaveLength(0); });
it('does not reinstate a checkpoint after a backup invalidates an in-flight sync', async () => {
 const api=client();api.rpc=async()=>{storage.set('echotype_sync_epoch_u','1');return {data:new Date().toISOString(),error:null};};
 const result=await new SyncEngine(api,'u').fullSync();
 expect(result.errors.join()).toContain('Backup restored');expect(storage.has('echotype_sync_table_v3_u_contents')).toBe(false);expect(state.writes).toHaveLength(0);
});
