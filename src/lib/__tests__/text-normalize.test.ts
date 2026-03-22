import { describe, expect, it } from 'vitest';
import { detectSelectionType, normalizeText } from '../text-normalize';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('strips punctuation', () => {
    expect(normalizeText('Hello, world!')).toBe('hello world');
    expect(normalizeText('"quoted"')).toBe('quoted');
    expect(normalizeText("it's")).toBe('its');
    expect(normalizeText('(parenthetical)')).toBe('parenthetical');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('preserves hyphens and internal spaces', () => {
    expect(normalizeText('well-known phrase')).toBe('well-known phrase');
  });
});

describe('detectSelectionType', () => {
  it('classifies single words', () => {
    expect(detectSelectionType('hello')).toBe('word');
    expect(detectSelectionType('well-known')).toBe('word');
  });

  it('classifies phrases (2-5 words)', () => {
    expect(detectSelectionType('good morning')).toBe('phrase');
    expect(detectSelectionType('a piece of cake')).toBe('phrase');
    expect(detectSelectionType('one two three four five')).toBe('phrase');
  });

  it('classifies sentences (6+ words)', () => {
    expect(detectSelectionType('the quick brown fox jumps over the lazy dog')).toBe('sentence');
  });

  it('classifies text ending with sentence punctuation as sentence', () => {
    expect(detectSelectionType('Hello world.')).toBe('sentence');
    expect(detectSelectionType('Is this right?')).toBe('sentence');
    expect(detectSelectionType('Watch out!')).toBe('sentence');
  });
});
