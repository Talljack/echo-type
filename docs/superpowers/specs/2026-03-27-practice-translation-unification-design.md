# Practice Translation Unification — Design Spec

> Date: 2026-03-27
> Status: Approved
> Scope: Unify translation behavior across listen, read, speak, and write, and fix selection translation popup behavior on practice pages

## 1. Overview

### Problem

- Translation behavior is inconsistent across practice modules.
- The selection translation popup mixes item meaning, example sentence, and inline explanations into a single display block.
- Listen content can contain explanatory fragments like `= ...` that leak into UI and TTS, causing `=` to be spoken as `equals`.
- Word selections can fail to surface word-level meaning and instead show only sentence-level translation.
- The favorite action can appear unresponsive because the popup does not clearly separate the collectible learning item from its surrounding context.

### Product Rules

- Every current practice item in EchoType must have translation support.
- `listen` and `read` show translation by default.
- `speak` and `write` hide translation by default, but expose a top-level toggle to show or hide it.
- Selection translation remains available in all four modules regardless of whether page-level translation is visible.
- Selection popup layout must differ for `word`, `phrase`, and `sentence`.

### Goals

- Make translation behavior coherent across all practice modules.
- Ensure word selections always show word meaning first.
- Prevent explanatory fragments from polluting display text, TTS, and favorites.
- Make favorites clearly actionable and reliable from the selection popup.

## 2. Translation Strategy

### 2.1 Unified Module Policy

Introduce a single translation visibility policy for practice modules:

```ts
type PracticeModule = 'listen' | 'read' | 'speak' | 'write';

interface PracticeTranslationPolicy {
  defaultVisible: boolean;
  allowToggle: boolean;
}
```

Required policy:

- `listen`: `defaultVisible = true`, `allowToggle = true`
- `read`: `defaultVisible = true`, `allowToggle = true`
- `speak`: `defaultVisible = false`, `allowToggle = true`
- `write`: `defaultVisible = false`, `allowToggle = true`

Notes:

- The top-level toggle exists in all four modules for consistency.
- For `listen` and `read`, the toggle starts enabled.
- For `speak` and `write`, the toggle starts disabled.
- User changes persist locally per module.

### 2.2 Practice Translation View Data

Page-level practice UI should consume a unified structure instead of ad hoc translation strings:

```ts
interface PracticeTranslationView {
  sourceText: string;
  translatedText?: string;
  segments?: Array<{
    sourceText: string;
    translatedText?: string;
  }>;
  displayMode: 'visible' | 'hidden';
  selectionSupport: true;
  speechText?: string;
}
```

Rules:

- `translatedText` must exist for the current practice item even when the module hides it by default.
- `segments` may be used for long-form content, sentence-by-sentence reading, or listen highlighting.
- `speechText` is a sanitized version of the practice content and must not reuse raw display strings blindly.

## 3. Selection Popup Contract

### 3.1 Structured Result Model

The popup must stop rendering a single overloaded `translation` string. It should consume structured data:

```ts
interface SelectionTranslationView {
  itemText: string;
  itemType: 'word' | 'phrase' | 'sentence';
  itemTranslation: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  related?: RelatedData;
  displayText: string;
  speechText: string;
  favoriteText: string;
}
```

Field meanings:

- `itemTranslation`: the main meaning of the selected learning item
- `exampleSentence`: surrounding sentence for word/phrase selections
- `exampleTranslation`: translation of the example sentence when available
- `displayText`: sanitized text shown in UI
- `speechText`: sanitized text used for TTS
- `favoriteText`: exact collectible learning item, never replaced by context

### 3.2 Layout by Selection Type

#### Word

- Top: word meaning (`itemTranslation`)
- Secondary: pronunciation when available
- Below: example sentence
- Below that: example sentence translation

This is mandatory. A word card cannot use sentence translation as its primary meaning.

#### Phrase

- Top: phrase meaning (`itemTranslation`)
- Below: example sentence
- Below that: example sentence translation

#### Sentence

- Top: sentence translation (`itemTranslation`)
- Below: sanitized English sentence

