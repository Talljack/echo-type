import { describe, expect, it } from 'vitest';
import { normalizeTurns } from './journal-structure';

describe('normalizeTurns', () => {
  it('keeps free-form speaker labels and unlabeled lines', () => {
    expect(
      normalizeTurns({
        turns: [
          { speaker: ' A: ', text: ' Where is the nearest station? ', translation: '最近的车站在哪里？' },
          { speaker: '', text: 'Could you say that again, please?' },
          { speaker: 'Phrase', text: 'I am looking forward to it.', translation: '' },
        ],
      }),
    ).toEqual([
      { speaker: 'A', text: 'Where is the nearest station?', translation: '最近的车站在哪里？' },
      { speaker: undefined, text: 'Could you say that again, please?', translation: undefined },
      { speaker: 'Phrase', text: 'I am looking forward to it.', translation: undefined },
    ]);
  });

  it('does not invent a speaker for unknown labels', () => {
    expect(
      normalizeTurns({
        turns: [
          { speaker: 'unknown', text: 'Single sentence material.' },
          { speaker: 'n/a', text: 'Useful phrase.' },
          { speaker: 'Teacher', text: 'Try this sentence.' },
        ],
      }),
    ).toEqual([
      { speaker: undefined, text: 'Single sentence material.', translation: undefined },
      { speaker: undefined, text: 'Useful phrase.', translation: undefined },
      { speaker: 'Teacher', text: 'Try this sentence.', translation: undefined },
    ]);
  });

  it('drops empty or malformed turn items', () => {
    expect(
      normalizeTurns({
        turns: [{ speaker: 'A', text: '  ' }, null, { text: 'Keep this line.' }],
      }),
    ).toEqual([{ speaker: undefined, text: 'Keep this line.', translation: undefined }]);
  });
});
