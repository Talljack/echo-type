# Inline practice translation implementation

Goal: remove duplicate translation surfaces and unblock apostrophe typing without changing materials.

- Add reducer regression tests in `src/hooks/use-typing-reducer.test.ts`: type ASCII `That's` against `That’s`, reverse the pair, verify errors still shake. Run `pnpm exec vitest run src/hooks/use-typing-reducer.test.ts` before and after the minimal comparison change.
- Add tested sentence alignment in `src/lib/practice-translation.ts`: match normalized source words monotonically, retaining actual source indices and skipping unmatched translations. Test missing/repeated sentences and smart punctuation with Vitest.
- In Write detail, collapse the optional reference using native `details`, remove the duplicated translation card and insert translations at matched source character ends in the typing display. Keep loading/retry inside the practice surface.
- Extend `ReadAloudContent` to put each translation after its end word. Wire Listen and Read to source-aware ranges; preserve hidden transcript behavior, click-to-play and original formatting.
- Run targeted tests, TypeScript and Biome, then browser checks for quote typing and inline translation at desktop and mobile sizes. Leave the branch uncommitted for user review.

## Verification

- Completed inline Type, Listen and Read changes; Speak already uses message-local translation.
- Four quote regressions failed before the comparison fix, then passed. Twelve targeted unit tests pass, including repeated/missing sentence alignment and error-review offsets.
- Five Chromium end-to-end tests pass: full screenshot article typed using ASCII apostrophe at 1440px and 375px, translation toggles, Listen/Read sentence pairs and error-word review.
- TypeScript passes; changed production files pass Biome with existing warnings (Listen hook dependencies, selectable-word semantics and an unused suppression). No unsafe lint fixes applied.
- Independent review caught error-review offsets; fixed by aligning against current reducer words instead of original article text and covered by browser regression.
- Screenshots inspected at `/tmp/echotype-inline-type-1440.png` and `/tmp/echotype-inline-type-375.png`. Translation responses in browser tests are fixtures; live translation quality was not evaluated.
- No desktop/iOS package build or native-device verification. Shared web implementation only. No commit, MR or release.

## Follow-up: common punctuation input

- Added shared punctuation compatibility to article and wordbook/course typing: quote variants, fullwidth ASCII punctuation, dash/minus variants, full stop and bidirectional ellipsis. Preserve source text and reject different punctuation.
- Article typing now accepts committed input events as well as printable keydown. Composition preedit is ignored, committed text is consumed once, modifier/dead keys are not swallowed. The input remains hidden and uncontrolled.
- Partial ellipsis is tracked independently and cleared on word retry/reset. Paused/shaking reducers reject batched input as well as keydown.
- Reproduced five missing punctuation cases and the missing input-event path before fixes. Reverse smart ellipsis and course matching also failed before their fixes.
- Targeted unit suite expanded to 23 passing tests. Browser suite now covers original layouts, full keyboard punctuation, no-keydown input and composition events. Synthetic composition checks are not native iOS hardware validation.
