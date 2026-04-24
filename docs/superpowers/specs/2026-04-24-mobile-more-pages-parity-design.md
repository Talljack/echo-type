# Mobile More Pages Parity Design

Date: 2026-04-24
Branch: `feat/mobile-more-parity`
Status: Draft approved for spec review

## Goal

Align the mobile pages reachable from the `More` tab with the web app's functionality, information hierarchy, and key interaction order.

In scope:
- `Analytics`
- `Library`
- `Favorites`
- `Wordbooks`
- `AI Tutor`
- `Review`
- `Settings`

Out of scope:
- Rebuilding the `More` tab information architecture
- Introducing a new shared page framework or global secondary-page skeleton
- Reorganizing mobile routing to mirror web route hierarchy
- Broad unrelated refactors outside parity work

## Fixed Constraints

The implementation must follow these constraints:

1. Keep the current mobile page shells and route structure.
2. Do not invent a new shared page framework for this project.
3. Focus on parity of:
   - functionality
   - information hierarchy
   - key interaction order
4. Mobile may adapt touch targets and layout for phone usage, but may not silently remove web capabilities that matter to page behavior.
5. Shared extraction is allowed only when it reduces duplication during implementation and lowers delivery risk; it is not a project goal by itself.

## Parity Standard

Each target page should match the web app at this level:

- Core features are present and usable.
- Primary sections appear in roughly the same priority order as web.
- Main CTA semantics and state transitions are preserved.
- Loading, empty, error, and retry states are explicit where web has meaningful states.
- Mobile-specific layout adaptation is allowed, but not feature simplification by default.

The project does not require route-level or IA-level cloning of web. For example:
- `AI Tutor` may remain a full-screen page on mobile even though web uses a global chat panel.
- `Wordbooks` may remain a dedicated mobile page even though web nests it under `Library`.

## Current Assessment

### More Entry Page

`mobile/app/(tabs)/more.tsx` is already a valid mobile entry surface. It exposes the right destination pages and does not need structural redesign for this parity project.

The parity work therefore starts at the seven destination pages, not the `More` page itself.

### Destination Page Status Summary

- `Analytics`: partially aligned; mobile has useful stats and some forecast logic, but not the full web analytics structure.
- `Library`: functionally strong, but still behind web in grouping depth, filtering breadth, and management actions.
- `Favorites`: mobile already has a real page, but needs clearer parity with web list/review semantics and information order.
- `Wordbooks`: largest gap; mobile currently presents a simplified catalog rather than a web-equivalent wordbook experience.
- `AI Tutor`: mobile has working full-screen chat, but still needs parity with web chat panel capability and guidance patterns.
- `Review`: mobile is already capable, but needs closer alignment with web's today-review framing and top-level summary.
- `Settings`: mobile has many core sections already, but still needs a parity pass against web section order and critical advanced controls.

## Page-by-Page Design

### 1. Analytics

Mobile currently includes summary cards and several analytics elements, but it does not yet map cleanly to the web analytics page.

Target parity:
- Match the web analytics page's primary structure:
  - top summary stats
  - activity heatmap
  - accuracy trend
  - WPM trend
  - daily sessions
  - module breakdown
  - vocabulary growth
  - review forecast
- Keep mobile-friendly chart sizing and stacking.
- Add explicit loading, error, and empty handling where data is missing or incomplete.

Implementation intent:
- Reorder or extend the current analytics screen rather than creating a new analytics architecture.
- Prefer reusing existing data derivations where possible before introducing new ones.

### 2. Library

Mobile library is already one of the stronger pages, but it still trails web in management depth.

Target parity:
- Preserve the current mobile library page.
- Bring its filtering and organization closer to web, including:
  - stronger tab/group coverage
  - clearer wordbook-related grouping
  - media-only or source-aware views where web exposes them
  - richer batch/select mode
  - stronger tag editing and content actions
- Keep search and import entry points first-class.

Implementation intent:
- Extend existing view tabs, filters, sections, and card actions.
- Avoid turning the page into a dense desktop clone; use progressive disclosure on mobile.

### 3. Favorites

Mobile already has an actual favorites page with folders, search, expansion, and grading. The remaining work is mostly parity refinement rather than first-time implementation.

Target parity:
- Align the page with web's `favorites list + favorites review` relationship.
- Strengthen the top-of-page summary and review CTA semantics.
- Keep folder chips, search, and expandable detail, but ensure the order mirrors web priorities:
  - page summary
  - review entry point
  - filtering/search
  - item list
  - empty states
- Keep review scheduling and grade interactions visible and understandable.

Implementation intent:
- Improve parity at the page-structure level first.
- Reuse the existing review route rather than inventing a second review path.

### 4. Wordbooks

This is the clearest gap versus web.

Target parity:
- Expand the current mobile wordbooks page to better match web:
  - vocabulary/scenario distinction
  - clearer filter model
  - import/remove state
  - stronger relationship to library inventory
  - detail drill-in parity
