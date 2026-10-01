# FLASHDAY_ARCHITECTURE.md — EchoType body, FlashDay brain

> Doctrine: `activity ≠ learning ≠ retention ≠ transfer ≠ proficiency`.
> A score is an observation; a capability claim comes only from
> FlashDay contracts + evidence rules.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│ PRODUCT SHELL (EchoType — keep)                          │
│  Next.js 16 UI: Listen · Read · Speak · Write · Library  │
│  Import (YT/PDF/URL/audio) · TTS/STT transport · Auth    │
│  Supabase sync · Tauri desktop · AI provider abstraction │
└──────────────┬──────────────────────────────────────────┘
               │ observed activity only (never semantics)
               ▼
┌─────────────────────────────────────────────────────────┐
│ EVIDENCE BRIDGE (new — the seam this milestone proves)   │
│  exercise result ──► registered Task contract            │
│                  ──► evaluator (authority-stamped)       │
│                  ──► bindAttempt → EvidenceEvent         │
│  UI may supply ONLY observed reality. Semantic fields    │
│  (capabilityId, purpose, freshness, outcome credit) are  │
│  contract-derived; supplying them throws.                │
└──────────────┬──────────────────────────────────────────┘
               │ append-only events
               ▼
┌─────────────────────────────────────────────────────────┐
│ LEARNING KERNEL (FlashDay vNext — vendored, byte-stable) │
│  capabilities (DAG+conditions+evidence reqs)             │
│  contracts (Mission/Task/Assessment validators)          │
│  evidence (validated append-only events, support flags)  │
│  bind (sole mint; forgery-proof)                         │
│  projection → learner state (separate dimensions)        │
│  learner-model (read view, no mastery score)             │
│  planner + next-for-you (auditable decisions)            │
│  correction-episodes (repair) · support-demand routing   │
└──────────────┬──────────────────────────────────────────┘
               │ decision + reason
               ▼
┌─────────────────────────────────────────────────────────┐
│ TODAY — "best next session" recommendation               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MEMORY MODEL (EchoType FSRS — keep, keep separate)       │
│  ts-fsrs scheduling. Memory strength ≠ ability.          │
└─────────────────────────────────────────────────────────┘
```

## Capability model (kernel-owned)

- Capability = observable ability under stated conditions
  (`reception.*` / `production.*` / `interaction.*`), never a lesson
  position. Prerequisites = hard dependency edges only; pedagogy
  ordering lives in mission `recommendedAfterMissions`.
- Claims are milestone states: `NOT_SEEN → EXPOSED → SUPPORTED →
  INDEPENDENT → RETAINED → TRANSFERRED`, each with its own evidence
  bar. `assessment` context ≠ `transfer` context.

## Task & mission contracts (kernel-owned)

- Task purposes: diagnostic, input, notice, retrieval, production,
  interaction, remediation, delayed_retrieval, transfer, assessment,
  support. Purpose gates the event types it may mint
  (`EVENT_TYPES_FOR_PURPOSE`) — a retrieval task cannot emit
  `transfer_attempt`.
- Missions combine capabilities in a real-world scenario with a staged
  lifecycle (diagnostic → input → supported attempt → feedback →
  retry → delayed retrieval → transfer → assessment).
- Contracts are executable validators — a task violating its own
  purpose class fails before learners touch it.

## Evidence flow

```
UI action → outcome observed (score/transcript/self-report)
  → evaluator (authority: deterministic|human|asr|ai_llm|self_report)
  → bindAttempt(task, capability, raw)     ← sole mint, throws on
      caller-supplied semantics (FORGED_FIELDS)
  → EvidenceEvent (validated, support flags, binding provenance)
  → append to event log (Dexie events table; Supabase sync later)
  → projectLearnerState / learnerModel / planNext
