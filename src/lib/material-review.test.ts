import { describe, expect, it } from 'vitest';
import { dialogueRows, joinDialogue, splitRow, mergeRow, vocabularyCsv } from './material-review';
import { parseVocabulary } from './vocabulary';

describe('material review editing', () => {
  it('retains blank lines and curly apostrophes in dialogue', () => {
    const source = 'Narration\n\nAlice: That’s helpful.\n';
    expect(joinDialogue(dialogueRows(source))).toBe(source);
  });
  it('round trips dialogue including unnamed lines and punctuation', () => {
    const text = "Alice: That's great!\nA continuation.\n\nBob: Why?";
    expect(joinDialogue(dialogueRows(text))).toBe(text);
  });
  it('splits at the chosen cursor without dropping punctuation', () => {
    expect(splitRow(['Hello! Next.'], 0, 6)).toEqual(['Hello!', ' Next.']);
    expect(splitRow(['Hello'], 0, 0)).toEqual(['Hello']);
  });
  it('merges only the selected adjacent rows', () => {
    expect(mergeRow(['One.', 'Two.', 'Three.'], 0)).toEqual(['One. Two.', 'Three.']);
    expect(mergeRow(['One.'], 0)).toEqual(['One.']);
  });
  it('serializes all vocabulary fields with commas, quotes and newlines', () => {
    const rows = [{word: 'hello', meaning: '你好,问候', pronunciation: '/həˈləʊ/', example: 'He said "hello".\nAgain.'}];
    expect(parseVocabulary(vocabularyCsv(rows)).rows).toEqual(rows);
  });
});
