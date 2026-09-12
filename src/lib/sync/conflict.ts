export interface SyncConflict {
  id: string;
  tableName: string;
  entityId: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  createdAt: number;
  resolvedAt?: number;
  remoteMissing?: boolean;
  localMissing?: boolean;
}
export interface SyncEntityState {
  id: string;
  revision: number;
  snapshot: Record<string, unknown>;
}
function comparable(row: Record<string, unknown>) {
  function sorted(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, sorted(v)]),
      );
    return value;
  }
  const { updatedAt: _updatedAt, ...data } = row;
  return JSON.stringify(sorted(data));
}
export function hasSyncConflict(local: Record<string, unknown>, remote: Record<string, unknown>, since: number) {
  return Number(local.updatedAt ?? 0) >= since && comparable(local) !== comparable(remote);
}
