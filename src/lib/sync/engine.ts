import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { hasSyncConflict } from './conflict';
import * as mapper from './mapper';

const mappings = {
  contents: [mapper.toSupabaseContent, mapper.fromSupabaseContent],
  records: [mapper.toSupabaseRecord, mapper.fromSupabaseRecord],
  sessions: [mapper.toSupabaseSession, mapper.fromSupabaseSession],
  favorites: [mapper.toSupabaseFavorite, mapper.fromSupabaseFavorite],
  favoriteFolders: [mapper.toSupabaseFavoriteFolder, mapper.fromSupabaseFavoriteFolder],
  journals: [mapper.toSupabaseJournal, mapper.fromSupabaseJournal],
} as const;
export const SYNC_TABLES = [
  ...Object.keys(mappings),
  'books',
  'collections',
  'weakSpots',
  'pronunciationProgress',
  'learningAttempts',
  'dailyTasks',
];
export interface SyncResult {
  pulled: Record<string, number>;
  pushed: Record<string, number>;
  errors: string[];
}
export function syncTimestamp(item: Record<string, unknown>): number {
  return Number(
    item.updatedAt ?? item.endTime ?? item.lastSeenAt ?? item.lastPracticed ?? item.createdAt ?? item.startTime ?? 0,
  );
}
export function getLastSyncedAt(userId: string): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(`echotype_last_synced_${userId}`);
}
function fromRemote(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const mapping = mappings[table as keyof typeof mappings];
  const mapped = mapping
    ? (mapping[1](row) as unknown as Record<string, unknown>)
    : { ...(row.data as object), id: row.id, updatedAt: Date.parse(row.updated_at as string) };
  return row.sync_deleted_at ? { ...mapped, _syncDeleted: true } : mapped;
}
function revision(row: Record<string, unknown>): number {
  const value = Number(row.sync_revision);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('Cloud revision schema is missing. Apply the sync migrations before enabling synchronization.');
  return value;
}
export class SyncEngine {
  private database = db;
  private epoch: string | null;
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {
    this.epoch = typeof window === 'undefined' ? null : localStorage.getItem(`echotype_sync_epoch_${userId}`);
  }
  private assertAccount() {
    if (db !== this.database || this.database.name !== `echotype:user:${this.userId}`)
      throw new Error('Account changed; synchronization stopped safely.');
    if (typeof window !== 'undefined' && localStorage.getItem(`echotype_sync_epoch_${this.userId}`) !== this.epoch)
      throw new Error('Backup restored; synchronization stopped. Sync again to reconcile all data.');
  }
  async fullSync() {
    return this.sync(false);
  }
  async incrementalSync() {
    return this.sync(true);
  }
  private cursorKey(table: string) {
    return `echotype_sync_table_v3_${this.userId}_${table}`;
  }
  private async sync(incremental: boolean): Promise<SyncResult> {
    const result: SyncResult = { pulled: {}, pushed: {}, errors: [] };
    let startedAt: string;
    try {
      this.assertAccount();
      const { data, error } = await this.supabase.rpc('sync_server_clock');
      if (error || !data || !Number.isFinite(Date.parse(data)))
        throw new Error(error?.message ?? 'Cloud sync migration required (server clock missing).');
      startedAt = data;
    } catch (error) {
      result.errors.push((error as Error).message);
      return result;
    }
    for (const table of SYNC_TABLES) {
      result.pulled[table] = 0;
      result.pushed[table] = 0;
      try {
        this.assertAccount();
        const since =
          incremental && typeof window !== 'undefined'
            ? (localStorage.getItem(this.cursorKey(table)) ?? undefined)
            : undefined;
        result.pulled[table] = await this.pullTable(table, since);
        result.pushed[table] = await this.pushTable(table);
        this.assertAccount();
        if (typeof window !== 'undefined') localStorage.setItem(this.cursorKey(table), startedAt);
      } catch (error) {
        result.errors.push(`${table}: ${(error as Error).message}`);
      }
    }
    if (!result.errors.length && typeof window !== 'undefined') {
      this.assertAccount();
      localStorage.setItem(`echotype_last_synced_${this.userId}`, startedAt);
    }
    return result;
  }
  private async saveConflict(
    table: string,
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    remoteRevision: number,
  ) {
    this.assertAccount();
    const id = `${table}:${local.id}:${syncTimestamp(local)}:r${remoteRevision}`;
    if (!(await this.database.syncConflicts.get(id)))
      await this.database.syncConflicts.put({
        id,
        tableName: table,
        entityId: String(local.id),
        local,
        remote,
        createdAt: Date.now(),
        remoteMissing: remoteRevision === 0 || !!remote._syncDeleted,
        localMissing: !!local._syncDeleted,
      });
  }
  private async pullTable(table: string, since?: string) {
    let count = 0;
    const pageSize = 500;
    let afterId: string | undefined;
    for (;;) {
      this.assertAccount();
      let query = this.supabase
        .from(table)
        .select('*')
        .eq('user_id', this.userId)
        .order('id', { ascending: true })
        .limit(pageSize);
      if (afterId !== undefined) query = query.gt('id', afterId);
      if (since) query = query.gte('updated_at', since);
      const { data, error } = await query;
      if (error) throw new Error(`${error.message} (cloud schema/access may require sync migrations)`);
      this.assertAccount();
      for (const raw of data ?? [])
        await this.database.transaction('rw', this.applyTables(table), async () => {
          const id = `${table}:${raw.id}`;
          const local = await this.database.table(table).get(raw.id);
          const observed = await this.database.syncEntityState.get(id);
          const remote = fromRemote(table, raw);
          const remoteRevision = revision(raw);
          const deleting = !local && observed && !observed.snapshot._syncDeleted;
          const dirty =
            deleting ||
            (local && (!observed || observed.revision === 0 || hasSyncConflict(local, observed.snapshot, 0)));
          const changedRemote = !observed || observed.revision !== remoteRevision;
          const intended = deleting ? { ...observed.snapshot, _syncDeleted: true } : local;
          const baseline = deleting ? observed.snapshot : local;
          if (dirty && changedRemote && hasSyncConflict(baseline, remote, 0) && !(deleting && remote._syncDeleted)) {
            await this.saveConflict(table, intended, remote, remoteRevision);
          } else if (!dirty) {
            this.assertAccount();
            if (table === 'journals' && remote.deletedAt) await this.cleanupJournalArtifacts(String(raw.id));
            if (remote._syncDeleted) await this.database.table(table).delete(raw.id);
            else await this.database.table(table).put(remote);
            count++;
          }
          this.assertAccount();
          await this.database.syncEntityState.put({ id, revision: remoteRevision, snapshot: remote });
        });
      if (!data || data.length < pageSize) return count;
      const nextId = String(data[data.length - 1].id);
      if (nextId === afterId) throw new Error('Cloud pagination failed to advance.');
      afterId = nextId;
    }
  }
  private applyTables(table: string) {
    const names = new Set([table, 'syncEntityState', 'syncConflicts']);
    if (table === 'journals') {
      names.add('contents');
      names.add('favorites');
    }
    return [...names].map((name) => this.database.table(name));
  }
  private async pushTable(table: string) {
    this.assertAccount();
    const ids = await this.database.transaction('r', this.applyTables(table), async () => {
      const local = await this.database.table(table).toArray();
      const states = await this.database.syncEntityState.toArray();
      return [
        ...new Set([
          ...local.map((row) => String(row.id)),
          ...states
            .filter((state) => state.id.startsWith(`${table}:`) && !state.snapshot._syncDeleted)
            .map((state) => String(state.snapshot.id)),
        ]),
      ];
    });
    let count = 0,
      blocked = false;
    for (const id of ids) {
      this.assertAccount();
      const stateId = `${table}:${id}`;
      const pending = await this.database.transaction('rw', this.applyTables(table), async () => {
        const current = await this.database.table(table).get(id);
        const observed = await this.database.syncEntityState.get(stateId);
        const conflicts = await this.database.syncConflicts.toArray();
        if (conflicts.some((c) => c.tableName === table && c.entityId === id && !c.resolvedAt)) {
          blocked = true;
          return null;
        }
        const deleting = !current && observed && !observed.snapshot._syncDeleted;
        if (!current && !deleting) return null;
        const row = deleting ? { ...observed.snapshot, _syncDeleted: true } : current;
        if (!deleting && observed && observed.revision > 0 && !hasSyncConflict(row, observed.snapshot, 0)) return null;
        // A durable pre-send snapshot also preserves delete intent after a lost first-upload acknowledgement.
        if (!observed) await this.database.syncEntityState.put({ id: stateId, revision: 0, snapshot: row });
        const mapping = mappings[table as keyof typeof mappings];
        const entity = deleting
          ? { id, _sync_delete: true }
          : mapping
            ? (mapping[0] as (item: never, user: string) => Record<string, unknown>)(row as never, this.userId)
            : { id, user_id: this.userId, data: row, updated_at: new Date(syncTimestamp(row)).toISOString() };
        return { row, deleting: !!deleting, entity, expected: observed?.revision || null };
      });
      if (!pending) continue;
      const { data, error } = await this.supabase.rpc('sync_compare_and_swap', {
        entity_table: table,
        entity: pending.entity,
        expected_revision: pending.expected,
      });
      if (error) throw new Error(`${error.message} (revision-checked sync migration required; no unsafe fallback)`);
      this.assertAccount();
      await this.database.transaction('rw', this.applyTables(table), async () => {
        this.assertAccount();
        const current = await this.database.table(table).get(id);
        if (data?.status === 'conflict') {
          const remote = data.row ? fromRemote(table, data.row) : { ...pending.row, _syncDeleted: true };
          const remoteRevision = data.row ? revision(data.row) : 0;
          const intended = current ?? { ...pending.row, _syncDeleted: true };
          await this.saveConflict(table, intended, remote, remoteRevision);
          await this.database.syncEntityState.put({ id: stateId, revision: remoteRevision, snapshot: remote });
          blocked = true;
          return;
        }
        if (data?.status !== 'applied' || (!data.row && !pending.deleting))
          throw new Error('Invalid cloud synchronization acknowledgement.');
        if (pending.deleting && data.row && !data.row.sync_deleted_at)
          throw new Error('Cloud deletion protocol is missing; apply the latest sync migration.');
        const remote = data.row ? fromRemote(table, data.row) : { ...pending.row, _syncDeleted: true };
        if (!pending.deleting && current && !hasSyncConflict(current, pending.row, 0)) {
          if (table === 'journals' && remote.deletedAt) await this.cleanupJournalArtifacts(id);
          await this.database.table(table).put(remote);
        }
        await this.database.syncEntityState.put({
          id: stateId,
          revision: data.row ? revision(data.row) : 0,
          snapshot: remote,
        });
        count++;
      });
    }
    if (blocked)
      throw new Error(
        'Conflicting device edits are preserved. Review versions in Settings > Data Backup before syncing this table.',
      );
    return count;
  }
  private async cleanupJournalArtifacts(journalId: string) {
    this.assertAccount();
    await this.database.contents.where('category').equals(`journal:${journalId}`).delete();
    const favorites = await this.database.favorites.where('sourceContentId').equals(journalId).toArray();
    this.assertAccount();
    if (favorites.length) await this.database.favorites.bulkDelete(favorites.map((item) => item.id));
  }
}
