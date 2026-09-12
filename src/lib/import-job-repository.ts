import { db } from '@/lib/db';
import { materialItemsForJob } from '@/lib/import-job';
import type { ImportJob } from '@/types/import-job';

export function captureImportScope() {
  const database = db;
  return {
    database,
    assertActive: () => {
      if (database !== db) throw new Error('Account changed. Open imports again in the current account.');
    },
  };
}

export async function createImportJob(input: { file?: File; url?: string; ownerId: string }): Promise<ImportJob> {
  const scope = captureImportScope();
  const url = input.url?.trim();
  if (!input.file && !url) throw new Error('Choose a file or URL');
  if (input.file && input.file.size > 25 * 1024 * 1024)
    throw new Error('Maximum file size is 25 MB. Split large files before importing.');
  if (url && !/^https?:\/\//i.test(url)) throw new Error('Use an HTTP or HTTPS URL');
  const bytes = input.file ? await input.file.arrayBuffer() : new TextEncoder().encode(url!);
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  scope.assertActive();
  return scope.database.transaction('rw', scope.database.importJobs, async () => {
    const existing = await scope.database.importJobs.where('fingerprint').equals(fingerprint).first();
    if (existing) {
      if (!existing.originalFile && input.file) {
        const restored = {
          ...existing,
          originalFile: new Blob([bytes], { type: input.file.type }),
          updatedAt: Date.now(),
        };
        await scope.database.importJobs.put(restored);
        return restored;
      }
      return existing;
    }
    const filename = input.file?.name;
    const kind = url
      ? 'url'
      : /\.(srt|vtt)$/i.test(filename!)
        ? 'subtitle'
        : /\.(mp3|wav|m4a|ogg|flac|mp4|webm|avi)$/i.test(filename!)
          ? 'media'
          : 'document';
    const now = Date.now();
    const job: ImportJob = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      fingerprint,
      kind,
      title: filename?.replace(/\.[^.]+$/, '') || url!,
      filename,
      mimeType: input.file?.type,
      originalFile: input.file ? new Blob([bytes], { type: input.file.type }) : undefined,
      sourceUrl: url,
      status: 'queued',
      blocks: [],
      createdAt: now,
      updatedAt: now,
    };
    await scope.database.importJobs.add(job);
    return job;
  });
}

export async function publishImportJob(jobId: string): Promise<ImportJob> {
  const scope = captureImportScope();
  const database = scope.database;
  return database.transaction(
    'rw',
    [database.importJobs, database.contents, database.books, database.mediaBlobs],
    async () => {
      scope.assertActive();
      const job = await database.importJobs.get(jobId);
      if (!job) throw new Error('Import task not found');
      if (job.status === 'ready') return job;
      if (job.status !== 'needsReview' || !job.blocks.length || job.blocks.some((block) => !block.text.trim()))
        throw new Error('Review all sections before adding to library');
      const items = materialItemsForJob(job);
      await database.contents.bulkAdd(items);
      if (job.kind === 'media') {
        if (!job.originalFile) throw new Error('Reselect the original media before publishing');
        await database.mediaBlobs.put({
          contentId: items[0].id,
          blob: job.originalFile,
          mimeType: job.mimeType || 'audio/mpeg',
          createdAt: Date.now(),
        });
      }
      if (job.kind === 'document' && items.length > 1) {
        await database.books.add({
          id: `import:${job.id}`,
          title: job.title,
          author: '',
          description: `${items.length} reviewed chapters`,
          chapterCount: items.length,
          totalWords: items.reduce((n, item) => n + item.text.split(/\s+/).filter(Boolean).length, 0),
          difficulty: job.difficulty || 'intermediate',
          tags: ['imported'],
          source: 'imported',
          coverEmoji: '',
          metadata: { sourceFilename: job.filename, sourceUrl: job.sourceUrl },
          createdAt: job.createdAt,
          updatedAt: Date.now(),
        });
      }
      const ready: ImportJob = {
        ...job,
        status: 'ready',
        materialIds: items.map((item) => item.id),
        updatedAt: Date.now(),
        error: undefined,
      };
      await database.importJobs.put(ready);
      return ready;
    },
  );
}
