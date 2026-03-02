# Shadow Reading Mode — Design Document

> Date: 2026-03-01
> Status: Approved

## Overview

Shadow Reading is a language learning technique where learners practice the **same material** across different skill dimensions: **Listen → Read aloud → Write from memory**. This feature adds a global toggle that links content selection across Listen, Read, and Write modules — when a user selects content in one module, it is highlighted in the others for seamless cross-module practice.

## User Problem

Currently, if a user is practicing content A in `/listen/abc123` and wants to continue with writing practice, they must:

1. Click "Write" in the sidebar → lands on `/write` (list view)
2. Search/scroll to find content A in the list
3. Click to enter `/write/abc123`

This 3-step friction breaks the learning flow. Shadow Reading reduces it to: click "Write" → content A is already highlighted → one click to continue.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default state | **Off** | Non-intrusive; users opt-in when they understand the workflow |
| Behavior when switching modules | **Highlight in list, don't auto-jump** | Preserves user agency; they can choose to continue or pick something else |
| Speak module participation | **Topic-based recommendation** | Speak uses Scenario (different data model), so exact linking isn't possible; topic matching provides useful guidance |
| State persistence | `shadowReadingEnabled` persisted to localStorage; `activeContentId` NOT persisted (resets on refresh) | Setting is permanent preference; active content is session-scoped |
| Settings location | New section in Settings page after "Recommendations" | Same UI pattern as other feature toggles |

## Interaction Flow

```
User selects content A in any module
  → Global activeContentId = A
  → Switch to Listen/Read/Write list page:
      ✅ Content A highlighted with visual indicator
      ✅ "Currently practicing" label shown
      ✅ Auto-scroll to highlighted item
      ✅ User can ignore and pick different content
  → Switch to Speak list page:
      ✅ Related scenarios shown based on content A's category/tags
      ✅ "Related to your content" badge on matching scenarios
      ✅ No match → silent degradation (no indicator shown)
  → Shadow Reading OFF:
      ✅ All pages behave exactly as before (zero impact)
```

## Settings UI

New section in Settings page, using existing `Section` + `Toggle` pattern:

- **Section title**: "Shadow Reading" with `Repeat` icon
- **Toggle label**: "Enable Shadow Reading"
- **Description**: "Link content across Listen, Read, and Write modules. When you select content in one module, it will be highlighted in others."
- **Info box** (always visible, helps explain the concept):
  - "Shadow reading is a technique where you practice the same material across skills: Listen → Read aloud → Write. For Speak, related conversation scenarios will be recommended based on your content's topic."

## State Management

### `tts-store.ts` — New field

```typescript
shadowReadingEnabled: boolean; // default: false, persisted to localStorage
setShadowReadingEnabled: (enabled: boolean) => void;
```

### `content-store.ts` — New field

```typescript
activeContentId: string | null; // default: null, NOT persisted
setActiveContentId: (id: string | null) => void;
```

## Component Changes

### ContentList (`src/components/shared/content-list.tsx`)

When `shadowReadingEnabled && activeContentId`:

- Find the matching item in the list
- Render it with highlight styles:
  - Left border: `border-l-3 border-indigo-500`
  - Background: `bg-indigo-50/50`
  - Badge: "Currently practicing"
- Auto-scroll via `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
- List order unchanged; highlight is purely visual

### Detail Pages (`listen/[id]`, `read/[id]`, `write/[id]`)

On mount, if `shadowReadingEnabled`:
```typescript
const { setActiveContentId } = useContentStore();
useEffect(() => {
  if (shadowReadingEnabled) {
    setActiveContentId(params.id as string);
  }
}, [params.id, shadowReadingEnabled]);
```

### Library Page (`library/page.tsx`)

When user clicks any action button (Listen/Speak/Write icons), also call `setActiveContentId(item.id)`.

### Speak Page (`speak/page.tsx`)

When `shadowReadingEnabled && activeContentId`:

1. Fetch the active content item from Dexie
2. Extract `category` and `tags`
3. Match against each Scenario's category/tags
4. Show matching scenarios with "Related to your content" badge
5. Optional: show a tip banner above the grid explaining the recommendation

## Files Changed

| File | Change |
|------|--------|
| `src/stores/tts-store.ts` | Add `shadowReadingEnabled` + setter + persist |
| `src/stores/content-store.ts` | Add `activeContentId` + setter (no persist) |
| `src/app/(app)/settings/page.tsx` | New Shadow Reading section |
| `src/components/shared/content-list.tsx` | Highlight logic + scroll |
| `src/app/(app)/listen/[id]/page.tsx` | `setActiveContentId` on mount |
| `src/app/(app)/read/[id]/page.tsx` | `setActiveContentId` on mount |
| `src/app/(app)/write/[id]/page.tsx` | `setActiveContentId` on mount |
| `src/app/(app)/speak/page.tsx` | Topic-based scenario recommendation |
| `src/app/(app)/library/page.tsx` | `setActiveContentId` on action click |

## Edge Cases

| Case | Behavior |
|------|----------|
| No `activeContentId` set | List pages behave normally, no highlight |
| `activeContentId` item deleted | No match found, no highlight, silent degradation |
| `activeContentId` item not in filtered view | No highlight visible; user can clear filters to find it |
| User refreshes page | `activeContentId` resets to null; next content selection sets it again |
| Shadow Reading toggled off mid-session | All highlights disappear immediately; `activeContentId` retained but unused |
| Speak has no matching scenarios | No recommendation banner shown; page looks normal |
