# Tag System — Design Document

> Date: 2026-03-01
> Status: Draft

## Overview

EchoType's `ContentItem` already has a `tags: string[]` field, and import UIs already let users enter tags. However, tags are **never displayed, never filtered, never searched**. This plan completes the tag system by adding the "read" side: display, filter, search, and lightweight management.

## Current State Analysis

| Aspect | Status | Details |
|--------|--------|---------|
| Type definition | ✅ Exists | `tags: string[]` on `ContentItem` |
| DB storage | ✅ Stored | Not indexed (no `*tags` in Dexie schema) |
| User input (import) | ✅ Works | TextImport, MediaImport have comma-separated tag input |
| Seed data | ✅ Rich | Built-in content uses tags like `motivation`, `daily`, `business`, `idiom` |
| Display in Library | ❌ Missing | Only `category` and `difficulty` shown as badges |
| Filter by tags | ❌ Missing | `getFilteredItems` only checks `type`, `difficulty`, `search` |
| Search includes tags | ❌ Missing | Search only checks `title` and `text` |
| Tag management | ❌ Missing | No way to edit/remove tags after creation |

**Verdict**: Tags are a ghost feature — write side exists, read side is completely absent. Completing it is low-risk, high-value.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tag display | Inline badges on content rows | Minimal UI change, consistent with existing `category`/`difficulty` badges |
| Tag filter | Clickable tag cloud above content list | More discoverable than a dropdown; shows available tags at a glance |
| Tag search | Include tags in existing text search | No new UI needed; searching "business" finds items tagged "business" |
| Tag editing | Inline edit on content detail (future) | MVP ships display + filter first; editing is Phase 2 |
| Dexie index | Add `*tags` multi-entry index | Enables `db.contents.where('tags').equals('x')` queries |
| Max tags per item | Soft limit of 10 | Prevents UI overflow; enforced in import UIs |
| Tag normalization | Lowercase, trimmed, deduped | Consistent matching; applied on save |

## Interaction Flow

```
Library Page:
  ┌─────────────────────────────────────────────┐
  │ [Search: _______________]                    │
  │                                              │
  │ All Levels | Beginner | Intermediate | Adv   │
  │                                              │
  │ Tags: [daily] [business] [motivation] [+3]   │  ← NEW: Tag cloud
  │       Selected: [business ✕]                 │  ← Active filter
  │                                              │
  │ ▼ Articles (12)                              │
  │   ┌──────────────────────────────────────┐   │
  │   │ Business Email Writing               │   │
  │   │ intermediate · Business              │   │
  │   │ [business] [writing] [email]    🎧🎤✍│   │  ← NEW: Tag badges
  │   └──────────────────────────────────────┘   │
  └─────────────────────────────────────────────┘
```

### Tag Cloud Behavior

1. **Populate**: Scan all (filtered) items → collect unique tags → sort by frequency
2. **Display**: Show top 8 tags as clickable `Badge` components; "+N more" expands to show all
3. **Select**: Click a tag → adds to active tag filter → content list updates immediately
4. **Deselect**: Click active tag (with ✕) → removes from filter
5. **Multi-select**: Multiple tags = AND logic (items must have ALL selected tags)
6. **Responsive**: Tags wrap on smaller screens; collapse to dropdown on mobile

### Tag Badges on Content Rows

