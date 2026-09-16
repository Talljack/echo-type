import { expect, it } from 'vitest';
import { parseVocabulary } from './vocabulary';
import { vocabularyCsv } from './material-review';
it('keeps incomplete rows for editing while still reporting validation errors', () => {
  const text = vocabularyCsv([{word:'hello',meaning:''},{word:'',meaning:''},{word:'helpful',meaning:'useful'}]);
  const draft = parseVocabulary(text, true);
  expect(draft.rows).toHaveLength(3);
  expect(draft.rows[0].meaning).toBe('');
  expect(draft.errors).toHaveLength(2);
  expect(parseVocabulary(text).rows).toHaveLength(1);
});
