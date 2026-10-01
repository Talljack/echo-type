/*
 * vNext evidence binder (issue #45, spec §5).
 *
 * `bindAttempt(task, capability, raw)` is the ONLY way learner-facing
 * code produces an EvidenceEvent. Everything that gives evidence its
 * meaning — capabilityId, taskId, taskRevision, modality, missionId,
 * promptFamily, practicedOrTransfer, task purpose, evaluation contract —
 * is derived from the Task contract, never from the caller.
 *
 * The caller may supply ONLY observed reality:
 *   id, learnerId, occurredAt, eventType, attempt (incl. attemptId),
 *   support actually used, feedback given, partnerType, evaluation report.
 *
 * A caller that passes context/promptFamily/practicedOrTransfer/purpose
 * or identity fields is trying to author semantics — the binder throws.
 *
 * Disallowed support is still recorded faithfully (the log must tell the
 * truth); the projection then demotes the attempt to SUPPORTED because
 * it violated the effective conditions. Recording ≠ crediting.
 */
import { makeEvent } from './evidence.js';
import {
  CONTEXT_FOR_FAMILY,
  ELICITING_PURPOSES,
  EVENT_TYPES_FOR_PURPOSE,
  effectiveAllowedSupport
} from './contracts.js';

/* Non-attempt observation records — exposure/support/feedback carry no
 * outcome credit, so any purpose may file them honestly. */
const OBSERVATION_TYPES = new Set(['exposure', 'support_use', 'feedback']);

// Fields the caller is forbidden to supply — they are contract-derived.
const FORGED_FIELDS = [
  'capabilityId', 'taskId', 'taskRevision', 'modality', 'missionId',
  'promptFamily', 'practicedOrTransfer', 'purpose', 'context', 'binding', 'freshness', 'transfer'
];

const checkForgery = (raw) => {
  for (const k of FORGED_FIELDS) {
    if (raw?.[k] != null) throw new Error(`bindAttempt: caller may not author '${k}' — it comes from the Task contract`);
  }
};

const derivedContext = (task, raw) => ({
  missionId: task.missionId,
  practicedOrTransfer: CONTEXT_FOR_FAMILY[task.freshness?.familyClass ?? 'practiced'],
  promptFamily: task.promptFamily,
  partnerType: raw?.partnerType ?? null
});

const bindEvaluation = (task, raw) => {
  // Authority is contract-derived — the caller may report evaluator
  // identity/version, never a stronger authority than declared.
  const declared = task.evaluation?.authority ?? 'deterministic';
  if (raw?.evaluation?.authority != null && raw.evaluation.authority !== declared) {
    throw new Error(
      `authority mismatch: task declares '${declared}', caller reported '${raw.evaluation.authority}'`
    );
  }
  const contractId = task.evaluation?.contractId ?? null;
  if (raw?.evaluation?.contractId != null && contractId != null && raw.evaluation.contractId !== contractId) {
    throw new Error(`evaluation contract mismatch: task declares '${contractId}', caller reported '${raw.evaluation.contractId}'`);
  }
  /* missingFunctions is evaluator output (issue #61): the caller may
   * report it, but every entry must be a function the task itself
   * declares — a function outside response.requiredFunctions is forged
   * provenance, and a support demand must never route on it. Whether
   * the task's contract may attribute a miss at all is the planner's
   * separate check (contractAttributesFunctions). */
  const required = task.response?.requiredFunctions ?? [];
  const missing = raw?.evaluation?.missingFunctions ?? [];
  if (!Array.isArray(missing) || missing.some((f) => typeof f !== 'string' || !f)) {
    throw new Error('evaluation.missingFunctions must be a list of function names');
  }
  if (missing.some((f) => !required.includes(f))) {
    throw new Error(`evaluation.missingFunctions must be a subset of the task's requiredFunctions — got '${missing.filter((f) => !required.includes(f)).join(', ')}'`);
  }
  return {
    authority: declared,
    contractId,
    evaluator: raw?.evaluation?.evaluator ?? null,
    version: raw?.evaluation?.version ?? null,
    missingFunctions: missing
  };
};

const bindingMeta = (task, capability) => ({
  purpose: task.purpose,
  familyClass: task.freshness?.familyClass ?? 'practiced',
  freshnessRequired: task.freshness?.required === true,
  effectiveSupportAllowed: effectiveAllowedSupport(capability, task)
});

export function bindAttempt(task, capability, raw = {}) {
  if (task.capabilityId !== capability.id) {
    throw new Error(`task '${task.id}' belongs to capability '${task.capabilityId}', not '${capability.id}'`);
  }
  if (task.modality !== capability.modality) {
    throw new Error(`task '${task.id}' modality '${task.modality}' mismatches capability '${capability.modality}'`);
  }
  if (!ELICITING_PURPOSES.has(task.purpose)) {
    throw new Error(`purpose '${task.purpose}' cannot produce attempts — exposure tasks bind observations`);
  }
  checkForgery(raw);

  const allowed = EVENT_TYPES_FOR_PURPOSE[task.purpose];
  const eventType = raw.eventType ?? allowed[0];
  if (!allowed.includes(eventType)) {
    throw new Error(`purpose '${task.purpose}' cannot emit '${eventType}'`);
  }
  if (task.purpose === 'assessment' && typeof raw.attempt?.attemptId !== 'string') {
    throw new Error('assessment attempts require a stable attempt.attemptId');
  }

  return makeEvent({
    id: raw.id,
    learnerId: raw.learnerId,
    capabilityId: capability.id,
    taskId: task.id,
    taskRevision: task.revision,
    eventType,
    modality: task.modality,
    occurredAt: raw.occurredAt,
    context: derivedContext(task, raw),
    attempt: raw.attempt,
    support: raw.support,
    feedback: raw.feedback,
    evaluation: bindEvaluation(task, raw),
    binding: bindingMeta(task, capability)
  });
}

/* Exposure / support_use / feedback records — still contract-bound so
 * they carry the right family/provenance, but they cannot produce
 * outcome evidence by construction (the projection ignores outcomes on
 * non-attempt types). */
export function bindObservation(task, capability, raw = {}) {
  if (task.capabilityId !== capability.id) {
    throw new Error(`task '${task.id}' belongs to capability '${task.capabilityId}', not '${capability.id}'`);
  }
  checkForgery(raw);
  const eventType = raw.eventType ?? 'exposure';
  if (!OBSERVATION_TYPES.has(eventType)) {
    throw new Error(`bindObservation only binds exposure/support_use/feedback, got '${eventType}'`);
  }
  return makeEvent({
    id: raw.id,
    learnerId: raw.learnerId,
    capabilityId: capability.id,
    taskId: task.id,
    taskRevision: task.revision,
    eventType,
    modality: task.modality,
    occurredAt: raw.occurredAt,
    context: derivedContext(task, raw),
    attempt: { ...(raw.attempt || {}), outcome: null },
    support: raw.support,
    feedback: raw.feedback,
    evaluation: bindEvaluation(task, raw),
    binding: bindingMeta(task, capability)
  });
}
