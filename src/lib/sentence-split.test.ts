import { describe, expect, it } from 'vitest';
import { splitSentences } from './sentence-split';

describe('splitSentences', () => {
  it('keeps common abbreviations inside the same sentence', () => {
    expect(splitSentences('Meet me at 10:30 a.m. in the U.S. office.')).toEqual([
      'Meet me at 10:30 a.m. in the U.S. office.',
    ]);
  });

  it('splits normal sentence boundaries', () => {
    expect(splitSentences('Hello there. How are you? I am fine!')).toEqual([
      'Hello there.',
      'How are you?',
      'I am fine!',
    ]);
  });

  it('keeps initialisms in the same sentence', () => {
    expect(splitSentences('The U.N. meeting starts now. Please join quickly.')).toEqual([
      'The U.N. meeting starts now.',
      'Please join quickly.',
    ]);
  });
});
