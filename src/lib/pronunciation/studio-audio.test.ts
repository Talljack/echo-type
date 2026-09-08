import { expect, it } from 'vitest';
import { encodeMonoWav } from './studio-audio';

it('encodes genuine 16-bit mono WAV metadata and clamps samples', () => {
  const data = new DataView(encodeMonoWav(new Float32Array([-2, 0, 2]), 16000));
  expect(data.byteLength).toBe(50);
  expect(data.getUint16(22, true)).toBe(1);
  expect(data.getUint32(24, true)).toBe(16000);
  expect(data.getUint16(34, true)).toBe(16);
  expect(data.getInt16(44, true)).toBe(-32768);
  expect(data.getInt16(46, true)).toBe(0);
  expect(data.getInt16(48, true)).toBe(32767);
});