- Make the page feel like a real acquisition and management surface, not just a browse list.

Implementation intent:
- Keep the current dedicated mobile page.
- Add the missing product semantics from the web wordbooks flow rather than relocating the feature under library routing.

### 5. AI Tutor

Mobile chat already supports conversations, starters, streaming, and tool status updates. The gap is in capability parity and guidance parity relative to the web chat panel.

Target parity:
- Preserve full-screen mobile chat.
- Align with web on:
  - provider/setup notices
  - contextual assistant behavior
  - tool-driven responses
  - conversation management
  - clearer state/error handling
  - stronger relation to library/content context where web already supports it

Implementation intent:
- Improve the existing list/detail chat screens.
- Keep the mobile-first full-screen form factor, but make the capability surface closer to the web chat panel.

### 6. Review

Mobile review already has a unified queue and filters, which is directionally strong. The gap is mostly parity with the web's framing and hierarchy around daily review.

Target parity:
- Align with web's `today review` semantics:
  - top summary and plan framing
  - progress sense
  - queue emphasis
  - completion state
  - next-step CTAs
- Preserve the useful mobile filters (`today / all / favorites / content`) unless they directly conflict with parity.

Implementation intent:
- Keep the current review engine and queue model.
- Adjust the surrounding page structure and copy hierarchy to feel closer to the web experience.

### 7. Settings

Mobile settings has advanced significantly and already includes AI, language, translation, TTS, sync, reminders, and data management. It still needs a parity audit against the web settings surface.

Target parity:
- Reconcile section order and grouping with web where practical.
- Verify parity for critical areas:
  - AI provider configuration
  - model selection and guidance
  - language preferences
  - translation preferences
  - TTS configuration
  - sync/account state
  - reminders
  - data management
- Add missing status/help/error affordances where web already provides them.

Implementation intent:
- Treat this as a parity completion pass, not a rewrite.
- Only add advanced settings that materially affect real functionality or user control.

## Shared Interaction Rules

These rules apply across all seven pages:

1. Keep the existing mobile page shells.
2. Preserve current mobile navigation patterns unless they block parity.
3. Make stateful sections explicit:
   - loading
   - empty
   - error
   - retry
4. Align button copy and CTA meaning with web wherever possible.
5. Preserve mobile touch usability when adapting web interactions.
6. Do not remove currently working mobile capability unless it conflicts with parity and there is a clear replacement.

## Delivery Sequence

Implementation should proceed in this order:

1. `Wordbooks`
2. `Analytics`
3. `Library`
4. `Favorites`
5. `AI Tutor`
6. `Settings`
7. `Review`

Rationale:
- `Wordbooks`, `Analytics`, and `Library` have the largest parity gaps or the most structural difference from web.
- `Favorites`, `AI Tutor`, `Settings`, and `Review` already have stronger foundations and can be completed in a second wave.

## Verification Strategy

Verification must cover both page entry and page behavior.

Required checks:
- Each `More` menu destination opens correctly.
- Each page's top-level sections appear in the intended order.
- Missing web capabilities added by this project are actually interactive, not just rendered.
- Loading, empty, error, and retry states are exercised where applicable.
- Page-specific functional checks are performed after implementation:
  - `Analytics`: chart/data presence and empty/error handling
  - `Library`: search/filter/sort/sectioning/batch flow
  - `Favorites`: review CTA, folder filter, expand/detail, due state
  - `Wordbooks`: filters, import/remove, detail drill-in, library relation
  - `AI Tutor`: conversation creation, provider notice, streaming/tool state, error handling
  - `Review`: queue filters, completion state, today framing
  - `Settings`: provider/model/language/translation/TTS/sync/data management flows

## Risks

### Scope risk

This is a seven-page parity project. The main risk is turning it into an architecture rewrite. The design avoids that by explicitly forbidding a new shared page framework.

### Hidden capability gaps

Some pages look more complete than they are. `Settings` and `AI Tutor` in particular need implementation-time audit against the web surface, not just visual comparison.

### Over-cloning web

Blindly copying web density would hurt mobile usability. This design therefore targets capability parity and interaction parity, not literal desktop layout parity.

## Implementation Boundaries

Allowed:
- Reordering sections inside existing pages
- Adding missing functionality
- Adding missing state handling
- Refining CTA copy and interaction flow
- Extracting small shared helpers/components only where implementation duplication makes it worthwhile

Not allowed:
- New global page shell project
- `More` IA redesign
- Route-system overhaul to mimic web hierarchy
- Large unrelated refactors

## Success Criteria

This project is successful when:

1. The `More` tab still works as the mobile secondary entry point.
2. All seven destination pages are audited and updated against their web counterparts.
3. The largest feature gaps are closed without rewriting the mobile app structure.
4. Mobile preserves usability while reaching functional parity and comparable interaction order.
5. The result is implementable as one parity project without further decomposition.
