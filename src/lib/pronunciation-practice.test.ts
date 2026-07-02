import { describe, expect, it } from 'vitest';
import {
  getPronunciationAcceptedWords,
  getPronunciationFamilyLabel,
  getPronunciationSound,
  PRONUNCIATION_SOUNDS,
  scorePronunciationAttempt,
} from './pronunciation-practice';

describe('pronunciation practice sounds', () => {
  it('starts from IPA sounds instead of alphabet letters', () => {
    expect(PRONUNCIATION_SOUNDS[0]).toMatchObject({ group: 'vowels', ipa: 'ɑ', exampleWord: 'hot' });
    expect(PRONUNCIATION_SOUNDS.some((sound) => sound.ipa === 'eɪ' && sound.examples.includes('rain'))).toBe(true);
    expect(PRONUNCIATION_SOUNDS.some((sound) => sound.group === 'consonants' && sound.ipa === 'θ')).toBe(true);
    expect(PRONUNCIATION_SOUNDS.filter((sound) => sound.group === 'consonants').length).toBeGreaterThanOrEqual(24);
    const longVowels = PRONUNCIATION_SOUNDS.filter((sound) => sound.group === 'long-vowels');
    expect(longVowels.length).toBeGreaterThanOrEqual(20);
    expect(longVowels.map((sound) => sound.id)).toEqual(
      expect.arrayContaining(['long-a-a-e', 'long-a-ai', 'long-a-ay', 'long-a-ei', 'long-a-eigh', 'long-a-ey']),
    );
    expect(getPronunciationSound('long-a-ai')).toMatchObject({ pattern: 'ai', soundText: 'ay' });
    expect(longVowels.every((sound) => typeof sound.pattern === 'string' && sound.pattern.length > 0)).toBe(true);
    expect(getPronunciationFamilyLabel(getPronunciationSound('long-a-ai')!)).toBe('Long A');
    expect(PRONUNCIATION_SOUNDS.some((sound) => sound.ipa === 'A')).toBe(false);
  });

  it('scores sound attempts', () => {
    expect(getPronunciationSound('ei')?.soundText).toBe('ay');
    expect(scorePronunciationAttempt('ay', 'ay')).toMatchObject({ score: 100, passed: true, label: 'Clear' });
    expect(scorePronunciationAttempt('ah', 'a')).toMatchObject({ score: 100, passed: true, label: 'Clear' });
    expect(getPronunciationAcceptedWords('th')).toEqual(expect.arrayContaining(['th', 'think', 'this']));
    expect(scorePronunciationAttempt('th', 'think')).toMatchObject({ score: 100, passed: true, label: 'Clear' });
    expect(scorePronunciationAttempt('ay', '')).toMatchObject({ score: 0, passed: false, label: 'No speech' });
  });
});
