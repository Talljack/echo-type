export type JournalSource = 'manual' | 'uploaded' | 'from-speak' | 'ai-generated';

export interface DialogueTurn {
  id: string;
  /** Optional free-form label: A, B, Me, Teacher, Phrase, etc. */
  speaker?: string;
  text: string;
  translation?: string;
  /** Phrase-specific tags; legacy turns fall back to their journal tags. */
  tags?: string[];
  /** ⭐ Marks a golden sentence / fixed collocation worth reviewing. */
  highlighted?: boolean;
  /** Set after the turn has been pushed into Favorites, so we can toggle it back off. */
  favoriteId?: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  /** Topic label, e.g. "Self-introduction", "Ordering food", "Useful phrases". */
  topic?: string;
  tags: string[];
  /** Notebook date in YYYY-MM-DD format. */
  lessonDate: string;
  source: JournalSource;
  turns: DialogueTurn[];
  /** Free-form notes for this notebook. */
  notes?: string;
  /** ContentItem ids materialized for whole-group practice (Phase 3). */
  contentIds?: string[];
  /** Tombstone timestamp for cross-device delete sync. */
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface UsefulPhrase {
  journalId: string;
  turnId: string;
  text: string;
  translation?: string;
  context?: string;
  sourceTitle: string;
  sourceTopic?: string;
  tags: string[];
  highlighted: boolean;
  favoriteId?: string;
  updatedAt: number;
}
