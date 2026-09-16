# Text-material learning cycle — P0 / P1 / P2

Scope: existing LearningUnit / Lesson text materials; no video work, release, production migration or destructive data conversion. Start from main 9e811e4 on codex/text-learning-cycle.

## Contract

- Preserve immutable learningAttempts and existing practice routes. Add optional cycle metadata to attempts, not a parallel learning database.
- Five stages: understand (source-backed comprehension), express (original writing), correct (genuine revision with an identified improvement), recall (delayed retrieval plus honest self-rating), apply (expression used in a new context).
- Practice completion is not certified mastery. Translation/source assistance and self versus AI feedback remain visible. No AI credentials are required for the base loop.
- Recall is due after a correction, never credited immediately or just by opening a page. Failed/assisted recall returns sooner; successful unassisted recall increases spacing. Transfer requires a source expression and a different context.
- Daily tasks point to the specific next stage; evidence must match that stage and source revision. Paused work is retained, due recall takes priority, and the time budget is respected. Recommendations explain their reasons.
- P0: durable, account-scoped text drafts; explicit save failures; original submissions preserved; recording capability failures never pretend a recording was saved.

## Implementation and verification

1. RED/GREEN pure cycle state, revision validation, recall scheduling and transfer evidence tests.
2. RED/GREEN durable draft reliability tests; wire into workshop without data loss.
3. RED/GREEN adaptive task planning and exact evidence attribution; wire Today/review queue.
4. Add five-stage navigation and recall/apply workspace, correction comparison, inline source translation and next-action guidance. Preserve optional oral practice.
5. Production browser journey: text import/course -> comprehension -> writing -> correction -> due recall -> new context, including reload, assisted/failed recall, errors and mobile width.
6. Run unit tests, typecheck, lint, build, Chromium/WebKit targeted tests and available desktop/native checks. Report actual platform evidence; do not imply Windows execution without a Windows runner.
7. Independent review and fix substantive findings. No automatic commit, PR, merge or release this turn.

## Visual direction

Existing EchoType study workspace: Poppins headings, Open Sans body, indigo actions, slate text. Tailwind only. Radius scale 8 / 12 / 16 px. Retain the app shell, no marketing hero or new navigation category. Five-stage progress is the anchor; one active task below it. Source and its translation stay together, source collapses for retrieval, feedback and before/after comparison sit beside the answer on wide screens and stack on mobile. Controls have 44 px targets, visible focus and press feedback; no decorative animation.
