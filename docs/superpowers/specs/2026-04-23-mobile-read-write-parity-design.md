# Mobile Read Write Parity Design

**Date:** 2026-04-23  
**Status:** Approved in conversation, pending written spec review  
**Scope:** `mobile/app/practice/read/[id].tsx`, `mobile/app/practice/write/[id].tsx`, and supporting mobile-only shared sections/components/hooks

## Goal

Bring the mobile `read` and `write` detail pages to parity with the current web detail pages for:

- core practice workflow
- information hierarchy
- button semantics and labels
- completion and FSRS flow
- translation and recommendation affordances

Mobile may adapt layout, hit targets, and placement for touch and smaller screens, but may not remove web capabilities.

## Parity Standard

This work follows the agreed parity standard:

- match web functionality
- match web information hierarchy
- match web button semantics and interaction order as closely as practical
- allow mobile-specific adaptations only where the desktop interaction is not appropriate for touch

Examples of allowed adaptation:

- web inline or side controls may become bottom floating controls on mobile
- dense desktop toolbars may wrap or split into stacked touch-friendly regions
- hover-only affordances must become explicit mobile buttons

Examples of disallowed divergence:

- replacing a web feature with a simplified mobile-only variant
- hiding translation, completion, or recommendation flows behind unrelated menus
- using different completion semantics between web and mobile

## Chosen Approach

Use **unified page skeleton + shared practice sections**.

### Why this approach

- It preserves parity without turning the task into a full practice-framework rewrite.
- `read` and `write` can share page structure and common async/status patterns while keeping separate engines.
- It reduces duplicated layout logic and keeps future parity work cheaper.

### Explicit non-goals

- Do not build a new generic practice engine.
- Do not merge `read` and `write` state machines.
- Do not refactor unrelated modules.
- Do not change web behavior as part of this work.

## Architecture

Keep the route files as page composition layers:

- `mobile/app/practice/read/[id].tsx`
- `mobile/app/practice/write/[id].tsx`

Extract shared mobile page sections for structure and repeated state rendering:

- `PracticeScreenHeader`
- `PracticeReferenceCard`
- `PracticeTranslationSection`
- `PracticeCompletionSection`
- `PracticeRecommendationSection`

These shared sections own:

- shared top-of-page structure
- consistent section order
- common loading / error / retry affordances
- mobile-safe spacing and touch targets
- parity copy and action placement

These stay module-specific:

- `read`: TTS playback, sentence navigation, speech recording, live word feedback, transcript, pronunciation assessment
- `write`: typing reducer, hidden-input semantics, shake-reset loop, pause/resume overlay, error review loop

## Shared Page Skeleton

Both mobile detail pages should follow the same high-level structure:

1. top header
2. reference text section
3. module-specific control region
4. module-specific active practice surface
5. result / completion sections
6. recommendation section

### Header region

The header must align with web semantics:

- back button
- content title
- cross-module navigation when not in shadow flow
- shadow progress UI when inside a shadow-reading flow

The header may use mobile-safe wrapping, but it must not hide the cross-module affordance behind an extra menu unless there is no viable space.

## Read Page Design

### Target interaction order

1. Header
2. Reference text card
3. Read-aloud controls and floating playback bar when active
4. Recording controls
5. Live feedback while recording
6. Result sections after a valid attempt
7. Finish CTA and FSRS summary
8. Recommendations

### Reference text and translation

Mobile must stop replacing the original text with translation content.

Required behavior:

- original text remains the primary content
- translation toggle matches web semantics
- translated sentences render beneath the original text within the same reference section
- translation supports loading, retry, and error states

### Read-aloud parity

Required behavior:

- button semantics stay `Listen Along` / `Stop`
- active playback highlights progress in the text
- bottom floating bar appears while playback is active
- previous / next sentence controls remain available
- floating bar progress reflects sentence or word progression

### Recording and live feedback parity

Required behavior:

- start recording clears prior result state
- recording shows live progressive word-level feedback
- stop recording enters processing when needed before final results
- explicit speech-error and speech-processing states are visible

### Result parity

Results must match web ordering and coverage:

- stats summary
- pronunciation feedback
- raw transcript

Result calculation must use aligned word results, not index-only approximation.

### Finish flow

- `Finish Reading` stays a distinct CTA
- FSRS summary appears only after a valid completed read result
- completion should not bypass the result sections

## Write Page Design

### Target interaction order

1. Header
2. Stats and actions toolbar
3. Reference text section
4. Typing surface
5. Pause overlay when paused
6. Completion section after finish
7. Recommendations

### Stats and actions toolbar

Mobile must align to web toolbar semantics:

- timer
- accuracy
- WPM
- completed words
- pause / resume
- translation
- listen
- reset

The region may wrap or split into rows on smaller screens, but these actions must remain immediately accessible.

### Reference text and translation

Required behavior:

- preserve the web reference text card
- show translation using sentence-level parity behavior
- translation belongs to the reference section, not a detached accordion-like card
- loading / error / retry must be visible

