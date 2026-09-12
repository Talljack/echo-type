import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { db } from './db';

it('idempotent record writes do not fail when Dexie reports no field differences', async () => {
  const Database = db.constructor as new (name: string) => typeof db;
  const database = new Database(`hook-regression-${crypto.randomUUID()}`);
  try {
    const row = { id: 'record', contentId: 'content', module: 'read' as const, attempts: 1,
      accuracy: 70, correctCount: 1, mistakes: [], lastPracticed: 1000, updatedAt: 1000 };
    await database.records.put(row);
    await database.records.put(row);
    expect(await database.records.get(row.id)).toEqual(row);
  } finally { await database.delete(); }
});

it('upgrades v16 records that need timestamp backfill without closing the database', async () => {
  const Database = db.constructor as new (name: string) => typeof db;
  const database = new Database(`migration-regression-${crypto.randomUUID()}`);
  const legacy = new Dexie(database.name);
  const added = new Set(['learningUnits','lessons','pronunciationProgress','learningAttempts','dailyTasks','importJobs','syncConflicts','syncEntityState']);
  legacy.version(16).stores(Object.fromEntries(database.tables.filter(table => !added.has(table.name))
    .map(table => [table.name, [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(',')])));
  try {
    await legacy.table('records').put({id:'old',contentId:'source',module:'read',attempts:3,accuracy:72,mistakes:[]});
    legacy.close();
    await database.open();
    expect(await database.records.get('old')).toMatchObject({accuracy:72,attempts:3});
    expect((await database.records.get('old'))?.updatedAt).toEqual(expect.any(Number));
  } finally { legacy.close(); await database.delete(); }
});
