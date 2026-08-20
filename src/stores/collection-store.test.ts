import { beforeEach, describe, expect, it, vi } from 'vitest';

const toArrayMock = vi.fn();
const getCollectionMock = vi.fn();
const bulkGetCollectionsMock = vi.fn();
const putCollectionMock = vi.fn();
const bulkAddContentsMock = vi.fn();
const anyOfMock = vi.fn(() => ({
  toArray: itemsToArrayMock,
}));
const itemsToArrayMock = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    collections: {
      add: putCollectionMock,
      bulkGet: bulkGetCollectionsMock,
      get: getCollectionMock,
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: toArrayMock,
        })),
      })),
      put: putCollectionMock,
    },
    contents: {
      bulkAdd: bulkAddContentsMock,
      where: vi.fn(() => ({
        anyOf: anyOfMock,
      })),
    },
  },
}));

const { useCollectionStore } = await import('./collection-store');

describe('useCollectionStore', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    toArrayMock.mockReset();
    getCollectionMock.mockReset();
    bulkGetCollectionsMock.mockReset();
    putCollectionMock.mockReset();
    bulkAddContentsMock.mockReset();
    itemsToArrayMock.mockReset();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });
    useCollectionStore.setState({ collections: [], loading: false, seeded: false });
  });

  it('clears loading when collection loading fails', async () => {
    toArrayMock.mockRejectedValue(new Error('IndexedDB unavailable'));

    await expect(useCollectionStore.getState().loadCollections()).rejects.toThrow('IndexedDB unavailable');

    expect(useCollectionStore.getState().loading).toBe(false);
  });

  it('loads collection items by id when the in-memory collection list is empty', async () => {
    getCollectionMock.mockResolvedValue({
      id: 'taking-taxi',
      itemIds: ['second', 'first'],
    });
    itemsToArrayMock.mockResolvedValue([
      { id: 'first', text: 'First item' },
      { id: 'second', text: 'Second item' },
    ]);

    const items = await useCollectionStore.getState().getCollectionItems('taking-taxi');

    expect(getCollectionMock).toHaveBeenCalledWith('taking-taxi');
    expect(anyOfMock).toHaveBeenCalledWith(['second', 'first']);
    expect(items.map((item) => item.id)).toEqual(['second', 'first']);
  });

  it('updates collection item order durably', async () => {
    const collection = { id: 'travel', itemIds: ['one', 'two'], updatedAt: 1 };
    useCollectionStore.setState({ collections: [collection as never] });

    await useCollectionStore.getState().updateCollection('travel', { itemIds: ['two', 'one'] });

    expect(putCollectionMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'travel', itemIds: ['two', 'one'] }));
    expect(useCollectionStore.getState().collections[0].itemIds).toEqual(['two', 'one']);
  });

  it('seeds missing builtin collections even when the old seed marker exists', async () => {
    storage.set('echotype_collections_seeded_v1', '1');
    bulkGetCollectionsMock.mockResolvedValue([]);
    bulkAddContentsMock.mockResolvedValue(undefined);
    putCollectionMock.mockResolvedValue(undefined);

    await useCollectionStore.getState().seedBuiltinCollections();

    expect(bulkGetCollectionsMock).toHaveBeenCalled();
    expect(putCollectionMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'asking-directions' }));
    expect(storage.get('echotype_collections_seeded_v1')).toBe('1');
    expect(useCollectionStore.getState().seeded).toBe(true);
  });
});