- Show up to 3 tags per row as small outline badges
- If >3 tags, show "+N" indicator
- Color: `border-slate-200 text-slate-500 text-xs` (subtle, doesn't compete with category/difficulty)
- Position: Below the text preview line

## State Management

### `content-store.ts` — Filter Extension

```typescript
filter: {
  type?: ContentType;
  difficulty?: Difficulty;
  search: string;
  tags?: string[];        // NEW: selected tag filters
}
```

### `getFilteredItems` Update

```typescript
getFilteredItems: () => {
  const { items, filter } = get();
  return items.filter((item) => {
    if (filter.type && item.type !== filter.type) return false;
    if (filter.difficulty && item.difficulty !== filter.difficulty) return false;
    // NEW: Tag filter (AND logic)
    if (filter.tags?.length) {
      if (!filter.tags.every((t) => item.tags.includes(t))) return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))  // NEW: search tags
      );
    }
    return true;
  });
}
```

### New Helper: `getAllTags`

```typescript
getAllTags: () => {
  const { items } = get();
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}
```

## Database Change

### Dexie Schema v4

```typescript
this.version(4).stores({
  contents: 'id, type, category, source, difficulty, createdAt, *tags',
  records: 'id, contentId, module, lastPracticed, nextReview',
  sessions: 'id, contentId, module, startTime, completed',
});
```

The `*tags` multi-entry index allows efficient queries like `db.contents.where('tags').equals('business')`.

## Component Changes

### 1. NEW: `TagCloud` component (`src/components/shared/tag-cloud.tsx`)

```
Props:
  tags: { tag: string; count: number }[]
  selectedTags: string[]
  onToggle: (tag: string) => void
  maxVisible?: number  // default: 8
```

- Renders tags as clickable `Badge` components
- Selected tags get filled style (`bg-indigo-100 text-indigo-700`)
- Unselected tags get outline style (`border-slate-200 text-slate-500`)
- Shows count in parentheses: `business (12)`
- "+N more" button expands to show all

### 2. Library Page (`src/app/(app)/library/page.tsx`)

- Import `TagCloud` component
- Add `tagFilter` local state (synced to store via `setFilter`)
- Render `TagCloud` between difficulty filter and content accordion
- Pass `getAllTags()` result to `TagCloud`

### 3. ContentRow (`src/app/(app)/library/page.tsx`)

- Show up to 3 tag badges below the text preview
- Style: small, subtle outline badges
- Position: new row after `<p className="text-sm text-indigo-500 truncate">`

### 4. ContentList (`src/components/shared/content-list.tsx`)

- Add tag badges to each content item (same pattern as Library)
- Optional: Add simplified tag filter if space allows

### 5. Import UIs — Tag Normalization

All import components that accept tags should normalize on save:

```typescript
const normalizeTags = (input: string): string[] =>
  [...new Set(
    input.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
  )].slice(0, 10);
```

Apply in: `TextImport`, `MediaImportTab`, `YoutubeImport`, `PdfImport`

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db.ts` | Schema v4: add `*tags` index |
| `src/stores/content-store.ts` | Add `tags` to filter, update `getFilteredItems`, add `getAllTags` |
| `src/components/shared/tag-cloud.tsx` | NEW component |
| `src/app/(app)/library/page.tsx` | Add TagCloud, add tag badges to ContentRow |
| `src/components/shared/content-list.tsx` | Add tag badges to items |
| `src/components/import/text-import.tsx` | Tag normalization |
| `src/components/import/youtube-import.tsx` | Tag normalization |
| `src/components/import/pdf-import.tsx` | Tag normalization |
| `src/app/(app)/tools/page.tsx` | Tag normalization in MediaImportTab |

## Edge Cases

| Case | Behavior |
|------|----------|
| Item has no tags | No badges shown; item still visible (tag filter is additive) |
| Tag filter active + no matches | Empty state: "No content matches selected tags" |
| Very long tag name | Truncate at 30 chars in badge display |
| Duplicate tags on import | Deduplicated by `normalizeTags` |
| Tag with special characters | Preserved as-is (no sanitization needed for IndexedDB) |
| 100+ unique tags in library | TagCloud shows top 8 by frequency; "+N more" expands |

## Future Enhancements (Phase 2)

1. **Tag editing**: Edit tags on existing content from Library detail view
2. **Tag suggestions**: AI-suggested tags based on content analysis
3. **Tag management page**: Rename/merge/delete tags globally
4. **Tag-based recommendations**: Use tags in the recommendation engine
5. **Color-coded tags**: User-assignable colors for visual grouping
