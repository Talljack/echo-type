import { describe, expect, it } from 'vitest';
import { getNativeChatToolSuite } from './tauri';

describe('getNativeChatToolSuite', () => {
  it('uses the mobile tool suite only for the iOS native host', () => {
    expect(getNativeChatToolSuite(true)).toBe('mobile');
    expect(getNativeChatToolSuite(false)).toBeUndefined();
  });
});
