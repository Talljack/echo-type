import { describe, expect, it } from 'vitest';
import {
  buildSpeechWordFeedback,
  calculateSpeechMatch,
  joinSpeechTranscripts,
  resolveSpeechTranscript,
  shouldShowSpeechFeedback,
} from './speech-feedback';

const sentence = 'I will send the meeting notes and action items to everyone by end of day.';

describe('speech feedback', () => {
  it('combines confirmed and interim recognition text', () => {
    expect(joinSpeechTranscripts('I will send', 'the meeting notes and action items')).toBe(
      'I will send the meeting notes and action items',
    );
  });

  it('uses the latest accumulated server transcript without duplicating the final text', () => {
    expect(resolveSpeechTranscript(sentence, sentence, false)).toBe(sentence);
    expect(resolveSpeechTranscript(sentence, '', false)).toBe(sentence);
  });

  it('shows pending word feedback as soon as listening starts', () => {
    expect(shouldShowSpeechFeedback('listening', '')).toBe(true);
    expect(buildSpeechWordFeedback(sentence, '', true).every((result) => result.accuracy === 'pending')).toBe(true);
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
