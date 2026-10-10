import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRONUNCIATION_LESSONS } from './pronunciation-learning';

describe('pronunciation learning content', () => {
  it('ships 48 playable teaching entries with example pronunciations', () => {
    expect(PRONUNCIATION_LESSONS).toHaveLength(48);
    expect(new Set(PRONUNCIATION_LESSONS.map(sound => sound.id)).size).toBe(48);
    for (const sound of PRONUNCIATION_LESSONS) {
      expect(sound.examples.length).toBeGreaterThanOrEqual(2);
      expect(readFileSync(`public${sound.audioUrl}`).length).toBeGreaterThan(1000);
      for (const example of sound.examples) {
        expect(example.ipa).toMatch(/^\/.+\/$/);
        expect(readFileSync(`public${example.audioUrl}`).length).toBeGreaterThan(1000);
      }
    }
  });
  it('uses hear as a near-vowel example with a verified BBC lesson', () => {
    const near = PRONUNCIATION_LESSONS.find(sound => sound.id === 'near')!;
    expect(near.examples[0]).toMatchObject({ word: 'hear', ipa: '/hɪə/' });
    expect(near.videoUrl).toBe('https://www.youtube.com/watch?v=vC0h4S0YPJc');
  });
});
