import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { createBackupArchive, readBackupArchive } from './backup';
import { installMediaBlobStorage } from './media-blob-storage';

function database() {
  const db = new Dexie(`media-bytes-${crypto.randomUUID()}`);
  db.version(1).stores({ mediaBlobs: 'contentId', importJobs: 'id', attempts: 'id' });
  installMediaBlobStorage(db);
  return db;
}
function entry(contentId = 'audio', text = 'recording') {
  return { contentId, blob: new Blob([text], { type: 'audio/wav' }), mimeType: 'audio/wav', createdAt: 1 };
}
async function raw(db: Dexie, key = 'audio', table = 'mediaBlobs') {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = db.backendDB().transaction(table).objectStore(table).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

it('stores bytes instead of native Blob and reconstructs the public record after reopen', async () => {
  const db = database();
  try {
    const original = entry();
    await db.table('mediaBlobs').add(original);
    expect((await raw(db)).blob).toBeInstanceOf(ArrayBuffer);
    expect(original.blob).toBeInstanceOf(Blob);
    db.close();
    await db.open();
    const restored = await db.table('mediaBlobs').get('audio');
    expect(Object.keys(restored).sort()).toEqual(Object.keys(original).sort());
    expect(restored.blob.type).toBe('audio/wav');
    expect(await restored.blob.text()).toBe('recording');
  } finally { await db.delete(); }
});

it('persists import originals as bytes, reconstructs after reopen and preserves backups', async () => {
  const db = database();
  try {
    const jobs = db.table('importJobs');
    const original = { id: 'import', filename: 'lesson.srt', originalFile: new Blob(['Original words.'], { type: 'text/plain' }), status: 'queued' };
    await jobs.add(original);
    expect((await raw(db, 'import', 'importJobs')).originalFile).toBeInstanceOf(ArrayBuffer);
    db.close();
    await db.open();
    await jobs.update('import', { status: 'needsReview' });
    const restored = await jobs.get('import');
    expect(Object.keys(restored).sort()).toEqual(Object.keys(original).sort());
    expect(restored.originalFile.type).toBe('text/plain');
    expect(await restored.originalFile.text()).toBe('Original words.');
    const backup = await readBackupArchive(await createBackupArchive({ importJobs: [restored] }));
    expect(await (backup.importJobs[0].originalFile as Blob).text()).toBe('Original words.');
    await jobs.put(backup.importJobs[0]);
    expect(await (await jobs.get('import')).originalFile.text()).toBe('Original words.');
    await jobs.update('import', { originalFile: undefined });
    expect((await jobs.get('import')).originalFile).toBeUndefined();
  } finally { await db.delete(); }
});

it('reads native Blob import originals and URL jobs without encoding metadata', async () => {
  const db = database();
  try {
    await db.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.backendDB().transaction('importJobs', 'readwrite');
      tx.objectStore('importJobs').add({ id: 'legacy', originalFile: new Blob(['Legacy'], { type: 'text/plain' }) });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    expect(await (await db.table('importJobs').get('legacy')).originalFile.text()).toBe('Legacy');
    await db.table('importJobs').add({ id: 'url', sourceUrl: 'https://example.com' });
    expect(await db.table('importJobs').get('url')).toEqual({ id: 'url', sourceUrl: 'https://example.com' });
  } finally { await db.delete(); }
});

it('handles bulk add, replacement and update while preserving backup media', async () => {
  const db = database();
  try {
    const media = db.table('mediaBlobs');
    await media.bulkAdd([entry(), entry('second')]);
    await media.put(entry('audio', 'replacement'));
    await media.update('second', { blob: new Blob(['updated'], { type: 'audio/mp4' }), mimeType: 'audio/mp4' });
    await media.update('audio', { createdAt: 2 });
    expect((await raw(db, 'second')).blob).toBeInstanceOf(ArrayBuffer);
    const rows = await media.toArray();
    expect(await rows[0].blob.text()).toBe('replacement');
    expect(await rows[1].blob.text()).toBe('updated');
    const restored = await readBackupArchive(await createBackupArchive({ mediaBlobs: rows }));
    expect(await (restored.mediaBlobs[1].blob as Blob).text()).toBe('updated');
    expect((restored.mediaBlobs[1].blob as Blob).type).toBe('audio/mp4');
  } finally { await db.delete(); }
});

it('keeps media and attempt transactions atomic when reading recording bytes fails', async () => {
  const db = database();
  try {
    class UnreadableBlob extends Blob { async arrayBuffer(): Promise<ArrayBuffer> { throw new Error('Unreadable audio'); } }
    await expect(db.transaction('rw', ['mediaBlobs', 'attempts'], async () => {
      await db.table('attempts').add({ id: 'attempt' });
      await db.table('mediaBlobs').add({ ...entry(), blob: new UnreadableBlob(['broken']) });
    })).rejects.toThrow('Unreadable audio');
    expect(await db.table('attempts').count()).toBe(0);
    expect(await db.table('mediaBlobs').count()).toBe(0);
  } finally { await db.delete(); }
});

it('reads old native Blob records without migration', async () => {
  const db = database();
  try {
    await db.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.backendDB().transaction('mediaBlobs', 'readwrite');
      tx.objectStore('mediaBlobs').add(entry());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    expect(await (await db.table('mediaBlobs').get('audio')).blob.text()).toBe('recording');
  } finally { await db.delete(); }
});
