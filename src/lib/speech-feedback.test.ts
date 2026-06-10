import { describe, expect, it } from 'vitest';
import { buildSpeechWordFeedback, calculateSpeechMatch, joinSpeechTranscripts } from './speech-feedback';

const sentence = 'I will send the meeting notes and action items to everyone by end of day.';

describe('speech feedback', () => {
  it('combines confirmed and interim recognition text', () => {
    expect(joinSpeechTranscripts('I will send', 'the meeting notes and action items')).toBe(
      'I will send the meeting notes and action items',
    );
  });

  it('does not mark the unconfirmed suffix as wrong while listening', () => {
    const results = buildSpeechWordFeedback(sentence, 'I will send the meeting notes', true);

    expect(results.slice(0, 6).every((result) => result.accuracy === 'correct')).toBe(true);
    expect(results.slice(6).every((result) => result.accuracy === 'pending')).toBe(true);
  });

  it('aligns later words after a missed word instead of shifting the whole sentence', () => {
    const results = buildSpeechWordFeedback(sentence, 'I will send meeting notes and action items to everyone', false);
    const meeting = results.find((result) => result.word === 'meeting');
    const everyone = results.find((result) => result.word === 'everyone');

    expect(meeting?.accuracy).toBe('correct');
    expect(everyone?.accuracy).toBe('correct');
  });

  it('scores an exact sentence as fully correct despite punctuation', () => {
    expect(calculateSpeechMatch(sentence, sentence)).toEqual({ accuracy: 100, correct: 15, total: 15 });
  });
});
