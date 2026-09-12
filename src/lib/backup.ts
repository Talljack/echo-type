import type Dexie from 'dexie';
import JSZip from 'jszip';
import { preflightBackupZip } from './backup-zip';
import { clearSyncCheckpoints } from './sync/checkpoints';

export type BackupTables = Record<string, Record<string, unknown>[]>;
export const BACKUP_TABLES = [
  'contents',
  'records',
  'sessions',
  'books',
  'conversations',
  'favorites',
  'favoriteFolders',
  'lookupHistory',
  'collections',
  'journals',
  'weakSpots',
  'pronunciationProgress',
  'learningUnits',
  'lessons',
  'mediaBlobs',
  'alignmentCache',
  'translationCache',
  'learningAttempts',
  'dailyTasks',
  'importJobs',
  'syncConflicts',
  'syncEntityState',
] as const;
const MAX_BYTES = 512 * 1024 * 1024;
async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
}
export async function createBackupArchive(tables: BackupTables, ownerDatabase?: string): Promise<Uint8Array> {
  const zip = new JSZip();
  let blobIndex = 0;
  let totalBytes = 0;
  async function serialize(value: unknown): Promise<unknown> {
    if (value instanceof Blob) {
      totalBytes += value.size;
      if (totalBytes > MAX_BYTES) throw new Error('Backup exceeds 512 MB. Export smaller material groups first.');
      const bytes = new Uint8Array(await value.arrayBuffer());
      const path = `blobs/${blobIndex++}`;
      zip.file(path, bytes);
      return { _backupBlob: path, sha256: await digest(bytes), size: bytes.length, mime: value.type };
    }
    if (Array.isArray(value)) return Promise.all(value.map(serialize));
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) result[key] = await serialize(item);
      return result;
    }
    return value;
  }
  zip.file(
    'manifest.json',
    JSON.stringify({
      _echotype_backup: true,
      _version: 3,
      _exportedAt: new Date().toISOString(),
      _ownerDatabase: ownerDatabase,
      tables: await serialize(tables),
    }),
  );
  const archive = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  if (archive.length > MAX_BYTES) throw new Error('Backup exceeds the 512 MB restore limit.');
  preflightBackupZip(archive, MAX_BYTES);
  return archive;
}
export async function readBackupArchive(bytes: Uint8Array, targetDatabase?: string): Promise<BackupTables> {
  if (bytes.length > MAX_BYTES) throw new Error('Backup exceeds the 512 MB restore limit.');
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip) preflightBackupZip(bytes, MAX_BYTES);
  const zip = isZip ? await JSZip.loadAsync(bytes, { checkCRC32: true }) : null;
  const manifest = zip ? await zip.file('manifest.json')?.async('string') : new TextDecoder().decode(bytes);
  if (!manifest) throw new Error('Missing backup manifest.');
  const data = JSON.parse(manifest);
  if (data._version > 3) throw new Error('This backup requires a newer EchoType version.');
  let totalBytes = 0;
  async function deserialize(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) return Promise.all(value.map(deserialize));
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record._backupBlob === 'string') {
        if (!/^blobs\/\d+$/.test(record._backupBlob) || typeof record.size !== 'number' || record.size < 0)
          throw new Error('Invalid media manifest.');
        totalBytes += record.size;
        if (totalBytes > MAX_BYTES) throw new Error('Backup media exceeds restore limit.');
        const blobBytes = await zip?.file(record._backupBlob)?.async('uint8array');
        if (!blobBytes || blobBytes.length !== record.size || (await digest(blobBytes)) !== record.sha256)
          throw new Error('Media checksum mismatch; no data restored.');
        return new Blob([blobBytes as Uint8Array<ArrayBuffer>], {
          type: typeof record.mime === 'string' ? record.mime : '',
        });
      }
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(record)) result[key] = await deserialize(item);
      return result;
    }
    return value;
  }
  const raw = Array.isArray(data) ? { contents: data } : data._version === 3 ? await deserialize(data.tables) : data;
  const tables: BackupTables = {};
  for (const name of BACKUP_TABLES) {
    // Revision/deletion intent is valid only for the original signed-in account.
    if (
      name === 'syncEntityState' &&
      (!targetDatabase?.startsWith('echotype:user:') || data._ownerDatabase !== targetDatabase)
    )
      continue;
    const rows = raw?.[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object'))
      throw new Error(`Invalid backup table: ${name}`);
    const key =
      name === 'mediaBlobs'
        ? 'contentId'
        : name === 'lookupHistory'
          ? 'text'
          : name === 'alignmentCache'
            ? 'cacheKey'
            : name === 'translationCache'
              ? 'key'
              : 'id';
    if (rows.some((row) => typeof row[key] !== 'string' || !row[key]))
      throw new Error(`Invalid backup identifiers: ${name}`);
    tables[name] =
      name === 'syncConflicts' &&
      (!targetDatabase?.startsWith('echotype:user:') || data._ownerDatabase !== targetDatabase)
        ? rows.map((row) => ({
            ...row,
            id: `archive:${String(data._ownerDatabase ?? 'unknown')}:${row.id}`,
            resolvedAt: row.resolvedAt || Date.now(),
          }))
        : rows;
  }
  if (!Object.keys(tables).length) throw new Error('Unrecognized backup format.');
  return tables;
}
function timestamp(row: Record<string, unknown>) {
  return Number(
    row.updatedAt ?? row.endTime ?? row.lastSeenAt ?? row.lastPracticed ?? row.createdAt ?? row.startTime ?? 0,
  );
}
export function shouldRestoreRow(incoming: Record<string, unknown>, local?: Record<string, unknown>): boolean {
  return !local || timestamp(incoming) > timestamp(local);
}
/** Validate everything before entering the single atomic database transaction. Never clears user data. */
export async function restoreBackup(
  database: Dexie,
  tables: BackupTables,
): Promise<{ total: number; skipped: number }> {
  let total = 0;
  let skipped = 0;
  const names = Object.keys(tables).filter((name) => (BACKUP_TABLES as readonly string[]).includes(name));
  // Invalidate in-flight sync before acquiring the restore transaction. A failed
  // restore can safely trigger an extra full reconciliation, but never skip one.
  if (typeof localStorage !== 'undefined' && database.name.startsWith('echotype:user:'))
    clearSyncCheckpoints(database.name.slice('echotype:user:'.length));
  await database.transaction(
    'rw',
    names.map((name) => database.table(name)),
    async () => {
      for (const name of names) {
        const table = database.table(name);
        const key = table.schema.primKey.keyPath as string;
        for (const row of tables[name]) {
          const local = await table.get(row[key] as string);
          if (shouldRestoreRow(row, local)) {
            await table.put(row);
            total++;
          } else skipped++;
        }
      }
    },
  );
  return { total, skipped };
}