### Typing surface parity

Required behavior:

- hidden-input driver remains the input mechanism
- visual surface uses web-equivalent character state rendering
- incorrect word behavior remains `shake -> 300ms delay -> reset current word`
- start hint and idle state match web semantics

### Pause parity

The current mobile banner is insufficient.

Required behavior:

- paused state becomes an overlay over the typing surface
- overlay exposes resume affordance
- interaction behind the overlay is blocked while paused

### Completion parity

Completion must match web behavior and ordering:

- time
- WPM
- accuracy
- errors
- error words

Actions must match web semantics:

- `Review Errors` when error words exist
- `Try Again`
- `Full Text Again` when returning from review mode
- FSRS rating summary

### Recommendations parity

Mobile write must expose AI recommendations after the completion section, matching web placement.

## Shared Components And Contracts

### Shared section responsibilities

`PracticeScreenHeader`

- back handling
- title and subtitle/meta row
- cross-module nav or shadow progress slot

`PracticeReferenceCard`

- section title
- original content rendering
- optional quick actions slot
- optional translation slot beneath original content

`PracticeTranslationSection`

- loading state
- error state with retry
- sentence-level translated content rendering

`PracticeCompletionSection`

- shared completion framing
- FSRS rating summary integration
- common try-again / back affordance slots

`PracticeRecommendationSection`

- shared recommendation container and spacing
- consistent placement at the end of the page flow

### Shared contracts

Shared sections must standardize:

- loading UI shape
- empty / unavailable state wording
- error + retry placement
- touch target sizing and spacing
- section spacing rhythm

Shared sections must not own:

- speech recognition logic
- TTS playback logic
- typing reducer transitions
- module-specific score calculation algorithms

## Data Flow

### Read

1. Load content
2. Render shared header and reference card
3. On translation toggle, fetch sentence translations and render within the reference section
4. On listen-along, start TTS/read-aloud state and show floating bar
5. On record, collect live recognition updates and derive progressive feedback
6. On stop, compute final aligned results and pronunciation output
7. On finish, render FSRS summary and submit grade

### Write

1. Load content and initialize typing reducer
2. Render shared header, stats bar, and reference card
3. On translation toggle, fetch and render sentence translations in the reference section
4. On keystrokes, drive hidden input and reducer transitions
5. On wrong word, apply shake-reset sequence
6. On pause, render blocking overlay
7. On finish, render completion metrics, review-errors path, and FSRS summary

## Error Handling

Every async or device-dependent operation must surface explicit UI states.

### Read errors

- speech unavailable
- speech start failure
- no speech detected
- pronunciation analysis failure with fallback scoring
- translation failure with retry
- TTS/playback failure

### Write errors

- translation failure with retry
- content missing / invalid

### Rules

- never fail silently
- errors appear near the relevant section
- retry stays attached to the failed action
- prior successful content remains visible when retrying, when possible

## Mobile UX Rules

These rules are derived from the chosen mobile parity standard and `ui-ux-pro-max` guidance:

- icon buttons smaller than visual 44x44 must still get `hitSlop`
- all async sections need explicit loading UI
- no hover-dependent behavior
- no gesture-only critical actions
- no hidden primary actions behind extra menus
- bottom floating controls must reserve enough scroll padding to avoid overlap
- dynamic text growth must not break the section order
- state changes should use lightweight opacity/transform transitions only

## Testing

### Unit tests

Add or extend tests for:

- read word alignment and aggregate stats helpers
- translation normalization/render state helpers
- write completion and error-review state branching
- shared section loading / error / retry rendering

### Component / screen tests

Verify:

- read page section order and state transitions
- write page pause overlay and completion actions
- recommendation section placement
- translation loading/error visibility in both modules

### Validation

Run:

- mobile tests for updated helpers/components
- mobile type-check
- targeted manual verification on small-phone layout

Manual checks must include:

- read playback with floating bar
- read recording flow with result sections
- write wrong-word shake-reset behavior
- write review-errors loop
- FSRS completion flow on both pages

## Expected File Areas

Route files:

- `mobile/app/practice/read/[id].tsx`
- `mobile/app/practice/write/[id].tsx`

Likely shared additions:

- `mobile/src/components/practice/*`
- `mobile/src/components/read/*`
- `mobile/src/components/write/*`

Likely supporting updates:

- translation hook/service usage for sentence-level parity
- read/write store wiring where current mobile state is too simplified

## Risks

- `write` currently diverges from the web state model more than `read`; parity work there is larger.
- Shared-section extraction can drift into over-abstraction if module-specific logic is pulled upward.
- Existing mobile translation behavior differs between modules; parity requires standardizing the contract first.

## Acceptance Criteria

- Mobile `read` exposes the same primary user capabilities as web, in the same effective order.
- Mobile `write` exposes the same primary user capabilities as web, in the same effective order.
- Translation, completion, and recommendations behave consistently across web and mobile.
- Mobile adaptations improve touch usability without deleting web functionality.
- Shared sections reduce duplication without merging the two module engines.
