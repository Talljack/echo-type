import { describe, expect, it } from 'vitest';
import { getFavoriteSelectionAction } from '@/lib/favorite-selection-action';

describe('getFavoriteSelectionAction', () => {
  it('adds a new favorite to the selected folder', () => {
    expect(getFavoriteSelectionAction(undefined, 'folder-a')).toBe('add');
  });

  it('moves an existing favorite when another folder is selected', () => {
    expect(getFavoriteSelectionAction({ folderId: 'auto' }, 'folder-a')).toBe('move');
  });

  it('removes an existing favorite when its current folder remains selected', () => {
    expect(getFavoriteSelectionAction({ folderId: 'folder-a' }, 'folder-a')).toBe('remove');
  });
});
