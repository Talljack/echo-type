import { expect, it } from 'vitest';
import { findMorphology, MORPHOLOGY } from './morphology';
it('contains explicit sourced prefix, root and suffix learning entries', () => {
  expect(findMorphology('transport')?.parts.map(p=>p.form)).toEqual(['trans','port']);
  expect(findMorphology('helpful')?.parts.map(p=>p.form)).toEqual(['help','ful']);
  expect(findMorphology('unhappy')?.parts.map(p=>p.form)).toEqual(['un','happy']);
  expect(MORPHOLOGY.every(e=>e.source.startsWith('https://') && e.parts.map(p=>p.form).join('')===e.word)).toBe(true);
});
it('never infers misleading substrings for uncovered words', () => {
  expect(findMorphology('uncle')).toBeUndefined(); expect(findMorphology('corner')).toBeUndefined();
});
