# EchoType I18n Phase 1

## Problem

EchoType already has a persisted `interfaceLanguage` preference in `src/stores/language-store.ts`, but the app does not have a shared translation layer. As a result, user-facing copy is currently a mix of English and Chinese, especially in the dashboard and settings surfaces.

This creates three problems:

1. **Mixed-language UI**: the same page can render both English and Chinese copy
2. **No single translation source**: strings are hardcoded inside pages and components
3. **No reliable migration path**: future pages cannot adopt i18n consistently without first defining a shared pattern

## Goal

Build the first production i18n layer for EchoType with support for:

- English UI
- Chinese UI
- First-load language detection from the browser
- Immediate user-controlled switching from Settings
- Persistent explicit preference that overrides browser language

This phase establishes the architecture and migrates the highest-visibility shared surfaces first.

## Scope

### In Scope

- Global client-side language preference model
- Shared translation dictionary and translator access layer
- First-load browser language detection with fallback
- Settings language control as the primary entry point
- Dashboard first-load language notice as a discovery aid
- Migration of `sidebar`, `dashboard`, and `settings` to the shared translation source
- Automated coverage for language preference behavior and key translated surfaces

### Out of Scope

- Full-app migration of listen, speak, read, write, library, chat, and other feature pages
- Route-level locale prefixes such as `/en` and `/zh`
- Server-side locale loading
- Full locale formatting for dates, numbers, and relative times
- Backend persistence of language preference
- Translation management tooling or CMS workflows

## User Experience

### First Launch Behavior

On first launch, the app determines the initial interface language from the browser:

- Chinese browser locale -> `zh`
- All other cases -> `en`

This behavior applies only when the user has not explicitly chosen a language before.

To avoid a wrong-language flash on first render, translatable app-shell content should wait until the initial language has been resolved on the client. A lightweight loading shell or placeholder is acceptable during this brief initialization window; rendering the full UI in English and then flipping to Chinese is not.

### Explicit User Preference

Once the user manually changes the interface language in Settings:

- the UI updates immediately across the current app shell
- the chosen language is persisted locally
- future visits use the explicit preference
- browser language detection no longer overrides the user choice

### Primary Language Entry Point

The formal language control lives in `Settings > Language`.

The section should communicate two things clearly:

1. this setting changes the interface language
2. it does not change the product's learning target language

This distinction matters because EchoType is an English-learning product and users could otherwise confuse "UI language" with "learning language."

### Dashboard Discovery Pattern

To improve discoverability without permanently cluttering navigation, the dashboard shows a light notice only after automatic first-load language selection.

The notice:

- appears only in the auto-detected state
- appears during the initial auto-detected period until the user makes an explicit language choice
- explains that the app matched the browser language
- provides a clear action to open language settings
- disappears after the user makes an explicit language choice

This keeps Settings as the primary control while preventing the feature from being hidden.

## UX and Visual Rules

The implementation should preserve the existing EchoType visual system:

- glassmorphism cards and soft borders
- indigo-first palette and current spacing rhythm
- no additional permanent sidebar control for language in phase 1

Based on the current design system and the `ui-ux-pro-max` guidance, the language UI must satisfy:

- clear selected state for the active language
- touch targets at least 44px tall
- full keyboard reachability
- visible focus states
- no color-only indication of selection
- immediate visual feedback on change
- no layout shift when copy changes between English and Chinese

## Architecture

Phase 1 uses a lightweight client-side i18n architecture rather than route-level or library-heavy internationalization.

### 1. Language Preference Layer

The existing `src/stores/language-store.ts` remains the source of truth for interface language, but it needs to be extended from a simple persisted value into a full preference model.

Required responsibilities:

- hold the current `interfaceLanguage`
- detect initial language from the browser on first load
- track whether the user has made an explicit choice
- persist explicit preference locally
- hydrate safely without breaking SSR/client boundaries

Expected behavior:

- if an explicit preference exists, use it
- otherwise detect from the browser
- if detection fails, fall back to English

### 2. Dictionary Layer

Add a shared translation dictionary for phase-1 surfaces.

Suggested namespaces:

- `common`
- `sidebar`
- `dashboard`
- `settings`

The dictionary must guarantee structural parity between `en` and `zh`. The goal is to prevent partial translation drift where one language gains new keys without the other.

TypeScript should enforce this parity at authoring time wherever practical.

### 3. Translator Access Layer

Add a thin access layer so components do not import raw dictionary objects directly.

