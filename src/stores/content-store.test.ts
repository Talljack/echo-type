import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateMock = vi.fn();
const toArrayMock = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    contents: {
      update: updateMock,
      orderBy: vi.fn(() => ({ reverse: vi.fn(() => ({ toArray: toArrayMock })) })),
      add: vi.fn(),
      bulkAdd: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { useContentStore } = await import('./content-store');

describe('useContentStore recycle bin', () => {
  const item = {
    id: 'content-1',
    title: 'Keep me',
    text: 'Keep me',
    type: 'sentence' as const,
    tags: [],
    source: 'imported' as const,
    createdAt: 1,
    updatedAt: 1,
  };

  beforeEach(() => {
    updateMock.mockReset();
    useContentStore.setState({ items: [item], isLoaded: true, loading: false });
  });

  it('moves deleted content to the recycle bin and restores it', async () => {
    await useContentStore.getState().deleteContent(item.id);

    expect(updateMock).toHaveBeenCalledWith(item.id, expect.objectContaining({ deletedAt: expect.any(Number) }));
    expect(useContentStore.getState().items[0].deletedAt).toEqual(expect.any(Number));

    await useContentStore.getState().restoreContent(item.id);

    expect(updateMock).toHaveBeenLastCalledWith(item.id, expect.objectContaining({ deletedAt: undefined }));
    expect(useContentStore.getState().items[0].deletedAt).toBeUndefined();
  });
});
