# EchoType I18n Coverage Expansion

## Problem

EchoType already has a working client-side i18n foundation, and some Library / Import surfaces have been migrated to `useI18n(...)` plus JSON message dictionaries. But the coverage is still incomplete in three visible ways:

1. **Partially migrated components still contain hardcoded strings**
   - Example: runtime error messages, placeholders, and aria labels remain inline in `src/components/import/url-import.tsx` and `src/components/import/pdf-import.tsx`
2. **Some settings-mounted components still use local `COPY` objects**
   - Example: `src/components/settings/tag-management.tsx`, `src/components/ollama/ollama-warning-banner.tsx`, and `src/components/assessment/assessment-section.tsx`
3. **Message dictionaries have drift risk**
   - The current `library` namespace already shows parity issues where English contains keys that Chinese does not

This creates a user-facing mixed-language experience and makes the current i18n migration feel incomplete even though the architecture exists.

## Goal

Expand i18n coverage so EchoType's app-owned UI copy is consistently localized across the current Library / Import flow and the remaining known Settings surfaces, while keeping the scope intentionally narrow and safe.

Specifically, this phase should:

- finish the current `library` namespace migration for import-related UI
- remove the remaining known inline `COPY` / conditional-language UI patterns from the targeted settings surfaces
- perform a focused scan for additional app-owned hardcoded copy in related areas and fix low-risk findings in the same pass
- add minimal automated coverage for the newly migrated behavior
- verify the behavior in the browser with both English and Chinese UI

## Scope

### In Scope

#### App-owned UI copy

Translate or migrate all app-controlled strings in the targeted areas, including:

- titles
- descriptions
- labels
- helper text
- button text
- placeholders
- badges / statuses
- empty-state or validation text
- accessible labels such as `aria-label`
- controlled runtime error text shown by the client

#### Controlled error mapping

When a request fails in the targeted components, the UI should prefer dictionary-backed, app-owned error copy for common controlled cases such as:

- network failure
- parsing / extraction failure
- file validation failure

This means the UI may still display server-returned app-owned error text when appropriate, but raw fallback strings hardcoded in components should be removed.

#### Known target surfaces

First priority:

- `src/components/import/url-import.tsx`
- `src/components/import/pdf-import.tsx`
- `src/components/library/quick-add-dialog.tsx`
- `src/lib/i18n/messages/library/en.json`
- `src/lib/i18n/messages/library/zh.json`

Second priority:

- `src/components/settings/tag-management.tsx`
- `src/components/ollama/ollama-warning-banner.tsx`
- `src/components/assessment/assessment-section.tsx`

#### Focused follow-up scan

After the known targets are cleaned up, run a focused scan for related app-owned hardcoded strings using patterns such as:

- local `COPY` / `MESSAGES` objects
- `interfaceLanguage === 'zh' ? ... : ...`
- JSX-visible hardcoded English or Chinese strings in the same feature areas

Low-risk findings in import / library / settings should be fixed in this phase.

### Out of Scope

Do not translate or transform:

- imported webpage body text
- extracted PDF body text
- AI-generated content
- user-generated content
- provider names, model names, or external proper nouns
- arbitrary third-party raw error payloads beyond controlled client-side mapping
- broader full-app i18n migration outside the targeted areas
- route-level locales, SSR locale loading, or architectural i18n rewrites

## User Experience Requirements

### Consistent language on targeted surfaces

When the interface language is English, targeted app-owned UI copy should render in English. When it is Chinese, the same copy should render in Chinese.

The experience should feel complete within the migrated surface. Users should not see obvious mixed-language combinations such as:

- English form chrome with Chinese button labels
- Chinese settings sections with English warnings
- localized pages that still show hardcoded English error fallbacks

### Immediate response to language changes

For targeted components already mounted in the current app shell, changing the interface language in Settings should update their visible app-owned copy without requiring special-case refresh logic.

### External content stays untouched

Imported article text, extracted PDF content, and other external or generated bodies must remain unchanged. The UI chrome around them changes language; the content itself does not.

## Design Decisions

### 1. Reuse existing namespaces rather than inventing a new structure

This phase should continue the established i18n pattern:

- use `useI18n(namespace)` inside components
- keep message ownership in existing namespace files where that ownership is already clear
- avoid introducing a new parallel translation layer

For the import/library work, `library` remains the canonical namespace.

For settings-mounted surfaces, strings should be moved into the existing relevant namespace structure instead of adding fresh ad hoc `COPY` constants inside components.

### 2. App-owned error fallbacks must be dictionary-backed

Targeted components should no longer contain hardcoded fallback strings such as generic network or parse failure messages.

Instead, components should:

1. prefer an app-owned server response message when present and appropriate
2. otherwise use dictionary-backed fallback keys for controlled failure cases

This keeps UX consistent across languages without trying to localize unknown third-party payloads.

### 3. Message parity is part of the feature

The `en` and `zh` message files used by this phase must stay structurally aligned.

Scope rule for this phase:

- for the `library` namespace, fix full-file parity between `src/lib/i18n/messages/library/en.json` and `src/lib/i18n/messages/library/zh.json` as part of this work
- for any non-library message files touched during the settings migration, maintain parity for the full touched file rather than only the newly added keys

This keeps planning concrete: if a message file is edited in this phase, its English and Chinese variants should leave the phase structurally aligned.

## Target File Areas

The exact set may expand slightly during the focused scan, but planning should assume changes around:

