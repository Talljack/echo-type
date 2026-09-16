import { describe, expect, it } from 'vitest';
import { parseSubtitles, recoverImportJob, shiftSubtitleBlocks, materialItemsForJob } from './import-job';
import type { ImportJob } from '@/types/import-job';

const job = { id: 'one', ownerId: 'guest', status: 'processing', title: 'Lesson', kind: 'document', fingerprint: 'hash', createdAt: 1, updatedAt: 1, blocks: [{ id: 'b1', text: 'Hello world', title: 'Chapter 1', start: 0, end: 11 }], originalText: 'Hello world' } as ImportJob;
describe('durable import preparation', () => {
  it('keeps legacy tags and accepts unfinished tag text without losing separators', () => {
    expect(materialItemsForJob({...job, tags: ['legacy']})[0].tags).toEqual(['imported', 'legacy']);
    expect(materialItemsForJob({...job, tagsText: 'work, release,'})[0].tags).toEqual(['imported', 'work', 'release']);
  });
  it('publishes selected chapters without removing originals or book grouping', () => {
    const source = {...job, blocks: [...job.blocks, {...job.blocks[0], id: 'b2', text: 'Second chapter'}], excludedBlockIds: ['b1']};
    const items = materialItemsForJob(source);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('Second chapter');
    expect(items[0].category).toBe('book-import:one');
    expect(source.blocks).toHaveLength(2);
    expect(materialItemsForJob({...source, excludedBlockIds: ['b1', 'b2']})).toHaveLength(0);
  });
  it('turns a reviewed CSV into vocabulary entries with meaning and metadata', () => {
    const items = materialItemsForJob({...job, materialType:'wordbook', tagsText:'travel', blocks:[{...job.blocks[0], text:'word,meaning,example\nhelpful,有帮助的,A helpful reply.'}]});
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({title:'helpful',type:'word',tags:['imported','travel'],metadata:{vocabulary:{meaning:'有帮助的'}}});
    expect(() => materialItemsForJob({...job, materialType:'wordbook'})).toThrow();
  });
  it('publishes AI-organized audio as one sentence material without an audio player', () => {
    const result = materialItemsForJob({...job,kind:'media',filename:'voice.mp3',materialType:'sentences',audioStructured:true});
    expect(result[0].metadata?.materialType).toBe('sentences');
    expect(result[0].metadata?.audioUrl).toBeUndefined();
  });
  it('parses SRT, preserves cue timings and strips display tags', () => {
    expect(parseSubtitles('1\n00:00:01,500 --> 00:00:03,000\nHello <i>world</i>\n\n2\n00:00:04,000 --> 00:00:05,000\nAgain.')).toMatchObject([{ text: 'Hello world', timeStart: 1.5, timeEnd: 3 }, { text: 'Again.', timeStart: 4, timeEnd: 5 }]);
  });
  it('parses VTT cue settings and ignores NOTE blocks', () => {
    expect(parseSubtitles('WEBVTT\n\nNOTE private\nignore\n\ncue-id\n00:01.000 --> 00:02.500 align:start\nHi')).toMatchObject([{ text: 'Hi', timeStart: 1, timeEnd: 2.5 }]);
  });
  it('rejects invalid and reversed timing instead of silently importing corrupt text', () => {
    expect(() => parseSubtitles('00:03.000 --> 00:01.000\nBad')).toThrow();
    expect(() => parseSubtitles('not subtitles')).toThrow();
  });
  it('shifts timings without mutating original and rejects negative starts', () => {
    const blocks = parseSubtitles('00:01.000 --> 00:02.000\nHi');
    expect(shiftSubtitleBlocks(blocks, 2)[0].timeStart).toBe(3);
    expect(blocks[0].timeStart).toBe(1);
    expect(() => shiftSubtitleBlocks(blocks, -2)).toThrow();
  });
  it('recovers interrupted work for manual retry without pretending it ran in background', () => {
    expect(recoverImportJob(job).status).toBe('needsReview');
    expect(recoverImportJob({ ...job, blocks: [] }).status).toBe('failed');
    expect(recoverImportJob({ ...job, status: 'ready' }).status).toBe('ready');
  });
  it('publishes stable IDs and immutable source locations independent of corrected text', () => {
    const first = materialItemsForJob(job);
    const corrected = materialItemsForJob({ ...job, blocks: [{ ...job.blocks[0], text: 'Hello again.' }] });
    expect(first[0].id).toBe(corrected[0].id);
    expect(corrected[0].metadata).toMatchObject({ importJobId: 'one', sourceBlockId: 'b1', sourceStart: 0, sourceEnd: 11 });
    expect(job.originalText).toBe('Hello world');
  });
  it('keeps a timed media transcript as one material with all timestamps', () => {
    const items = materialItemsForJob({ ...job, kind: 'media', blocks: parseSubtitles('00:01.000 --> 00:02.000\nHi\n\n00:03.000 --> 00:04.000\nBye') });
    expect(items).toHaveLength(1);
    expect(items[0].metadata?.timestamps).toHaveLength(2);
  });
  it('keeps timed URL captions as one material too', () => {
    expect(materialItemsForJob({ ...job, kind: 'url', blocks: parseSubtitles('00:01.000 --> 00:02.000\nHi\n\n00:03.000 --> 00:04.000\nBye') })).toHaveLength(1);
  });
});
