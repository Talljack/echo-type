/*
 * vNext EvidenceEvent v0 (issue #42, capability-model-v0.md §3).
 *
 * Append-only durable observation of what the learner did. Learner state
 * is ALWAYS a projection of these events — never stored separately.
 */

import { MODALITIES } from './capabilities.js';

export const EVENT_TYPES = [
  'exposure',
  'recognition_attempt',
  'recall_attempt',
  'production_attempt',
  'interaction_turn',
  'support_use',
  'feedback',
  'retry',
  'delayed_retrieval',
  'transfer_attempt',
  'checkpoint',
  /* Support-demand work (issue #61): an attempt on a support-purpose
   * task. It is deliberately NOT a milestone-bearing attempt type — a
   * support probe is remediation context, never proof of ability on the
   * support capability or the target it served. */
  'support_attempt'
];

export const OUTCOMES = ['success', 'partial', 'fail'];
/* 'assessment' is its own context kind — a fresh assessment family is
 * an ability check, not transfer evidence. Only 'transfer' context can
 * feed the TRANSFERRED milestone. */
export const CONTEXT_KINDS = ['practiced', 'transfer', 'assessment'];

/* Evaluation authority v0 (#45 §10): how the outcome was determined is
 * provenance, not decoration — conservative rules live in projection:
 * self_report/asr/ai_llm can never award independent ability. */
export const EVALUATION_AUTHORITIES = ['deterministic', 'human', 'asr', 'ai_llm', 'self_report'];

const defaultSupport = () => ({
  hint: false,
  translation: false,
  transcript: false,
  modelAnswer: false,
  repeat: false,
  // Provenance for how many times the prompt was replayed. `repeat` alone
  // cannot distinguish one replay from many — conditions like
  // 'repeat_once' are only satisfiable when this count is recorded.
  repeatCount: null
});

/* Hints, model answers, translations and transcripts hand the learner
 * the answer — success under them is SUPPORTED work, never INDEPENDENT.
 * `repeat` only replays the prompt: it does not supply the answer, but
 * it is still support — whether it is allowed is the capability's
 * conditions' call, not this function's. */
export function answerBearing(support) {
  if (!support) return false;
  return Boolean(support.hint || support.modelAnswer || support.translation || support.transcript);
}

/* Conditions check: an independent attempt must run under the
 * capability's declared conditions. `conditions.supportAllowed` lists
 * which non-answer-bearing aids are permitted:
 *   []              — no support at all; any flag used disqualifies
 *   'repeat'        — prompt replays allowed, uncounted
 *   'repeat_once'   — at most one replay, and the event must prove it
 *                     (repeatCount === 1); a bare `repeat:true` cannot
 *                     distinguish once from many, so it fails here
 * Answer-bearing aids are handled separately — listing them in
 * supportAllowed can never launder a hinted answer into independence. */
export function conditionsViolated(support, allowed) {
  if (!support) return false;
  const kinds = [];
  if (support.hint) kinds.push('hint');
  if (support.translation) kinds.push('translation');
  if (support.transcript) kinds.push('transcript');
  if (support.modelAnswer) kinds.push('modelAnswer');
  if (support.repeat || (support.repeatCount ?? 0) > 0) kinds.push('repeat');
  for (const kind of kinds) {
    if (kind === 'repeat') {
      const onceOk = allowed.includes('repeat_once') && support.repeatCount === 1;
      if (!onceOk && !allowed.includes('repeat')) return true;
    } else if (!allowed.includes(kind)) {
      return true;
    }
  }
  return false;
}

/* Support revealed during an attempt belongs permanently to that
 * attempt — a retry inside the same attemptId cannot launder itself
 * back into "unaided" by resetting UI flags. unionSupport accumulates
 * flags across events sharing an attemptId (canonical order); a replay
 * reported without a count poisons the merged count so 'repeat_once'
 * can never be satisfied by uncounted provenance. */
