# Useful Phrases Design

## Goal

Replace the Practice Notebook product surface with a focused Useful Phrases library for recording expressions such as `It's taken.`, while preserving all existing journal data, cloud sync, favorites, and practice capabilities.

## Product Scope

- Rename the navigation and page to `Useful Phrases / 常用短语`.
- Present individual phrases instead of notebooks or dialogue collections.
- Support manual entry and saving selected page text.
- Preserve existing journal entries by projecting every existing dialogue turn as a phrase.
- Keep text-to-speech, editing, deletion, favorites, search, tags, and Listen/Speak/Read/Write practice.
- Remove the Speak action that saves a whole conversation to Practice Notebook.

Notebook creation, whole-notebook import, date grouping, speaker-oriented dialogue editing, and notebook notes are removed from the primary experience.

## Data Strategy

Reuse the existing `journals` table and sync pipeline. No Dexie or Supabase schema migration is needed.

The UI builds a flat phrase projection from all non-deleted journals and their turns. Each projected phrase retains its journal ID, turn ID, source notebook title, translation, highlight/favorite state, and tags. Existing notebook titles become optional source/context labels rather than visible hierarchy.

New manually saved phrases are written to one internal journal identified by a stable marker. The marker is an implementation detail and is never shown as a notebook. Saving selected text uses the same store action.

Phrase matching uses the existing text normalization pattern. If normalized text already exists, saving updates the existing translation when supplied, refreshes its update time, and returns the existing phrase identity instead of creating a duplicate.

Deleting an existing phrase removes only its turn. Empty legacy journals remain as sync-compatible containers. Existing materialized `journal:{id}` content is rebuilt or removed after phrase edits and deletes so practice modules do not retain stale text.

## User Experience

The `/journal` route remains for URL and sync compatibility but renders the Useful Phrases experience.

The page contains:

1. A compact header with the product name and search.
2. A quick-add row with the English phrase and an Add button.
3. Optional expanded fields for translation, usage context, and tags.
4. A recently updated flat list with tag filtering.

Each phrase row shows the phrase, translation when available, source/context, and tags. Row actions provide play, favorite, edit, delete, and practice. Familiar Lucide icons are used with accessible labels and tooltips.

The global selection translation popup gains a Save to Useful Phrases action. It saves the selected English text plus the available translation and reports whether the phrase was added or already existed.

The old `/journal/[id]` route is retained only for old links. It redirects to `/journal`; notebook detail is no longer a primary surface.

## Store Changes

Extend the journal store with minimal phrase-oriented operations:

- flatten journals into phrase records through a pure selector;
- save or update a phrase by normalized text;
- update one phrase while retaining its journal/turn identity;
- delete one phrase and clean its linked favorite/materialized content;
- materialize selected or grouped phrases for the existing practice routes.

Existing journal actions remain where sync and legacy data require them, but new UI code uses the phrase-oriented operations.

## Localization

Update English and Chinese sidebar, journal, selection popup, empty state, confirmation, and action copy. User-visible Practice Notebook, Journal, and 练习本 terminology is removed from the active feature.

## Testing

Use test-first coverage for:

- flattening legacy journals without losing phrase metadata;
- manual save and normalized duplicate handling;
- phrase edit/delete cleanup and favorite linkage;
- selection popup saving text and translation;
- old detail-route compatibility;
- existing sync mapper compatibility;
- materialized practice content after edits and deletes.

Run focused tests, full typecheck, lint, production build, and the full test suite. Browser verification must cover desktop and narrow mobile widths: manual add, duplicate save, selection save, search, edit, favorite, delete, and practice navigation. Confirm the sidebar label and all active copy use Useful Phrases / 常用短语.
