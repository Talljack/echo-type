# EchoType Mobile MVP Alignment Design

**Date:** 2026-04-13  
**Status:** Approved for planning  
**Scope:** `mobile/` Expo app only

## Summary

This design resets the `mobile` app to a truthful MVP definition.

The app currently presents itself as if it already has a production-grade local database, cloud sync, and real AI-backed import and tutoring. The implementation does not match that claim. The actual app is an Expo client built primarily on `Zustand + AsyncStorage`, with several placeholder flows that currently succeed with fake content or simulated responses.

The goal of this design is not to add more features first. The goal is to align product behavior, documentation, and UI expectations with the real implementation, then improve the navigation and interaction model around that MVP.

## Goals

- Define the mobile app as a real MVP, not a partially claimed production architecture.
- Keep `AsyncStorage + Zustand` as the current local persistence layer.
- Remove or clearly label placeholder flows so the app stops pretending fake functionality is real.
- Make navigation coherent so users can always understand where content lives and how to start practice.
- Preserve room to introduce a stronger data layer later without rewriting the UI architecture.

## Non-Goals

- Do not introduce WatermelonDB in this phase.
- Do not implement real cloud sync in this phase.
- Do not implement real AI content generation, translation, or tutor chat in this phase.
- Do not redesign the entire app visual language from scratch.
- Do not expand scope into push notifications, analytics, or production-grade offline sync.

## Product Truth

After this alignment pass, the mobile app should be described as:

- A local-first mobile MVP for EchoType.
- Data persistence is handled by `Zustand + AsyncStorage`.
- Supabase authentication is optional and secondary to local use.
- Library import is real only for manually entered text.
- Listen, Speak, Read, Write practice flows are locally functional but limited.
- Review uses a real local FSRS-style flow.
- Chat is a local demo tutor unless and until a real AI backend is connected.

Any documentation, empty state, or CTA that implies more than this must be corrected.

## Current State Assessment

### What is real today

- Expo Router navigation and onboarding flow.
- Theme and shell structure.
- Local stores for content, settings, practice session history, chat history, and review.
- Basic Listen, Speak, Read, Write practice routes.
- Review loop with local FSRS card state.
- Optional Supabase sign-in if environment variables are configured.

### What is misleading today

- WatermelonDB is described in docs but is not actually installed or initialized.
- Cloud sync is described as implemented but there is no real sync engine wired into user data.
- URL, YouTube, PDF, and AI imports currently return placeholder or heuristic content.
- Read translation is simulated.
- Chat uses canned local responses but is presented like a real AI tutor.
- Several screens imply production completeness when they are still MVP stubs.

## Architecture Decision

### Data Layer

The current MVP data layer remains:

- `Zustand` for state containers
- `AsyncStorage` for persistence
- `SecureStore` for sensitive settings and auth tokens

This is the source of truth for the current mobile app.

### Repository Boundary

To avoid coupling screens directly to the storage mechanism forever, future implementation should move storage reads and writes behind lightweight repository-style helpers or service boundaries. The requirement is modest:

- UI components should not depend on WatermelonDB concepts.
- Practice screens should not assume persistence details.
- Store APIs should remain compatible with a future storage swap.

This phase does not require a large refactor, but it must avoid introducing new storage-specific coupling.

## Information Architecture

### Top-Level Navigation

Keep the current five-tab structure for now:

- Home
- Listen
- Speak
- Library
- Settings

This avoids unnecessary churn during the alignment pass.

### Functional Hierarchy

The app must behave according to the following hierarchy:

- `Library` is the content source of truth.
- Content selection starts in `Library`.
- Practice modes operate on chosen content.
- `Listen` and `Speak` tabs are module home screens, not duplicate content libraries.
- `Read` and `Write` remain secondary entry points reached from dashboard actions or library detail.
- `Review` remains a standalone stack route, not a tab destination in this phase.
- `Chat` remains a standalone stack route, clearly labeled as MVP demo behavior.