export const unionSupport = (a, b) => {
  if (!a) return b ?? null;
  if (!b) return a;
  const uncounted = (a.repeat && a.repeatCount == null) || (b.repeat && b.repeatCount == null);
  const repeatCount = uncounted
    ? null
    : ((a.repeatCount ?? 0) + (b.repeatCount ?? 0)) || null;
  return {
    hint: a.hint || b.hint,
    translation: a.translation || b.translation,
    transcript: a.transcript || b.transcript,
    modelAnswer: a.modelAnswer || b.modelAnswer,
    repeat: a.repeat || (a.repeatCount ?? 0) > 0 || b.repeat || (b.repeatCount ?? 0) > 0,
    repeatCount
  };
};

export function validateEvent(e) {
  const problems = [];
  if (!e || typeof e !== 'object') return ['event must be an object'];
  for (const key of ['id', 'learnerId', 'capabilityId', 'taskId', 'eventType', 'modality']) {
    if (typeof e[key] !== 'string' || !e[key]) problems.push(`missing ${key}`);
  }
  if (!Number.isInteger(e.taskRevision) || e.taskRevision < 1) problems.push('taskRevision must be a positive integer');
  if (!EVENT_TYPES.includes(e.eventType)) problems.push(`unknown eventType ${e.eventType}`);
  if (!MODALITIES.includes(e.modality)) problems.push(`unknown modality ${e.modality}`);
  if (e.attempt?.outcome != null && !OUTCOMES.includes(e.attempt.outcome)) {
    problems.push(`unknown outcome ${e.attempt.outcome}`);
  }
  if (e.context?.practicedOrTransfer != null && !CONTEXT_KINDS.includes(e.context.practicedOrTransfer)) {
    problems.push(`unknown practicedOrTransfer ${e.context.practicedOrTransfer}`);
  }
  if (e.support?.repeatCount != null && (!Number.isInteger(e.support.repeatCount) || e.support.repeatCount < 0)) {
    problems.push('repeatCount must be a non-negative integer or null');
  }
  if (e.attempt?.attemptId != null && typeof e.attempt.attemptId !== 'string') {
    problems.push('attempt.attemptId must be a string when present');
  }
  if (e.evaluation?.authority != null && !EVALUATION_AUTHORITIES.includes(e.evaluation.authority)) {
    problems.push(`unknown evaluation authority ${e.evaluation.authority}`);
  }
  if (e.evaluation?.missingFunctions != null &&
      (!Array.isArray(e.evaluation.missingFunctions) ||
       e.evaluation.missingFunctions.some((f) => typeof f !== 'string' || !f))) {
    problems.push('evaluation.missingFunctions must be a list of function names');
  }
  if (!Number.isFinite(e.occurredAt)) problems.push('occurredAt must be a timestamp');
  return problems;
}

/* Construct a validated event with explicit defaults — support and
 * provenance fields are never left undefined, so a missing flag can
 * never be laundered into "no support used". */
export function makeEvent(fields) {
  const e = {
    context: { missionId: null, practicedOrTransfer: 'practiced', promptFamily: null, partnerType: null },
    attempt: { observed: true, outcome: null, response: null, latencyMs: null, attemptId: null },
    support: defaultSupport(),
    feedback: { given: false, target: null },
    evaluation: { authority: null, contractId: null, evaluator: null, version: null },
    // Binder-stamped provenance (#45): which task contract produced this
    // event. Null only for events built outside the binder (tests/tools).
    binding: null,
    ...fields,
    context: { missionId: null, practicedOrTransfer: 'practiced', promptFamily: null, partnerType: null, ...(fields?.context || {}) },
    attempt: { observed: true, outcome: null, response: null, latencyMs: null, attemptId: null, ...(fields?.attempt || {}) },
    support: { ...defaultSupport(), ...(fields?.support || {}) },
    feedback: { given: false, target: null, ...(fields?.feedback || {}) },
    evaluation: { authority: null, contractId: null, evaluator: null, version: null, ...(fields?.evaluation || {}) }
  };
  const problems = validateEvent(e);
  if (problems.length) throw new Error(`invalid EvidenceEvent: ${problems.join('; ')}`);
  return e;
}