### 3.3 Favorite Behavior

- The favorite target is always the selected learning item.
- Word favorite stores word + word meaning + optional example context.
- Phrase favorite stores phrase + phrase meaning + optional example context.
- Sentence favorite stores sentence + sentence translation.
- The button becomes actionable as soon as basic translation data is ready.
- Success state must be explicit with text, not icon-only.
- Failure to persist must surface a visible, lightweight error in the popup.

## 4. Sanitization Rules

Introduce separate text pipelines for raw content, displayed content, spoken content, and favorite payloads:

```ts
interface SanitizedSelectionText {
  rawText: string;
  displayText: string;
  speechText: string;
  favoriteText: string;
}
```

### 4.1 Required Cleaning

Strip explanatory inline fragments that are not part of the original sentence meaning, especially:

- `(= xxx)`
- ` (= xxx)`
- `= xxx`

Example:

- Raw: `Will someone take out the trash (= take it outside the house)?`
- Display: `Will someone take out the trash?`
- Speech: `Will someone take out the trash?`

### 4.2 Safety Constraint

- Only remove obvious explanatory fragments.
- Do not aggressively strip all parenthetical content.
- If sanitization produces an empty or clearly broken sentence, fall back to the raw text for display.
- `speechText` must never contain `=` so TTS does not read `equals`.

## 5. Module-Specific UX

### 5.1 Listen

- Show translation by default for the current listening item.
- For word or phrase cards, place the meaning directly under the main item.
- For sentence or article practice, show translation for the active sentence or segment, not just a monolithic full-text translation.

### 5.2 Read

- Show translation by default.
- Keep original text visually primary and translation secondary.
- Prefer segment-paired rendering when the content is long.

### 5.3 Speak

- Hide translation by default.
- Provide a top-level show/hide translation control.
- Translation data should already be available so enabling the toggle is instant.

### 5.4 Write

- Hide translation by default.
- Provide a top-level show/hide translation control.
- Translation should appear in a secondary content area and must not compete with the typing input for focus.

## 6. Architecture Boundaries

### 6.1 Page-Level Translation

Each practice page should consume the shared policy and shared translation view data. Pages must not invent independent visibility rules.

### 6.2 Selection Popup

The popup remains responsible only for local selection learning:

- detect selected text
- classify `word` / `phrase` / `sentence`
- fetch structured translation data
- render type-specific layout
- favorite the selected learning item

The popup must not decide whether page-level translation is visible.

### 6.3 Persistence

Persist translation visibility settings locally per module. This state is separate from favorites, lookup history, and content-level translation caches.

## 7. Error Handling

- Basic translation failure shows a clear failure state instead of silent empty UI.
- Enrichment failure must not block basic translation, display, or favorite actions.
- Favorite persistence failure must show an actionable popup error.
- Missing translation for a practice item should render a clear placeholder state, not disappear silently.

## 8. Testing

### 8.1 Unit Tests

- Sanitization removes `= ...` explanatory fragments from display and speech text.
- Word, phrase, and sentence selections choose the correct primary translation field.
- Favorite payloads store the selected item rather than its example context.

### 8.2 Component Tests

- Word popup renders word meaning first, then example sentence.
- Phrase and sentence popups render distinct layouts.
- Favorite button becomes enabled after basic translation resolves.
- Module-level translation toggles reflect policy defaults.

### 8.3 End-to-End Tests

#### Listen

- Selecting `trash` shows a word-level meaning.
- Example sentence does not include `= ...` explanatory text.
- TTS reads sanitized text and does not speak `equals`.
- Favorite action visibly succeeds.

#### Practice Module Visibility

- `listen` loads with translation visible.
- `read` loads with translation visible.
- `speak` loads with translation hidden and can be toggled on.
- `write` loads with translation hidden and can be toggled on.
- Toggle state persists across navigation or reload.

## 9. Non-Goals

- Changing cloud sync behavior for favorites.
- Redesigning the entire selection popup visual style beyond the layout and state changes required here.
- Replacing the current translation providers as part of this work.
