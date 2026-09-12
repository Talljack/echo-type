import type Dexie from 'dexie';
import { hasSyncConflict, type SyncConflict } from './conflict';

function same(a: Record<string, unknown>, b: Record<string, unknown>) {
  return a.updatedAt === b.updatedAt && !hasSyncConflict({ ...a, updatedAt: 0 }, b, 0);
}

export async function resolveSyncConflict(database: Dexie, expected: SyncConflict, version: 'local' | 'remote') {
  return database.transaction(
    'rw',
    [database.table(expected.tableName), database.table('syncConflicts'), database.table('syncEntityState')],
    async () => {
      const conflicts = database.table<SyncConflict>('syncConflicts');
      const conflict = await conflicts.get(expected.id);
      if (!conflict || conflict.resolvedAt) return 'stale';
      if (
        !same(conflict.local, expected.local) ||
        !same(conflict.remote, expected.remote) ||
        conflict.localMissing !== expected.localMissing ||
        conflict.remoteMissing !== expected.remoteMissing
      )
        return 'stale';
      const table = database.table(conflict.tableName);
      const current = await table.get(conflict.entityId);
      const observed = await database.table('syncEntityState').get(`${conflict.tableName}:${conflict.entityId}`);
      const changedRemote = observed && !same(observed.snapshot, conflict.remote);
      if (changedRemote || (conflict.localMissing ? !!current : !current || !same(current, conflict.local))) {
        // Refresh the choice, but retain the previous snapshot as an inactive audit record.
        await conflicts.put({ ...conflict, id: `${conflict.id}:superseded:${Date.now()}`, resolvedAt: Date.now() });
        await conflicts.update(conflict.id, {
          local: current ?? { ...conflict.local, _syncDeleted: true },
          localMissing: !current,
          ...(changedRemote
            ? { remote: observed.snapshot, remoteMissing: observed.revision === 0 || !!observed.snapshot._syncDeleted }
            : {}),
        });
        return 'stale';
      }
      if (version === 'remote' ? conflict.remoteMissing : conflict.localMissing) await table.delete(conflict.entityId);
      else {
        const { _syncDeleted: _, ...chosen } = conflict[version];
        await table.put({ ...chosen, updatedAt: Date.now() });
      }
      await conflicts.update(conflict.id, { resolvedAt: Date.now() });
      return 'resolved';
    },
  );
}
