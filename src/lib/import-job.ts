import type { ContentItem } from '@/types/content';
import type { ImportJob, ImportSourceBlock } from '@/types/import-job';

function subtitleTime(value: string): number {
  const parts = value.replace(',', '.').split(':').map(Number);
  if (
    parts.some((part) => !Number.isFinite(part)) ||
    parts.length < 2 ||
    parts.length > 3 ||
    parts.at(-1)! >= 60 ||
    parts.at(-2)! >= 60
  )
    throw new Error('Invalid subtitle time');
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function parseSubtitles(raw: string): ImportSourceBlock[] {
  const blocks: ImportSourceBlock[] = [];
  for (const cue of raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)) {
    if (/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(cue.trim())) continue;
    const lines = cue.trim().split('\n');
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex < 0) continue;
    const match = lines[timeIndex].match(
      /^\s*((?:\d+:)?\d{2}:\d{2}[,.]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[,.]\d{3})(?:\s.*)?$/,
    );
    if (!match) throw new Error('Invalid subtitle cue');
    const timeStart = subtitleTime(match[1]);
    const timeEnd = subtitleTime(match[2]);
    if (timeEnd <= timeStart) throw new Error('Subtitle end must follow start');
    const text = lines
      .slice(timeIndex + 1)
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .trim();
    if (!text) continue;
    const start = blocks.length ? blocks[blocks.length - 1].end + 2 : 0;
    blocks.push({
      id: `cue-${blocks.length + 1}`,
      title: `Cue ${blocks.length + 1}`,
      text,
      start,
      end: start + text.length,
      timeStart,
      timeEnd,
    });
  }
  if (!blocks.length) throw new Error('No valid subtitle cues found');
  return blocks;
}

export function shiftSubtitleBlocks(blocks: ImportSourceBlock[], seconds: number): ImportSourceBlock[] {
  if (!Number.isFinite(seconds)) throw new Error('Offset must be a number');
  return blocks.map((block) => {
    if (block.timeStart === undefined || block.timeEnd === undefined) return { ...block };
    if (block.timeStart + seconds < 0) throw new Error('Offset would move a cue before the start');
    return { ...block, timeStart: block.timeStart + seconds, timeEnd: block.timeEnd + seconds };
  });
}

export function recoverImportJob(job: ImportJob): ImportJob {
  if (job.status !== 'processing') return job;
  return {
    ...job,
    status: job.blocks.length ? 'needsReview' : 'failed',
    error: job.blocks.length ? undefined : 'Processing was interrupted. Retry while this page is open.',
    updatedAt: Date.now(),
  };
}

export function materialItemsForJob(job: ImportJob): ContentItem[] {
  const timed =
    job.kind === 'media' || job.kind === 'subtitle' || job.blocks.some((block) => block.timeStart !== undefined);
  const blocks =
    timed && job.blocks.length
      ? [
          {
            ...job.blocks[0],
            id: 'transcript',
            title: job.title,
            text: job.blocks.map((block) => block.text).join('\n\n'),
            end: job.blocks.at(-1)!.end,
          },
        ]
      : job.blocks;
  return blocks.map((block, index) => ({
    id: `import:${job.id}:${block.id}`,
    title: blocks.length === 1 ? job.title : `${job.title} · ${block.title}`,
    text: block.text,
    type: 'article',
    source: 'imported',
    tags: ['imported'],
    difficulty: job.difficulty || 'intermediate',
    category: !timed && job.blocks.length > 1 ? `book-import:${job.id}` : undefined,
    metadata: {
      importJobId: job.id,
      sourceBlockId: block.id,
      sourceChapter: block.title,
      sourceStart: block.start,
      sourceEnd: block.end,
      sourceFilename: job.filename,
      sourceUrl: job.sourceUrl,
      ...(timed
        ? {
            timestamps: job.blocks
              .filter((entry) => entry.timeStart !== undefined)
              .map((entry) => ({
                offset: entry.timeStart!,
                duration: entry.timeEnd! - entry.timeStart!,
                text: entry.text,
              })),
          }
        : {}),
      ...(job.kind === 'media' ? { audioUrl: `idb:import:${job.id}:transcript` } : {}),
    },
    createdAt: job.createdAt + index,
    updatedAt: Date.now(),
  }));
}

export function textSourceBlocks(text: string, chapters?: { title: string; text: string }[]): ImportSourceBlock[] {
  let cursor = 0;
  return (chapters?.length ? chapters : [{ title: 'Full text', text }]).map((chapter, index) => {
    const found = text.indexOf(chapter.text, cursor);
    const start = found >= 0 ? found : cursor;
    cursor = start + chapter.text.length;
    return { id: `chapter-${index + 1}`, title: chapter.title, text: chapter.text, start, end: cursor };
  });
}
