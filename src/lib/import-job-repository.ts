import { db } from '@/lib/db';
import { importJobTags, includedImportBlocks, materialItemsForJob } from '@/lib/import-job';
import { importFileLimit } from '@/lib/import-limits';
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

export async function createImportJob(input: {
  file?: File;
  url?: string;
  ownerId: string;
  batchId?: string;
}): Promise<ImportJob> {
  const scope = captureImportScope();
  const url = input.url?.trim();
  if (!input.file && !url) throw new Error('Choose a file or URL');
  if (input.file && input.file.size > importFileLimit(input.file.name))
    throw new Error(
      `File exceeds its format limit (${Math.round(importFileLimit(input.file.name) / 1024 / 1024)} MB). Split it before importing.`,
    );
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
    const audio = kind === 'media' && !/\.(mp4|webm|avi|mov|mkv)$/i.test(filename || '');
    const job: ImportJob = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      batchId: input.batchId,
      fingerprint,
      kind,
      materialType: /\.(csv|tsv)$/i.test(filename || '')
        ? 'wordbook'
        : kind === 'media'
          ? audio
            ? 'sentences'
            : 'video'
          : kind === 'subtitle'
            ? 'sentences'
            : 'reading',
      requiresAudioStructure: audio,
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
      if (job.requiresAudioStructure && !job.audioStructured)
        throw new Error('Convert the audio transcript into sentences or a scenario before publishing.');
      const included = includedImportBlocks(job);
      if (
        job.status !== 'needsReview' ||
        !job.title.trim() ||
        !included.length ||
        included.some((block) => !block.text.trim())
      )
        throw new Error('Review all sections before adding to library');
      const items = materialItemsForJob(job);
      await database.contents.bulkAdd(items);
      if (job.kind === 'media' && !job.audioStructured) {
        if (!job.originalFile) throw new Error('Reselect the original media before publishing');
        await database.mediaBlobs.put({
          contentId: items[0].id,
          blob: job.originalFile,
          mimeType: job.mimeType || 'audio/mpeg',
          createdAt: Date.now(),
        });
      }
      if (job.materialType === 'wordbook' || (job.kind === 'document' && job.blocks.length > 1)) {
        await database.books.add({
          id: `import:${job.id}`,
          title: job.title,
          author: '',
          description:
            job.materialType === 'wordbook'
              ? `${items.length} vocabulary entries`
              : `${items.length} reviewed chapters`,
          chapterCount: job.materialType === 'wordbook' ? 1 : items.length,
          totalWords:
            job.materialType === 'wordbook'
              ? items.length
              : items.reduce((n, item) => n + item.text.split(/\s+/).filter(Boolean).length, 0),
          difficulty: job.difficulty || 'intermediate',
          tags: importJobTags(job),
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