- `src/components/import/url-import.tsx`
- `src/components/import/pdf-import.tsx`
- `src/components/library/quick-add-dialog.tsx`
- `src/components/settings/tag-management.tsx`
- `src/components/ollama/ollama-warning-banner.tsx`
- `src/components/assessment/assessment-section.tsx`
- `src/lib/i18n/messages/library/en.json`
- `src/lib/i18n/messages/library/zh.json`
- any existing shared i18n message files that own the settings copy being migrated
- existing i18n tests covering message parity or language-switch behavior
- existing e2e coverage for interface language switching

Expected namespace ownership during planning:

- import / library strings -> `library`
- assessment section app-owned chrome -> existing settings-owned i18n destination used by that surface today, if present; otherwise the planning step should define the narrowest existing namespace rather than introducing component-local copy again
- tag management and ollama warning copy -> existing settings-owned i18n destination used by that route, if present; otherwise planning should consolidate them into the current settings message ownership rather than create a new one-off structure

## Implementation Shape

### A. Import / Library completion

#### `src/components/import/url-import.tsx`

Migrate remaining inline strings to `library.urlImport`, including:

- controlled runtime error fallback(s)
- tag placeholder / helper text if still inline
- accessible save label if still inline
- any other remaining app-owned visible copy

The component already uses `useI18n('library')`, so the design expectation is to finish the migration rather than restructure the component.

#### `src/components/import/pdf-import.tsx`

Migrate remaining inline strings to `library.pdfImport`, including:

- parse failure fallback
- network failure fallback
- any remaining app-owned labels or helper text that still bypass the dictionary

Keep file validation behavior unchanged. Only the source of copy changes.

#### `src/components/library/quick-add-dialog.tsx`

Confirm the component is fully dictionary-backed for all visible app-owned UI. If the focused scan finds residual hardcoded copy in this dialog, migrate it into the existing `library.quickAdd` group.

### B. Known settings cleanup

#### `src/components/settings/tag-management.tsx`

Replace the local copy object with shared message lookups. Migrate only app-owned UI chrome rendered by the component.

#### `src/components/ollama/ollama-warning-banner.tsx`

Replace the local warning copy object with shared message lookups. Preserve the current product logic and warning conditions.

#### `src/components/assessment/assessment-section.tsx`

Replace the local assessment UI copy object with shared message lookups, but keep the scope limited to app-owned assessment chrome. Do not try to translate generated assessment content, generated question bodies, or other dynamic content outside UI ownership.

### C. Focused follow-up scan

After the known files are migrated, run one more scan for similar app-owned hardcoded strings in import / library / settings surfaces and fix low-risk findings in the same pass.

If the scan reveals a much larger migration wave than expected, stop and narrow the implementation plan rather than silently expanding scope.

## Error Handling Rules

### Allowed behavior

- use localized fallback messages for network / parse / validation failures
- continue showing app-owned server messages where appropriate
- preserve existing success and loading logic

### Disallowed behavior

- do not attempt to translate imported body content
- do not add speculative error abstraction layers for one-off cases
- do not add new fallback complexity where current component logic is already sufficient

## Testing Strategy

This phase requires both automated verification and browser validation.

### Automated tests

Add the smallest useful amount of coverage to prove the new behavior.

Preferred order:

1. extend existing i18n-related tests where natural
2. add narrowly scoped tests only where the missing behavior cannot be covered otherwise

Coverage should prove at least these behaviors:

- targeted import/library UI renders the correct app-owned copy in the active language
- controlled fallback errors use dictionary-backed localized text rather than hardcoded strings
- targeted settings-mounted migrated components update with the current interface language
- message parity for keys touched in this phase remains aligned between `en` and `zh`

The goal is confidence, not blanket test expansion.

### Browser validation

Run the application locally and verify the targeted flows in both languages.

Minimum manual browser checks:

1. switch interface language to Chinese and verify:
   - URL import UI chrome
   - PDF import UI chrome
   - Quick Add dialog UI chrome
   - targeted settings components
2. switch interface language to English and verify the same surfaces again
3. trigger at least one controlled failure path where applicable and confirm the fallback message is localized
4. confirm imported / extracted body text remains unchanged while surrounding UI changes language

## Non-Goals and Constraints

- no full-library namespace redesign
- no broad refactor unrelated to i18n coverage
- no new generalized abstraction for a single component's one-off strings
- no migration of unrelated product areas just because the scan finds them
- no architectural changes to the language store or provider unless a narrow implementation need is discovered

## Success Criteria

This phase is successful when all of the following are true:

1. the targeted import/library surfaces no longer contain obvious hardcoded app-owned UI strings
2. the known settings components no longer rely on local `COPY` objects for app-owned UI
3. controlled fallback errors in the targeted components are localized through the dictionary
4. touched message files have English / Chinese key parity
5. minimal automated tests covering the new behavior pass
6. browser validation confirms English and Chinese behavior on the targeted flows
7. external body content remains unmodified by language switching

## Risks

### Scope creep during the scan

A scan can easily turn into a full-repo migration. Planning should explicitly constrain implementation to:

- known target files first
- low-risk adjacent fixes second
- stop-and-confirm if the scan uncovers a substantially larger batch

### Hidden dictionary ownership confusion

Some settings strings may belong to an existing namespace that is not immediately obvious from the component. Planning should identify the correct destination namespace per component before editing to avoid scattering settings copy across unrelated files.

### Test sprawl

Because this is a coverage-expansion phase rather than a brand-new system, the implementation should prefer extending existing tests and only add new tests where they directly prove the migrated behavior.
