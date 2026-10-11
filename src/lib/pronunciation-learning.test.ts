import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRONUNCIATION_LESSONS } from './pronunciation-learning';

describe('pronunciation learning content', () => {
  it('discloses retained words around the example instead of claiming an isolated word', () => {
    const examples = PRONUNCIATION_LESSONS.flatMap((sound) => sound.examples);
    for (const [word, spokenText] of [['go', 'to go'], ['ship', 'a ship'], ['cow', 'a cow']]) {
      expect(examples.find((example) => example.word === word)?.spokenText).toBe(spokenText);
    }
  });
  it('ships 48 playable teaching entries with example pronunciations', () => {
    expect(PRONUNCIATION_LESSONS).toHaveLength(48);
    expect(new Set(PRONUNCIATION_LESSONS.map(sound => sound.id)).size).toBe(48);
    for (const sound of PRONUNCIATION_LESSONS) {
      expect(sound.examples.length).toBeGreaterThanOrEqual(1);
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

it('uses attributed human recordings for every visible sound and example', () => {
  const sources = JSON.parse(readFileSync('src/lib/pronunciation-audio-sources.json', 'utf8')) as Record<string, { kind: string; sourcePage: string; creator: string; license: string; sourceSha256: string; outputSha256: string }>;
  for (const sound of PRONUNCIATION_LESSONS) {
    for (const url of [sound.audioUrl, ...sound.examples.map(example => example.audioUrl)]) {
      const source = sources[url];
      expect(source, url).toBeDefined();
      expect(source.kind).toBe('human');
      expect(source.sourcePage).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      expect(source.creator.length).toBeGreaterThan(0);
      expect(source.license).toMatch(/^(CC BY(?:-SA)? [\d.]+(?: us)?|Public domain|CC0)$/);
      expect(source.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(createHash('sha256').update(readFileSync(`public${url}`)).digest('hex')).toBe(source.outputSha256);
    }
  }
});