## User Flows

### Library Flow

The library becomes the central content hub.

Required user flow:

1. User opens `Library`.
2. User imports or browses content.
3. User opens a content detail screen.
4. User chooses one of the available practice actions:
   - Listen
   - Speak
   - Read
   - Write

The current behavior where tapping content does nothing must be removed.

### Practice Entry Flow

All practice entry should be explicit.

- `Home` can suggest modules or recent items.
- `Library` is the main place to pick content.
- `Listen` and `Speak` module pages can deep-link into recent or last-used content.
- `Read` and `Write` should be reachable from `Home` or filtered library entry points.

The app must not route users into dead ends or silent no-op taps.

### Import Flow

Only real import flows can claim success.

Allowed as true MVP functionality:

- Manual text import

Not allowed to masquerade as real import:

- URL import using fake or unreliable extraction presented as a finished feature
- YouTube import that inserts placeholder text
- PDF import that inserts placeholder text
- AI generation that inserts placeholder text

For this phase, the recommended product behavior is:

- Keep `Text` import visible and primary.
- Hide unsupported methods entirely, or show them as disabled with a clear `Coming soon` explanation.
- Do not save placeholder content for unsupported methods.

### Chat Flow

Chat remains available, but it must be honest.

Behavioral requirements:

- Present chat as `Local Tutor Demo` or equivalent MVP wording.
- Explain that responses are simulated locally if no real provider is connected.
- Remove any copy that strongly implies real multi-provider AI tutoring.
- Keep the conversation shell, message history, and basic interaction loop.

### Review Flow

Review remains part of the MVP because it already has meaningful local behavior.

Requirements:

- Keep the current local FSRS review loop.
- Reframe sample cards as demo data, not the primary user path.
- Empty state should explain how review will eventually be populated.
- If vocabulary collection is not implemented yet, say so directly.

## Screen-by-Screen Requirements

### Home

The home screen should become a decision screen, not a static showcase.

Required structure:

- Greeting and short daily summary.
- Primary CTA for continuing recent learning.
- Secondary section for choosing practice modes.
- Review status summary.
- Recent activity or lightweight progress summary.

The four module cards may remain, but their actions must become accurate:

- `Listen` opens Listen module home.
- `Speak` opens Speak module home.
- `Read` opens a clear Read entry path.
- `Write` opens a clear Write entry path.

The current behavior where `Read` and `Write` point vaguely back to library should be replaced with explicit intent.

### Library

Library is the highest-priority screen in this phase.

Requirements:

- Search, filter, and sort remain.
- Content cards open a real detail screen.
- Import CTA emphasizes manual text import.
- Unsupported import methods are hidden or visibly unavailable.
- Empty state tells the user exactly how to add the first item.

### Content Detail

This is a new required screen in the aligned MVP.

It should display:

- Title
- source
- difficulty
- word count
- body preview or full body
- available practice actions

It is the single branching point into Listen, Speak, Read, and Write.

### Listen Module Home

Listen should stop acting like a library clone.

Required content:

- module title and short description
- total listen time or recent sessions
- continue last session CTA if available
- shortcut to choose content from library

### Speak Module Home

Speak should mirror the same module-home pattern:

- module title and short description
- average score and recent sessions
- continue last session CTA if available
- shortcut to choose content from library

### Read and Write Access

Read and Write do not need top-level tabs in this phase, but they do need clear discovery.

Required entry points:

- from Home module actions
- from content detail actions

### Practice Screens

All four practice screens should share one structural pattern:

- top header with title and metadata
- main practice area
- bottom action area

Additional per-module guidance:

- Listen: emphasize playback controls, progress, and readable transcript state.
- Speak: recording state must feel obvious and safe to use.
- Read: translation UI must not imply real translation if it is still unavailable.
- Write: success and error feedback must be formal and readable, not playful placeholder styling.

### Settings

Settings should explicitly reflect the MVP architecture.

Requirements:

