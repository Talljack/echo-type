/*
 * vNext capability-state projection (issue #42, capability-model-v0.md §2).
 *
 * States are DERIVED from the append-only event log, never stored:
 *
 *   NOT_SEEN → EXPOSED → SUPPORTED → INDEPENDENT → RETAINED → TRANSFERRED → FLUENT
 *
 * The milestone rules encode the spec's non-negotiables:
 *   - exposure is any modality-matched contact, including a failed probe;
 *   - SUPPORTED = a success that needed answer-bearing help or was not
 *     observed (self-report cannot prove independence);
 *   - INDEPENDENT = an observed, unaided success on an ATTEMPT event;
 *   - RETAINED = another unaided observed success ≥ RETENTION_DELAY_MS
 *     after the first independent success;
 *   - TRANSFERRED = an unaided observed success in a 'transfer' context
 *     whose promptFamily was never rehearsed — a family practiced WITH
 *     support is still rehearsed and cannot pass as novel;
 *   - FLUENT — RESERVED, unreachable in v0. The doctrine requires
 *     hesitation + intelligibility + successful turns + repairs +
 *     stability; no single field measures that yet and "responded
 *     faster" is not fluency. The milestone and state exist so the enum
 *     is stable, but nothing promotes into it until a dedicated
 *     fluency-evidence contract is calibrated.
 *
 * Hard boundaries:
 *   - only ATTEMPT_TYPES may advance state — an exposure/feedback/support
 *     record carrying an outcome field is context, not performance;
 *   - only events for THIS learner and THIS modality count — a speaking
 *     event can never mark a listening capability learned, and a mixed
 *     learner log can never cross-contaminate;
 *   - canonical order is (occurredAt, id) — arrival order can never
 *     change the projection; replay of the same event set is identical.
 */
import { answerBearing, conditionsViolated, unionSupport } from './evidence.js';
import { effectiveAllowedSupport, verifyEventTask } from './contracts.js';
import { resolvePolicy } from './policy.js';

export const CAPABILITY_STATES = [
  'NOT_SEEN',
  'EXPOSED',
  'SUPPORTED',
  'INDEPENDENT',
  'RETAINED',
  'TRANSFERRED',
  'FLUENT'
];

// "A meaningful delay" — v0 pins this at 24h. It is a named constant so
// the day we calibrate it, every test and every learner sees the same rule.
export const RETENTION_DELAY_MS = 24 * 60 * 60 * 1000;

const ATTEMPT_TYPES = new Set([
  'recognition_attempt',
  'recall_attempt',
  'production_attempt',
  'interaction_turn',
  'retry',
  'delayed_retrieval',
  'transfer_attempt',
  'checkpoint'
]);

const isSuccess = (e) => e.attempt?.outcome === 'success';

/* Only a deterministic evaluator or an observed human judgment can
 * award independent ability in v0:
 *   self_report — the learner's own claim is not observation;
 *   asr         — transcript recognition proves what was detected, not
 *                 pronunciation or intelligibility;
 *   ai_llm      — feedback/secondary signal only, never proficiency;
 *   absent      — no evaluator provenance = no credit.
 */
const INDEPENDENT_AUTHORITIES = new Set(['deterministic', 'human']);

/* Support revealed during an attempt belongs permanently to that
 * attempt — the union semantics live in evidence.js so the projection
 * and the pilot oracle apply the SAME accumulation rule without sharing
 * the milestone logic itself. */

// Observed, unaided, condition-valid, authority-backed success on an
// event VERIFIED against the registered task contract — the only
// evidence that can carry a capability past SUPPORTED. A binder stamp
// is not trusted on its own: verifyEventTask re-derives purpose,
// family, context, evaluator and effective support from the registry
// task, so a forged `binding` on a raw makeEvent() cannot mint
// independent evidence.
const isIndependent = (e, cap, support, task) =>
  isSuccess(e) &&
  e.attempt?.observed === true &&
  !answerBearing(support) &&
  !conditionsViolated(support, effectiveAllowedSupport(cap, task)) &&
  INDEPENDENT_AUTHORITIES.has(e.evaluation?.authority) &&
  verifyEventTask(e, task, cap);

function emptyCapability() {
  return {
    state: 'NOT_SEEN',
    milestones: {
      exposed: false,
      supported: false,
      independent: false,
      retained: false,
      transferred: false,
      fluent: false
    },
    lastEventAt: null,
    lastAttemptOutcome: null,
    consecutiveFailures: 0,
    firstIndependentAt: null,
    lastIndependentSuccessAt: null,
    rehearsedPromptFamilies: [],
    transferPromptFamilies: []
  };
}

