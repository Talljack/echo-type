import { describe, expect, it } from 'vitest';
import type { PronunciationProgress } from '@/types/pronunciation';
import { getPronunciationProgression, getSoundPairIndex } from './pronunciation-progression';
import { STUDIO_SOUNDS } from './pronunciation-training';

const evidence = (soundId: string, kind: PronunciationProgress['kind'], updatedAt = 1): PronunciationProgress => ({ id: `${soundId}:${kind}:${updatedAt}`, soundId, kind, updatedAt });

describe('pronunciation progression', () => {
  it('matches either side of a listening pair, and separates unrelated sounds', () => {
    expect(getSoundPairIndex('iy')).toBe(0);
    expect(getSoundPairIndex('ih')).toBe(0);
    expect(getSoundPairIndex('eh')).toBe(4);
    expect(getSoundPairIndex('aa')).toBe(-1);
  });
  it('excludes legacy, listening and recognition from practiced sounds', () => {
    const result = getPronunciationProgression([evidence('aa', 'legacy'), evidence('ih', 'listening'), evidence('eh', 'recognition')], 'ih');
    expect(result.practicedCount).toBe(0);
    expect(result.bySound.aa.status).toBe('legacy');
    expect(result.bySound.ih.status).toBe('listening');
    expect(result.bySound.eh.status).toBe('recognition');
    expect(result.nextSound.id).toBe('eh');
  });
  it('shows the same listening evidence for either counterpart without sharing recording or acoustic evidence', () => {
    const listening = evidence('ih', 'listening', 3);
    const progress = [listening, evidence('ih', 'recording'), evidence('ih', 'speechsuper', 2)];
    const result = getPronunciationProgression(progress, 'iy');
    expect(result.bySound.iy.status).toBe('listening');
    expect(result.bySound.iy.recent).toEqual([listening]);
    expect(result.bySound.iy.recent[0]).toBe(listening);
    expect(result.bySound.iy.practiced).toBe(false);
    expect(result.bySound.ih.status).toBe('assessed');
    expect(result.bySound.aa.recent).toEqual([]);
    expect(result.practicedCount).toBe(1);
    expect(progress).toHaveLength(3);
  });
  it('never shares listening evidence across unrelated pairs or sounds without a pair', () => {
    const result = getPronunciationProgression([evidence('aa', 'listening'), evidence('ae', 'listening')], 'eh');
    expect(result.bySound.eh.status).toBe('listening');
    expect(result.bySound.iy.recent).toEqual([]);
    expect(result.bySound.lot.recent).toEqual([]);
  });
  it('counts unique chart sounds with recording or professional evidence and keeps recent history', () => {
    const result = getPronunciationProgression([evidence('ih', 'recording'), evidence('ih', 'speechsuper', 2), evidence('ih', 'listening', 3), evidence('unknown', 'recording')], 'iy');
    expect(result.practicedCount).toBe(1);
    expect(result.bySound.ih.status).toBe('assessed');
    expect(result.bySound.ih.recent.map((p) => p.kind)).toEqual(['listening', 'speechsuper', 'recording']);
    expect(result.nextSound.id).toBe('eh');
  });
  it('wraps deterministically and recommends the oldest practice when all are practiced', () => {
    const progress = STUDIO_SOUNDS.map((s, i) => evidence(s.id, 'recording', i + 1));
    expect(getPronunciationProgression(progress, 'ih').nextSound.id).toBe('iy');
    expect(getPronunciationProgression([], STUDIO_SOUNDS.at(-1)!.id).nextSound.id).toBe('iy');
  });
});