```

Rules that make this trustworthy:

- `asr`/`ai_llm`/`self_report` authority can never award independent
  ability — STT transcript match cannot mint pronunciation evidence.
- Support flags (hint/translation/transcript/modelAnswer/repeat) are
  honest provenance: recorded always, credited by conditions —
  `answerBearing` support demotes an attempt to SUPPORTED.
- `unionSupport` accumulates per attemptId — a retry cannot launder a
  hinted attempt into "unaided".
- Events are immutable, deduped by id, replayed in canonical order —
  learner state is always a projection, never stored.

## Planner / Next For You

- `planNext`/`selectNextTask` produce the next task **with a decision
  record** (`decisionAuditRecord`) — "12 min — best next session"
  carries a reason the UI can show.
- Support-demand routing: a failed attempt whose evaluation reports
  `missingFunctions` can mint a `support` probe — remediation context,
  never claim-bearing.
- Correction episodes track repair lifecycle (miss → repair → retest
  → verified/relapsed) with burned-surface semantics.

## Speaking evaluation boundary

- STT (Web Speech / server fallback) records response + history only.
- `evaluation.authority = 'asr'` — response recorded, never
  pronunciation/transfer credit.
- Candidate acoustic evaluator: Halleck45/OpenPronounce (MIT) —
  expected/heard phones, phoneme diffs, word errors, confidence,
  prosody. **Audit before integrate**: model size, latency, hosting,
  correctness vs a labeled sample. Not in milestone 1.

## Content / import flow

Keep EchoType's pipeline (YouTube/PDF/URL/audio/text) → `contents`
table. Kernel overlay: imported content becomes carrier material;
curriculum authoring binds tasks to capabilities via
`curriculum-checks` (namespaced ids, `targetCapabilities` ≤3 with
coverage debts, `carrierCapabilities`, `supportCapabilities`,
`contextSignature`, canonical `pf.<cap>.<cue>.<setting>.<register>.
<channel>.<hash>.vN` prompt families).

## Persistence strategy

- **Events (kernel)**: Dexie table `evidenceEvents` (schema v21:
  `id, learnerId, taskId, capabilityId, occurredAt,
  [learnerId+occurredAt]`) — append-only by convention + content-
  fingerprint dedupe (identical redelivery dedupes; same id +
  different content throws). Supabase mirror: append-only table +
  insert-only policy. `occurredAt` (client-observed) vs
  `recordedAt` (server-arrival) kept distinct.
- **Everything else**: existing EchoType tables unchanged.
- FSRS data stays on `records.fsrsCard` — scheduler state, not ability.

## Migration strategy

1. DONE — vendored kernel byte-identically into `src/vnext/` (26
   files) + the one pure external dep `src/core/mission-checks.js`
   (imported by `evaluators.js`). `mission-runner.js` IS vendored —
   `selectNextTask`'s shipped `reference` mode is `nextMissionTask`.
   Excluded: `ui-session.js`, `ui/` (FlashDay-UI coupled —
   `../../ui/speech.js`). Vendored code is biome-excluded and
   typecheck-unchecked (`include` covers `.ts`/`.tsx` only) so a
   future kernel sync is a byte-diff, never a merge conflict.
   Sanity: 18/18 modules import cleanly in Node; `allowJs` resolves
   the `.js` imports for TypeScript consumers.
2. DONE — bridge shipped at `src/lib/evidence-bridge/`:
   - `registry.ts` — `createRegistry` runs the kernel authoring gate
     (`checkCurriculum`) so an unshippable contract set cannot mint
     evidence; `fixtureRegistry()` wires the vendored curriculum.
   - `bridge.ts` — `submitAttempt`/`submitObservation` accept only
     observed reality (taskId + response/support/timing); forged
     semantic keys throw; deterministic `contractId` tasks re-score
     the response via `evaluateAttempt` (caller outcome ignored).
   - `store.ts` — `createDexieEventStore` mirrors the kernel store
     surface over `db.evidenceEvents`.
   - `projectState` / `nextAction` — replay-derived learner state
     and Next-For-You decisions with reasons.
   - 27 contract pins in `evidence-bridge.test.ts` (forgery,
     correct!=capability, completion!=mastery, supported!=independent,
     STT!=pronunciation, practiced!=transfer, assessment attemptId,
     FSRS-inertness, learner isolation, dedupe/conflict, persist->
     replay determinism, retention lag, auditable decisions).
3. Today surface: render `selectNextTask` decision + reason.
4. Vertical slice: `meeting-someone` mission through real UI —
   `mission.meet_new_person` fixtures already carry 18 tasks.
5. Rebrand only after slice verified — name at the shell surface,
   MIT attribution preserved in `LICENSE` + NOTICE.

## Non-goals (per mission)

- No A1→C2 curriculum; initial guided path A0/A1 → early A2.
- No EchoType rewrite; no mass renaming.
- No LLM-authored proficiency; no gamification-as-evidence.
- No STT-as-pronunciation; no FSRS-as-ability.
