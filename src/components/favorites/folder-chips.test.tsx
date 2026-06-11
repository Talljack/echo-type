import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: () => false,
}));

vi.mock('@/stores/favorite-store', () => ({
  useFavoriteStore: (selector: (state: unknown) => unknown) =>
    selector({
      folders: [
        { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 1 },
        { id: 'empty-folder', name: '单词收藏', emoji: '📚', sortOrder: 1, createdAt: 2 },
      ],
      favorites: [],
      activeFolderId: null,
      setActiveFolderId: vi.fn(),
    }),
}));

vi.mock('./folder-manage-dialog', () => ({
  FolderManageDialog: () => null,
}));

import { FolderChips } from './folder-chips';

describe('FolderChips', () => {
  it('shows newly created folders even when they do not contain favorites yet', () => {
    const markup = renderToStaticMarkup(<FolderChips />);

    expect(markup).toContain('📚 单词收藏');
  });
});
