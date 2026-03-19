import { describe, expect, it } from 'vitest';

import { getActiveShortcutScopes } from './shortcut-definitions';

describe('getActiveShortcutScopes', () => {
  it('always includes global scope', () => {
    expect(getActiveShortcutScopes('/settings')).toEqual(['global']);
  });

  it('enables listen scope only on listen practice detail pages', () => {
    expect(getActiveShortcutScopes('/listen')).toEqual(['global']);
    expect(getActiveShortcutScopes('/listen/lesson-1')).toEqual(['global', 'listen']);
  });

  it('enables speak, read, and write scopes on their detail pages', () => {
    expect(getActiveShortcutScopes('/speak/scenario-a')).toEqual(['global', 'speak']);
    expect(getActiveShortcutScopes('/read/article-a')).toEqual(['global', 'read']);
    expect(getActiveShortcutScopes('/write/exercise-a')).toEqual(['global', 'write']);
  });
});
