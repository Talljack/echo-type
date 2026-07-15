import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { db } from '@/lib/db';
import { normalizeText } from '@/lib/text-normalize';
import type { ContentItem } from '@/types/content';
import type { FavoriteType } from '@/types/favorite';
import type { DialogueTurn, JournalEntry, UsefulPhrase } from '@/types/journal';
import { useFavoriteStore } from './favorite-store';

/** Dexie `contents.category` value used for a journal's materialized practice items. */
export function journalContentCategory(journalId: string): string {
  return `journal:${journalId}`;
}

export function journalPhraseContentCategory(journalId: string, turnId: string): string {
  return `${journalContentCategory(journalId)}:${turnId}`;
}

export function flattenJournalPhrases(journals: JournalEntry[]): UsefulPhrase[] {
  return journals
    .flatMap((journal) =>
      journal.turns.map((turn) => ({
        journalId: journal.id,
        turnId: turn.id,
        text: turn.text,
        translation: turn.translation,
        context: turn.speaker,
        sourceTitle: journal.title,
        sourceTopic: journal.topic,
        tags: turn.tags ?? journal.tags,
        highlighted: turn.highlighted ?? false,
        favoriteId: turn.favoriteId,
        updatedAt: journal.updatedAt,
      })),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Local YYYY-MM-DD for "today", used as the default notebook date. */
function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Rough heuristic to bucket a highlighted turn into a favorite type. */
function classifyFavoriteType(text: string): FavoriteType {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 1) return 'word';
  if (wordCount >= 6 || /[.!?]$/.test(trimmed)) return 'sentence';
  return 'phrase';
}

interface JournalStore {
  journals: JournalEntry[];
  loading: boolean;
  loaded: boolean;

  loadJournals: (force?: boolean) => Promise<void>;
  getJournalById: (id: string) => JournalEntry | undefined;
  addJournal: (input: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<string>;
  updateJournal: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;

  addTurn: (journalId: string, turn: { speaker?: string; text: string; translation?: string }) => Promise<void>;
  updateTurn: (journalId: string, turnId: string, updates: Partial<DialogueTurn>) => Promise<void>;
  removeTurn: (journalId: string, turnId: string) => Promise<void>;
  toggleHighlight: (journalId: string, turnId: string) => Promise<void>;

  savePhrase: (input: {
    text: string;
    translation?: string;
    context?: string;
    tags?: string[];
  }) => Promise<{ journalId: string; turnId: string; created: boolean }>;
  updatePhrase: (
    journalId: string,
    turnId: string,
    updates: { text?: string; translation?: string; context?: string; tags?: string[] },
  ) => Promise<void>;
  deletePhrase: (journalId: string, turnId: string) => Promise<void>;
  materializePhraseForPractice: (journalId: string, turnId: string) => Promise<string | undefined>;

  /** Materialize the journal's lines into practice ContentItems (idempotent). */
  materializeForPractice: (journalId: string) => Promise<void>;
}

/** Persist a mutated journal to Dexie and patch it into store state. */
async function persistJournal(set: (fn: (s: JournalStore) => Partial<JournalStore>) => void, journal: JournalEntry) {
  const next = { ...journal, updatedAt: Date.now() };
  await db.journals.put(next);
  set((state) => ({ journals: state.journals.map((j) => (j.id === next.id ? next : j)) }));
}

async function cleanupJournalArtifacts(journal: JournalEntry | undefined, journalId: string) {
  if (journal) {
    const { removeFavorite } = useFavoriteStore.getState();
    await Promise.all(journal.turns.filter((t) => t.favoriteId).map((t) => removeFavorite(t.favoriteId as string)));
  } else {
    const linkedFavorites = await db.favorites.where('sourceContentId').equals(journalId).toArray();
    const { removeFavorite } = useFavoriteStore.getState();
    await Promise.all(linkedFavorites.map((favorite) => removeFavorite(favorite.id)));
  }

  await db.contents.where('category').equals(journalContentCategory(journalId)).delete();
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  journals: [],
  loading: false,
  loaded: false,

  loadJournals: async (force?: boolean) => {
    if (!force && get().loaded) return;
    set({ loading: true });
    try {
      const journals = (await db.journals.orderBy('updatedAt').reverse().toArray()).filter(
        (journal) => !journal.deletedAt,
      );
      set({ journals, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  getJournalById: (id) => get().journals.find((j) => j.id === id),

  addJournal: async (input) => {
    const now = Date.now();
    const journal: JournalEntry = {
      id: nanoid(),
      title: input.title?.trim() || 'Untitled notebook',
      topic: input.topic,
      tags: input.tags ?? [],
      lessonDate: input.lessonDate || todayDateKey(),
      source: input.source ?? 'manual',
      turns: input.turns ?? [],
      notes: input.notes,
      contentIds: input.contentIds,
      createdAt: now,
      updatedAt: now,
    };
    await db.journals.add(journal);
    set((state) => ({ journals: [journal, ...state.journals], loaded: true }));
    return journal.id;
  },

  updateJournal: async (id, updates) => {
    const journal = get().journals.find((j) => j.id === id);
    if (!journal) return;
    await persistJournal(set, { ...journal, ...updates });
  },

  deleteJournal: async (id) => {
    const journal = get().journals.find((j) => j.id === id);
    await cleanupJournalArtifacts(journal, id);
    if (journal) {
      await db.journals.put({ ...journal, deletedAt: Date.now(), turns: [], contentIds: [] });
    } else {
      await db.journals.delete(id);
    }
    set((state) => ({ journals: state.journals.filter((j) => j.id !== id) }));
  },

  addTurn: async (journalId, turn) => {
    const journal = get().journals.find((j) => j.id === journalId);
    if (!journal) return;
    const newTurn: DialogueTurn = {
      id: nanoid(),
      speaker: turn.speaker?.trim() || undefined,
      text: turn.text,
      translation: turn.translation,
    };
    await persistJournal(set, { ...journal, turns: [...journal.turns, newTurn] });
  },

  updateTurn: async (journalId, turnId, updates) => {
    const journal = get().journals.find((j) => j.id === journalId);
    if (!journal) return;
    const turns = journal.turns.map((t) => (t.id === turnId ? { ...t, ...updates } : t));
    await persistJournal(set, { ...journal, turns });
  },

  removeTurn: async (journalId, turnId) => {
    const journal = get().journals.find((j) => j.id === journalId);
    if (!journal) return;
    const turn = journal.turns.find((t) => t.id === turnId);
    if (turn?.favoriteId) {
      await useFavoriteStore.getState().removeFavorite(turn.favoriteId);
    }
    await persistJournal(set, { ...journal, turns: journal.turns.filter((t) => t.id !== turnId) });
  },

  toggleHighlight: async (journalId, turnId) => {
    const journal = get().journals.find((j) => j.id === journalId);
    if (!journal) return;
    const turn = journal.turns.find((t) => t.id === turnId);
    if (!turn) return;

    const favoriteStore = useFavoriteStore.getState();

    if (turn.highlighted && turn.favoriteId) {
      // Un-highlight: drop the favorite.
      await favoriteStore.removeFavorite(turn.favoriteId);
      const turns = journal.turns.map((t) =>
        t.id === turnId ? { ...t, highlighted: false, favoriteId: undefined } : t,
      );
      await persistJournal(set, { ...journal, turns });
      return;
    }

    // Highlight: push into Favorites so it enters the FSRS review queue.
    const favoriteId = await favoriteStore.addFavorite({
      text: turn.text,
      translation: turn.translation ?? '',
      type: classifyFavoriteType(turn.text),
      folderId: 'default',
      sourceModule: 'journal',
      sourceContentId: journalId,
      context: journal.title,
      targetLang: 'zh-CN',
    });
    const turns = journal.turns.map((t) => (t.id === turnId ? { ...t, highlighted: true, favoriteId } : t));
    await persistJournal(set, { ...journal, turns });
  },

  savePhrase: async ({ text, translation, context, tags }) => {
    const normalized = normalizeText(text);
    const existing = flattenJournalPhrases(get().journals).find((phrase) => normalizeText(phrase.text) === normalized);
    if (existing) {
      await get().updatePhrase(existing.journalId, existing.turnId, { translation, context, tags });
      return { journalId: existing.journalId, turnId: existing.turnId, created: false };
    }

    const now = Date.now();
    let journal = get().journals.find((entry) => entry.id === 'useful-phrases');
    const turn: DialogueTurn = {
      id: nanoid(),
      text: text.trim(),
      translation: translation?.trim() || undefined,
      speaker: context?.trim() || undefined,
      tags: tags ?? [],
    };
    if (journal) {
      journal = { ...journal, turns: [...journal.turns, turn] };
      await persistJournal(set, journal);
    } else {
      journal = {
        id: 'useful-phrases',
        title: 'Useful Phrases',
        tags: [],
        lessonDate: todayDateKey(),
        source: 'manual',
        turns: [turn],
        createdAt: now,
        updatedAt: now,
      };
      await db.journals.put(journal);
      set((state) => ({ journals: [journal as JournalEntry, ...state.journals], loaded: true }));
    }
    return { journalId: journal.id, turnId: turn.id, created: true };
  },

  updatePhrase: async (journalId, turnId, updates) => {
    const journal = get().journals.find((entry) => entry.id === journalId);
    if (!journal) return;
    const turns = journal.turns.map((turn) =>
      turn.id === turnId
        ? {
            ...turn,
            ...(updates.text === undefined ? {} : { text: updates.text.trim() }),
            ...(updates.translation === undefined ? {} : { translation: updates.translation.trim() || undefined }),
            ...(updates.context === undefined ? {} : { speaker: updates.context.trim() || undefined }),
            ...(updates.tags === undefined ? {} : { tags: [...new Set(updates.tags)] }),
          }
        : turn,
    );
    await persistJournal(set, {
      ...journal,
      turns,
      tags: journal.tags,
    });
    const category = journalPhraseContentCategory(journalId, turnId);
    if ((await db.contents.where('category').equals(category).toArray()).length) {
      await get().materializePhraseForPractice(journalId, turnId);
    }
  },

  deletePhrase: async (journalId, turnId) => {
    const journal = get().journals.find((entry) => entry.id === journalId);
    if (!journal) return;
    const turn = journal.turns.find((entry) => entry.id === turnId);
    if (turn?.favoriteId) await useFavoriteStore.getState().removeFavorite(turn.favoriteId);
    const category = journalPhraseContentCategory(journalId, turnId);
    const materialized = await db.contents.where('category').equals(category).toArray();
    await db.contents.where('category').equals(category).delete();
    await persistJournal(set, {
      ...journal,
      turns: journal.turns.filter((entry) => entry.id !== turnId),
      contentIds: journal.contentIds?.filter((id) => !materialized.some((content) => content.id === id)),
    });
  },

  materializePhraseForPractice: async (journalId, turnId) => {
    const journal = get().journals.find((entry) => entry.id === journalId);
    const turn = journal?.turns.find((entry) => entry.id === turnId);
    if (!journal || !turn?.text.trim()) return;
    const category = journalPhraseContentCategory(journalId, turnId);
    const previous = await db.contents.where('category').equals(category).toArray();
    await db.contents.where('category').equals(category).delete();
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: turn.text,
      text: turn.text,
      type: classifyFavoriteType(turn.text),
      category,
      tags: turn.tags ?? journal.tags,
      source: 'imported',
      createdAt: now,
      updatedAt: now,
    };
    await db.contents.bulkAdd([item]);
    await persistJournal(set, {
      ...journal,
      contentIds: [
        ...(journal.contentIds ?? []).filter((id) => !previous.some((content) => content.id === id)),
        item.id,
      ],
    });
    return item.id;
  },

  materializeForPractice: async (journalId) => {
    const journal = get().journals.find((j) => j.id === journalId);
    if (!journal) return;
    const category = journalContentCategory(journalId);
    // Rebuild from scratch so edited/removed lines are reflected.
    await db.contents.where('category').equals(category).delete();
    const now = Date.now();
    const items: ContentItem[] = journal.turns
      .filter((t) => t.text.trim())
      .map((t) => ({
        id: nanoid(),
        title: t.text,
        text: t.text,
        type: classifyFavoriteType(t.text),
        category,
        tags: journal.tags,
        source: 'imported' as const,
        createdAt: now,
        updatedAt: now,
      }));
    if (items.length > 0) await db.contents.bulkAdd(items);
    await persistJournal(set, { ...journal, contentIds: items.map((i) => i.id) });
  },
}));