- Auth copy explains sign-in is optional.
- Sync copy does not claim full device sync if it does not exist.
- TTS and learning settings should only expose options that actually affect behavior.
- Any unavailable provider setting should be hidden or labeled as future work.

## UI and Interaction Principles

### Visual System

Keep the current brand palette centered on indigo tones, but simplify presentation.

Design rules:

- White cards and indigo accents are the default app rhythm.
- Glassmorphism remains limited to selective surfaces like onboarding and tab bar.
- Avoid mixing multiple strong visual styles across core task screens.
- Use one icon system consistently.
- Remove emoji as structural icons in cards and navigation.

### Navigation Clarity

- Every screen needs one obvious next step.
- No silent taps.
- No fake success states.
- Back behavior must remain predictable.
- Deep pages should always have a clear path back to content selection or module home.

### Empty States

Every empty state must contain:

- what is empty
- why it is empty
- what the user can do next

If the missing capability is unimplemented rather than user-caused, the screen must say that.

### Disabled and Coming Soon States

If a feature is unavailable:

- prefer hiding it if it adds noise
- otherwise show it as disabled with a plain explanation

Do not let the user complete a placeholder flow that appears successful.

### Touch and Accessibility

This phase should enforce basic mobile quality:

- touch targets meet minimum size expectations
- tab targets have enough hit area
- fixed UI respects safe areas
- focus order and labels are not actively broken
- color is not the only status indicator

### Motion

Current decorative motion is heavier than the core task interactions deserve.

This phase should shift motion toward functional feedback:

- practice start
- recording state change
- review transitions
- content card entry
- completion feedback

Decorative floating or idle motion should not dominate the product feel.

## Functional Scope for This Alignment Pass

### Must Change

- documentation and product copy
- import behavior and unsupported feature handling
- content card tap behavior
- content detail routing
- module home purpose for Listen and Speak
- accurate entry paths for Read and Write
- chat positioning as local demo
- review empty-state framing
- UI consistency around empty, disabled, and coming-soon states

### May Change If Needed

- dashboard content hierarchy
- tab labels and supporting copy
- minor card layout refactors
- settings wording and section structure

### Must Not Expand Into

- real AI integration
- real translation service
- full sync implementation
- WatermelonDB reintroduction
- large-scale design-system rewrite

## Risks

### Risk 1: Users perceive the app as losing capability

Mitigation:

- Replace fake success with honest wording and clearer next steps.
- Present unsupported features as future capabilities, not removed features.

### Risk 2: Navigation changes create churn

Mitigation:

- Keep the current five-tab shell.
- Add one content detail branching layer instead of a full IA rewrite.

### Risk 3: AsyncStorage stores become more entrenched

Mitigation:

- Add light abstraction boundaries where practical.
- Avoid introducing storage-specific UI assumptions.

## Testing Requirements

The alignment pass should be considered complete only if the following are true:

- No screen claims WatermelonDB-backed persistence.
- No screen claims real sync unless it exists.
- Unsupported import paths do not save placeholder content.
- Every library content card opens a real destination.
- Every practice mode has a clear entry path.
- Chat is visibly labeled as demo behavior if still simulated.
- Review empty state distinguishes between demo cards and future real collection.
- Empty states and disabled states are explicit and consistent.

## Success Criteria

This project succeeds when:

- The mobile app can be truthfully described as a local-first MVP.
- A new user can import text, browse content, open content detail, and start practice without confusion.
- No fake feature presents itself as complete.
- The product feels smaller but more trustworthy.
- The architecture remains compatible with a future upgrade to a stronger local database.

## Recommended Implementation Order

1. Align documentation and in-app copy with the real MVP scope.
2. Remove fake import success paths.
3. Add the content detail screen and fix library tap behavior.
4. Reframe Listen and Speak as module home screens.
5. Fix Read and Write discovery from Home and content detail.
6. Reframe Chat and Review empty states.
7. Normalize empty, disabled, and visual interaction states.

