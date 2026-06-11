import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  detectIOSNativeHost: () => false,
}));

vi.mock('@/stores/favorite-store', () => ({
  useFavoriteStore: (selector: (state: unknown) => unknown) =>
    selector({
      removeFavorite: vi.fn(),
    }),
}));

import { FavoriteItemRow } from './favorite-item-row';

describe('FavoriteItemRow', () => {
  it('renders the review status as a filled metadata pill inside the content area', () => {
    const markup = renderToStaticMarkup(
      <FavoriteItemRow
        item={{
          id: 'favorite-1',
          text: 'We are running short on time',
          normalizedText: 'we are running short on time',
          translation: '我们时间不太充裕了',
          type: 'sentence',
          folderId: 'default',
          targetLang: 'zh-CN',
          autoCollected: false,
          createdAt: 1,
          updatedAt: 1,
        }}
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    );

    const statusIndex = markup.indexOf('data-testid="favorite-status-favorite-1"');
    const playIndex = markup.indexOf('aria-label="Play favorite');

    expect(statusIndex).toBeGreaterThan(-1);
    expect(markup).toContain('bg-slate-100');
    expect(statusIndex).toBeLessThan(playIndex);
  });
});
