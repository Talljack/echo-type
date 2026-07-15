import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const savePhrase = vi.fn();
const state = {
  journals: [],
  loading: false,
  savePhrase,
  updatePhrase: vi.fn(),
  deletePhrase: vi.fn(),
  toggleHighlight: vi.fn(),
  materializePhraseForPractice: vi.fn(),
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/stores/journal-store', () => ({
  flattenJournalPhrases: () => [
    {
      journalId: 'legacy-journal',
      turnId: 'turn-1',
      text: "It's taken.",
      translation: '有人了。',
      context: 'At a cafe',
      sourceTitle: 'Coffee lesson',
      tags: ['cafe'],
      updatedAt: 1,
    },
  ],
  useJournalStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

import { JournalList } from './journal-list';

describe('Useful Phrases page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders legacy turns as flat phrase rows and removes notebook controls', () => {
    const markup = renderToStaticMarkup(<JournalList />);
    expect(markup).toContain('Useful Phrases');
    expect(markup).toContain('It&#x27;s taken.');
    expect(markup).toContain('有人了。');
    expect(markup).toContain('#cafe');
    expect(markup).not.toContain('Create notebook');
    expect(markup).not.toContain('Import');
  });

  it('keeps the composer compact while exposing searchable phrase controls', () => {
    const markup = renderToStaticMarkup(<JournalList />);
    expect(markup).toContain('aria-label="English phrase"');
    expect(markup).toContain('Add details');
    expect(markup).toContain('aria-label="Search phrases"');
    expect(markup).toContain('aria-label="Filter by tag"');
    expect(markup).not.toContain('aria-label="Translation"');
  });

  it('provides accessible phrase and practice actions', () => {
    const markup = renderToStaticMarkup(<JournalList />);
    expect(markup).toContain('aria-label="Play It&#x27;s taken."');
    expect(markup).toContain('aria-label="Add It&#x27;s taken. to favorites"');
    expect(markup).toContain('aria-label="Edit It&#x27;s taken."');
    expect(markup).toContain('aria-label="Delete It&#x27;s taken."');
    for (const module of ['Listen', 'Speak', 'Read', 'Write']) expect(markup).toContain(`>${module}</button>`);
  });
});