Examples of acceptable shapes:

- `useI18n()`
- `useT(namespace)`
- `getTranslator(namespace)`

The exact API can be decided during planning, but the design requirement is fixed:

- component code asks for translated values through one shared abstraction
- components do not hardcode page copy
- future migration of additional pages follows the same pattern

### 4. UI Migration Layer

This phase migrates only the following user-visible surfaces:

- app sidebar navigation labels and group headings
- all user-visible copy rendered on the dashboard route, including nested components mounted by `src/app/(app)/dashboard/page.tsx`
- all user-visible copy rendered on the settings route, including nested components mounted by `src/app/(app)/settings/page.tsx`

Other screens remain untouched in this phase and continue to use current copy until later migration waves.

For clarity:

- `TodayPlan`, `TodayReviewCard`, and other dashboard child components rendered on the dashboard route are in scope
- dialogs, banners, warnings, and helper text triggered from the settings route are in scope if they are owned by components mounted on that page
- feature pages outside the dashboard route and settings route are out of scope even if they already contain mixed-language copy
- "user-visible copy" means app-owned UI strings only, not provider names, model names, user-generated content, or other external proper nouns

## Target File Areas

The exact file list may expand slightly during implementation, but planning should assume work around these areas:

- `src/stores/language-store.ts`
- new i18n dictionary and translator files under `src/lib` or `src/i18n`
- `src/components/settings/language-section.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/components/layout/sidebar.tsx`
- supporting tests for store, dictionaries, and key UI surfaces

## Dashboard Language Notice

The dashboard needs a dedicated stateful notice for the auto-detected language case.

Behavior requirements:

- shown only when the app used browser language because no explicit preference existed
- content differs by current UI language
- includes an action to open Settings
- does not reappear after the user has manually chosen a language

This should be modeled as a deterministic product state, not as a random toast or ephemeral banner with unclear rules.

## Error Handling and Fallbacks

The i18n layer must never block the app from rendering.

### Preference Fallback Rules

1. If local storage is unavailable or corrupted, ignore the stored value
2. If browser language cannot be read, fall back to `en`
3. If hydration occurs late, the app should converge safely without crashing

### Translation Fallback Rules

1. Missing translation keys must not render `undefined`
2. Production fallback should use English copy
3. Development should surface missing-key problems clearly enough to catch drift early

## Testing Strategy

This phase requires automated verification, not only manual QA.

### Unit Tests

- language detection logic
- explicit preference persistence
- hydration behavior
- prevention of browser-language override after explicit selection

### Dictionary Consistency Tests

- verify `zh` and `en` key shapes stay aligned
- fail fast when new keys are added to only one language

### Component or Integration Tests

- settings language switch updates copy immediately
- dashboard renders the correct translated labels
- sidebar labels reflect the current interface language
- dashboard first-load notice appears only in the auto-detected case

### End-to-End Coverage

At least one high-value flow should validate:

1. first visit with a Chinese browser locale
2. Chinese interface appears
3. dashboard notice explains the auto-selected language
4. user opens settings and switches to English
5. UI updates immediately
6. reload preserves English because the choice is now explicit

## Multi-Agent Execution Plan

Implementation should be split into parallel tracks after planning is complete.

### Agent A: I18n Infrastructure

Ownership:

- language preference store changes
- browser detection logic
- dictionary structure
- translator access layer

### Agent B: UI Integration

Ownership:

- `sidebar`
- `dashboard`
- `settings`
- dashboard language notice

### Agent C: Verification

Ownership:

- unit tests
- dictionary consistency coverage
- integration or e2e verification for switching and persistence

This split minimizes merge conflicts because the write scopes are mostly distinct while still producing a coherent phase-1 deliverable.

## Design Constraints

- Keep the solution client-side for phase 1
- Reuse existing project patterns where reasonable
- Do not introduce a route-level locale architecture in this phase
- Do not expand scope into unrelated refactors
- Keep the migration focused on the agreed first wave only

## Success Criteria

Phase 1 is successful when all of the following are true:

1. The app supports English and Chinese interface language selection
2. First load follows browser language when no explicit preference exists
3. Manual language change in Settings updates the UI immediately and persists
4. Sidebar plus all user-visible copy rendered on the dashboard route and settings route no longer contain mixed hardcoded English and Chinese copy
5. There is one shared translation access pattern for future page migrations
6. Automated tests cover the critical language-selection and rendering behavior
