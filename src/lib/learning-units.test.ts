import { describe, expect, it } from 'vitest';
import { buildLearningUnits, lessonProgress, splitText } from './learning-units';
import type { ContentItem, TypingSession } from '@/types/content';

const item = (id: string, extra: Partial<ContentItem> = {}): ContentItem => ({ id, title: id, text: 'Hello world.', type: 'article', source: 'imported', tags: [], createdAt: 1, updatedAt: 1, ...extra });
describe('learning units', () => {
  it('keeps legacy built-in scenario books in Scenarios', () => {
    const result = buildLearningUnits([item('airport-1', {type:'phrase', category:'airport'})]);
    expect(result.units[0].materialType).toBe('scenario');
  });
  it('exposes six material types without duplicating sources or dropping book chapters', () => {
    const sources = [
      item('word', { type: 'word', category: 'vocab' }),
      item('video', { metadata: { sourceFilename: 'lesson.mp4', audioUrl: 'idb:video' } }),
      item('chapter1', { category: 'book-english' }),
      item('chapter2', { category: 'book-english' }),
      item('dialogue', { metadata: { materialType: 'dialogue' } }),
      item('sentences', { type: 'sentence' }),
      item('scenario', { metadata: { materialType: 'scenario' } }),
    ];
    const result = buildLearningUnits(sources);
    expect(new Set(result.units.map(u => u.materialType))).toEqual(new Set(['wordbook','video','reading','dialogue','sentences','scenario']));
    expect(result.units.flatMap(u => u.sourceIds).sort()).toEqual(sources.map(s => s.id).sort());
    expect(result.lessons.filter(l => l.unitId === 'unit:category:book-english')).toHaveLength(2);
  });
  it('audio is a sentence source, never a video or separate audio material', () => {
    const result = buildLearningUnits([item('audio', {metadata:{sourceFilename:'recording.mp3',audioUrl:'idb:audio'}})]);
    expect(result.units[0].materialType).toBe('sentences');
  });
  it('preserves every character including a long paragraph', () => {
    const text = '  Title\n\n' + 'A sentence with five words. '.repeat(200) + '\nEnd.';
    const parts = splitText(text, 50);
    expect(parts.length).toBeGreaterThan(4);
    expect(parts.join('')).toBe(text);
  });
  it('has deterministic IDs and does not mutate originals', () => {
    const contents = [item('a')];
    const copy = structuredClone(contents);
    expect(buildLearningUnits(contents)).toEqual(buildLearningUnits(contents));
    expect(contents).toEqual(copy);
    expect(buildLearningUnits(contents).units).toHaveLength(1);
  });
  it('groups vocabulary in 20-item lessons', () => {
    const contents = Array.from({length: 45}, (_, i) => item(`word-${i}`, { type: 'word', category: 'my-book' }));
    const result = buildLearningUnits(contents);
    expect(result.units).toHaveLength(1);
    expect(result.lessons.map(l => l.exercises.length)).toEqual([20,20,5]);
  });
  it('omits deleted sources and derived practice snapshots', () => {
    expect(buildLearningUnits([item('gone', { deletedAt: 5 }), item('derived', { metadata: { lessonSourceId: 'a' } })]).units).toEqual([]);
  });
  it('bounds timed lessons and preserves the original audio reference', () => {
    const result = buildLearningUnits([item('video', { metadata: { audioUrl: 'idb:video', timestamps: [0,180,360].map(offset => ({offset, duration: 170, text: 'A line.'})) } })]);
    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[1].exercises[0].metadata?.timestamps?.[0].offset).toBe(360);
    expect(result.lessons[1].exercises[0].metadata?.audioUrl).toBe('idb:video');
  });
  it('only counts completed sessions for the matching exercise and module', () => {
    const lesson = buildLearningUnits([item('a')]).lessons[0];
    const session = { contentId: lesson.exercises[0].id, module: 'listen', completed: false } as TypingSession;
    expect(lessonProgress(lesson, [session]).completed).toBe(0);
    expect(lessonProgress(lesson, [{...session, completed:true}]).completed).toBe(1);
    expect(lessonProgress(lesson, [{...session, completed:true, contentId:'other'}]).completed).toBe(0);
  });
  it('changes excerpt identity when source text changes', () => {
    const a = buildLearningUnits([item('a', {text:'word '.repeat(800)})]);
    const b = buildLearningUnits([item('a', {text:'new '.repeat(800)})]);
    expect(a.lessons[0].exercises[0].id).not.toBe(b.lessons[0].exercises[0].id);
  });
});