export function projectLearnerState(learnerId, events, capabilities, tasks, { retentionDelayMs, policy } = {}) {
  // Thresholds are POLICY, not engine (issue #52): the caller's
  // retentionDelayMs is a test override; otherwise the versioned
  // learning policy decides. resolvePolicy fails closed on garbage.
  const pol = resolvePolicy(policy);
  const lag = retentionDelayMs ?? pol.retention.minLagMs;
  // A projection is always for exactly one learner — a log mixing
  // learners must never merge into one state.
  if (typeof learnerId !== 'string' || !learnerId) {
    throw new Error('projectLearnerState requires a learnerId');
  }
  // The task registry is the trust boundary for independent credit:
  // events whose taskId@taskRevision does not resolve to a registered
  // contract, or whose stamped semantics disagree with it, are still
  // recorded (EXPOSED/SUPPORTED) but can never prove independence.
  // Keyed by id@revision — a v2 contract must not overwrite v1, or
  // replaying history would silently reinterpret old evidence under a
  // different contract. Duplicate id@revision registrations are an
  // integrity violation, not a last-write-wins.
  if (!Array.isArray(tasks)) {
    throw new Error('projectLearnerState requires the registered task list');
  }
  const taskByRev = new Map();
  for (const t of tasks) {
    const key = `${t?.id}@${t?.revision}`;
    if (taskByRev.has(key)) throw new Error(`duplicate task registration '${key}'`);
    taskByRev.set(key, t);
  }
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const byCapability = new Map(capabilities.map((c) => [c.id, emptyCapability()]));

  // Canonical replay order: (occurredAt, id). Two deliveries of the same
  // event set produce the same projection regardless of arrival order;
  // ids dedupe resynced duplicates.
  const seenIds = new Set();
  const mine = [];
  for (const e of events) {
    if (e.learnerId !== learnerId) continue;
    if (seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    mine.push(e);
  }
  mine.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Support sticks to an attempt boundary: the union of every flag seen
  // so far on this attemptId applies to all later events on it.
  const supportByAttempt = new Map();

  for (const e of mine) {
    const cap = byId.get(e.capabilityId);
    const slot = byCapability.get(e.capabilityId);
    if (!cap || !slot) continue;
    // Modality isolation: evidence only counts for the modality the
    // capability declares. A written event on a listening capability is
    // recorded but earns nothing.
    if (e.modality !== cap.modality) continue;

    slot.milestones.exposed = true;
    slot.lastEventAt = e.occurredAt;

    // Families encountered in ANY non-transfer context — practiced or
    // assessment — are rehearsed: an assessed family cannot later be
    // re-sold as a novel transfer context either.
    if (e.context?.practicedOrTransfer !== 'transfer' && e.context?.promptFamily) {
      if (!slot.rehearsedPromptFamilies.includes(e.context.promptFamily)) {
        slot.rehearsedPromptFamilies.push(e.context.promptFamily);
      }
    }

    // Attempt-boundary accumulation happens for EVERY event kind — a
    // support_use/feedback record on this attempt is part of its support
    // history. The boundary key is task-scoped: reusing the same
    // attemptId on a different task must not leak support across.
    const aid = e.attempt?.attemptId;
    let effSupport = e.support;
    if (aid) {
      const key = `${e.taskId}::${aid}`;
      const prior = supportByAttempt.get(key) ?? null;
      effSupport = unionSupport(prior, e.support);
      supportByAttempt.set(key, effSupport);
    }

    // Non-attempt events may carry an outcome field; it is context, not
    // performance, and must not advance state.
    if (!ATTEMPT_TYPES.has(e.eventType) || e.attempt?.outcome == null) continue;
    slot.lastAttemptOutcome = e.attempt.outcome;
    // Engine fact: how many consecutive fail/partial outcomes end this
    // capability's attempt trail. Whether N failures trigger remediation
    // is the policy's call, not the projection's.
    slot.consecutiveFailures = (e.attempt.outcome === 'fail' || e.attempt.outcome === 'partial')
      ? slot.consecutiveFailures + 1
      : 0;
    if (!isSuccess(e)) continue;

    if (!isIndependent(e, cap, effSupport, taskByRev.get(`${e.taskId}@${e.taskRevision}`))) {
      slot.milestones.supported = true;
      continue;
    }

    slot.milestones.independent = true;
    if (slot.firstIndependentAt == null) {
      slot.firstIndependentAt = e.occurredAt;
    }
    slot.lastIndependentSuccessAt = e.occurredAt;
    if (e.occurredAt - slot.firstIndependentAt >= lag) {
      slot.milestones.retained = true;
    }

    if (e.context?.practicedOrTransfer === 'transfer') {
      const family = e.context?.promptFamily;
      const novel = family && !slot.rehearsedPromptFamilies.includes(family);
      if (novel && !slot.transferPromptFamilies.includes(family)) {
        slot.transferPromptFamilies.push(family);
      }
      if (slot.transferPromptFamilies.length >= 1) slot.milestones.transferred = true;
    }
  }

  for (const slot of byCapability.values()) {
    let highest = 'NOT_SEEN';
    for (const name of ['EXPOSED', 'SUPPORTED', 'INDEPENDENT', 'RETAINED', 'TRANSFERRED', 'FLUENT']) {
      if (slot.milestones[name.toLowerCase()]) highest = name;
    }
    slot.state = highest;
  }
  return { learnerId, byCapability, generatedFrom: mine.length, policyVersion: pol.version };
}
