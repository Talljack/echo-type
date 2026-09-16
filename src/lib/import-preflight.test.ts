import { expect, it } from 'vitest';
import { importPreflight } from './import-preflight';
it('accepts large media with an OpenRouter credential', () => {
  expect(importPreflight({name:'audio.mp3',size:5*1024*1024}, {openrouter:{auth:{type:'api-key',apiKey:'test-only'}}}).error).toBeUndefined();
});
it('rejects unsupported and empty files before processing', () => {
  expect(importPreflight({ name: 'book.xlsx', size: 10 }, {}).error).toContain('CSV');
  expect(importPreflight({ name: 'book.txt', size: 0 }, {}).error).toContain('empty');
});
it('explains large media credentials before transcription starts', () => {
  expect(importPreflight({ name: 'talk.mp4', size: 5 * 1024 * 1024 }, {}).error).toContain('Groq or OpenAI');
  expect(importPreflight({ name: 'talk.mp4', size: 5 * 1024 * 1024 }, { groq: { auth: { type: 'api-key', apiKey: 'key' } } }).error).toBeUndefined();
});
it('does not invent a credential requirement for document extraction', () => {
  expect(importPreflight({ name: 'book.epub', size: 1024 }, {})).toEqual({ media: false });
});
