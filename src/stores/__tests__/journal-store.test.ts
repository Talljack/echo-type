import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory tables backing the mocked Dexie.
const journals: any[] = [];
const contents: any[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    journals: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([...journals])),
        })),
      })),
      add: vi.fn((j: any) => {
        journals.push(j);
        return Promise.resolve(j.id);
      }),
      put: vi.fn((j: any) => {
        const idx = journals.findIndex((x) => x.id === j.id);
        if (idx >= 0) journals[idx] = j;
        else journals.push(j);
        return Promise.resolve(j.id);
      }),
      delete: vi.fn((id: string) => {
        const idx = journals.findIndex((x) => x.id === id);
        if (idx >= 0) journals.splice(idx, 1);
        return Promise.resolve();
      }),
    },
    contents: {
      where: vi.fn((field: string) => ({
        equals: vi.fn((value: string) => ({
          delete: vi.fn(() => {
            for (let i = contents.length - 1; i >= 0; i--) {
              if (contents[i][field] === value) contents.splice(i, 1);
            }
            return Promise.resolve();
          }),
          toArray: vi.fn(() => Promise.resolve(contents.filter((c) => c[field] === value))),
        })),
      })),
      bulkAdd: vi.fn((items: any[]) => {
        contents.push(...items);
        return Promise.resolve();
      }),
    },
  },
}));

// Mock the favorite store so highlight toggling can be asserted in isolation.
const addFavorite = vi.fn(() => Promise.resolve('fav-1'));
const removeFavorite = vi.fn(() => Promise.resolve());
vi.mock('../favorite-store', () => ({
  useFavoriteStore: { getState: () => ({ addFavorite, removeFavorite }) },
}));

import { useJournalStore } from '../journal-store';

function resetStore() {
  journals.length = 0;
  contents.length = 0;
  addFavorite.mockClear();
  removeFavorite.mockClear();
  useJournalStore.setState({ journals: [], loading: false, loaded: false });
}

describe('journal-store', () => {
  beforeEach(resetStore);

  it('creates a journal with defaults', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Self-introduction' });
    const journal = useJournalStore.getState().getJournalById(id);
    expect(journal).toBeTruthy();
    expect(journal?.title).toBe('Self-introduction');
    expect(journal?.source).toBe('manual');
    expect(journal?.turns).toEqual([]);
    expect(journal?.lessonDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds, updates, and removes turns', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Lesson' });
    await useJournalStore.getState().addTurn(id, { speaker: 'Teacher', text: 'Tell me about yourself.' });
    let journal = useJournalStore.getState().getJournalById(id);
    expect(journal?.turns).toHaveLength(1);
    const turnId = journal!.turns[0].id;

    await useJournalStore.getState().updateTurn(id, turnId, { translation: '介绍一下你自己。' });
    journal = useJournalStore.getState().getJournalById(id);
    expect(journal?.turns[0].translation).toBe('介绍一下你自己。');

    await useJournalStore.getState().removeTurn(id, turnId);
    journal = useJournalStore.getState().getJournalById(id);
    expect(journal?.turns).toHaveLength(0);
  });

  it('supports a line without any speaker label', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Phrases' });
    await useJournalStore.getState().addTurn(id, { text: 'Nice to meet you.' });
    const turn = useJournalStore.getState().getJournalById(id)!.turns[0];
    expect(turn.speaker).toBeUndefined();
    expect(turn.text).toBe('Nice to meet you.');
  });

  it('toggles a highlight in and out of favorites', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Lesson' });
    await useJournalStore.getState().addTurn(id, { speaker: 'Me', text: 'I specialize in backend systems.' });
    const turnId = useJournalStore.getState().getJournalById(id)!.turns[0].id;

    await useJournalStore.getState().toggleHighlight(id, turnId);
    let turn = useJournalStore.getState().getJournalById(id)!.turns[0];
    expect(addFavorite).toHaveBeenCalledTimes(1);
    expect(turn.highlighted).toBe(true);
    expect(turn.favoriteId).toBe('fav-1');

    await useJournalStore.getState().toggleHighlight(id, turnId);
    turn = useJournalStore.getState().getJournalById(id)!.turns[0];
    expect(removeFavorite).toHaveBeenCalledWith('fav-1');
    expect(turn.highlighted).toBe(false);
    expect(turn.favoriteId).toBeUndefined();
  });

  it('materializes turns into practice contents under journal:{id}', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Lesson', tags: ['intro'] });
    await useJournalStore.getState().addTurn(id, { speaker: 'A', text: 'How are you?' });
    await useJournalStore.getState().addTurn(id, { speaker: 'B', text: 'I am great, thanks.' });

    await useJournalStore.getState().materializeForPractice(id);

    expect(contents).toHaveLength(2);
    expect(contents.every((c) => c.category === `journal:${id}`)).toBe(true);
    const journal = useJournalStore.getState().getJournalById(id);
    expect(journal?.contentIds).toHaveLength(2);

    // Re-materializing rebuilds (no duplicates).
    await useJournalStore.getState().materializeForPractice(id);
    expect(contents).toHaveLength(2);

    // Deleting the journal cleans up its materialized contents.
    await useJournalStore.getState().deleteJournal(id);
    expect(contents).toHaveLength(0);
  });

  it('removes linked favorites when a journal is deleted', async () => {
    const id = await useJournalStore.getState().addJournal({ title: 'Lesson' });
    await useJournalStore.getState().addTurn(id, { speaker: 'Phrase', text: 'Nice to meet you.' });
    const turnId = useJournalStore.getState().getJournalById(id)!.turns[0].id;
    await useJournalStore.getState().toggleHighlight(id, turnId);

    await useJournalStore.getState().deleteJournal(id);
    expect(removeFavorite).toHaveBeenCalledWith('fav-1');
    expect(useJournalStore.getState().getJournalById(id)).toBeUndefined();
    expect(journals.find((journal) => journal.id === id)?.deletedAt).toBeTypeOf('number');
  });
});
