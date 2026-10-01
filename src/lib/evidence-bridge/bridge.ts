/*
 * Evidence Bridge — the seam between EchoType and the FlashDay kernel.
 *
 * EchoType submits OBSERVED REALITY (a registered taskId + what the
 * learner actually did); everything semantic is derived from the
 * registered contract: capabilityId, purpose, context, freshness,
 * transfer, evaluation authority. For deterministic contracts the
 * outcome is scored by the kernel evaluator — a UI "correct=true"
 * claim is never trusted (§6/§15).
 *
 *   submitAttempt / submitObservation
 *     → registry resolve → evaluateAttempt → bindAttempt → store.append
 *   projectState → projectLearnerState (replay-derived, never mutable)
 *   nextAction   → selectNextTask in the shipped reference mode
 */
import { bindAttempt, bindObservation } from '@/vnext/bind';
import { evaluateAttempt } from '@/vnext/evaluators';
import { SELECTION_MODES, selectNextTask } from '@/vnext/next-for-you/selector';
import { projectLearnerState } from '@/vnext/projection';
import type {
  AttemptSubmission,
  ContractRegistry,
  EventStore,
  EvidenceEvent,
  LearnerProjection,
  NextTaskDecision,
  ObservationSubmission,
} from './types';

/* Fields a submission may never author — they are contract-derived.
 * taskId is deliberately absent: naming the contract is the caller's
 * one legitimate handle on it. */
const FORGED_SUBMISSION_KEYS = [
  'capabilityId',
  'taskRevision',
  'modality',
  'missionId',
  'promptFamily',
  'practicedOrTransfer',
  'purpose',
  'context',
  'binding',
  'freshness',
  'transfer',
];

const checkForgery = (sub: object) => {
  const rec = sub as Record<string, unknown>;
  for (const key of FORGED_SUBMISSION_KEYS) {
    if (rec[key] != null) {
      throw new Error(`submission may not author '${key}' — it is derived from the TaskContract`);
    }
  }
};

const genEventId = (sub: { id?: string; attemptId?: string }) =>
  sub.id ?? (sub.attemptId ? `evt.${sub.attemptId}` : `evt.${crypto.randomUUID()}`);

const resolveTask = (registry: ContractRegistry, taskId: string) => {
  const task = registry.taskById(taskId);
  if (!task) {
    throw new Error(`unregistered task '${taskId}' — evidence may only bind to a registered contract`);
  }
  const capability = registry.capabilityById(task.capabilityId);
  if (!capability) {
    throw new Error(`registered task '${taskId}' references unknown capability '${task.capabilityId}'`);
  }
  return { task, capability };
};

export async function submitAttempt(
  store: EventStore,
  registry: ContractRegistry,
  sub: AttemptSubmission,
): Promise<EvidenceEvent> {
  checkForgery(sub);
  const { task, capability } = resolveTask(registry, sub.taskId);

  /* Outcome ownership: a declared evaluation contract re-scores the
   * response (caller's outcome is ignored — the UI cannot claim
   * success). Without a contract, the caller's report is honored but
   * stamped with the task's declared authority — self_report/asr/
   * ai_llm evidence can never mint independent credit either. */
  const outcome = task.evaluation?.contractId
    ? (evaluateAttempt(task as never, sub.response)?.outcome ?? null)
    : (sub.outcome ?? null);

  const event = bindAttempt(task as never, capability as never, {
    id: genEventId(sub),
    learnerId: sub.learnerId,
    occurredAt: sub.occurredAt,
    eventType: sub.eventType,
    attempt: {
      observed: true,
      outcome,
      response: sub.response,
      latencyMs: sub.latencyMs,
      attemptId: sub.attemptId,
    },
    support: sub.support,
    feedback: sub.feedback,
    partnerType: sub.partnerType,
    evaluation: {
      evaluator: sub.evaluation?.evaluator,
      version: sub.evaluation?.version,
      ...(sub.evaluation?.missingFunctions ? { missingFunctions: sub.evaluation.missingFunctions } : {}),
    },
  }) as EvidenceEvent;
  await store.append([event]);
  return event;
}

export async function submitObservation(
  store: EventStore,
  registry: ContractRegistry,
  sub: ObservationSubmission,
): Promise<EvidenceEvent> {
  checkForgery(sub);
  const { task, capability } = resolveTask(registry, sub.taskId);
  const event = bindObservation(task as never, capability as never, {
    id: genEventId(sub),
    learnerId: sub.learnerId,
    occurredAt: sub.occurredAt,
    eventType: sub.eventType,
    attempt: sub.attempt,
    support: sub.support,
    feedback: sub.feedback,
    partnerType: sub.partnerType,
    evaluation: {
      evaluator: sub.evaluation?.evaluator,
      version: sub.evaluation?.version,
    },
  }) as EvidenceEvent;
  await store.append([event]);
  return event;
}

/** Replay-derived learner state — never mutated, always recomputed. */
export async function projectState(
  learnerId: string,
  store: EventStore,
  registry: ContractRegistry,
): Promise<LearnerProjection> {
  const events = await store.list();
  return projectLearnerState(
    learnerId,
    events,
    registry.capabilities as never,
    registry.tasks as never,
  ) as LearnerProjection;
}

/** "Next For You": the shipped deterministic policy over live evidence. */
export async function nextAction(
  registry: ContractRegistry,
  input: {
    learnerId: string;
    missionId: string;
    events: EvidenceEvent[];
    now: number;
    riskPriors?: unknown[];
    policy?: unknown;
  },
): Promise<NextTaskDecision> {
  const mission = registry.missionById(input.missionId);
  if (!mission) {
    throw new Error(`unregistered mission '${input.missionId}'`);
  }
  return selectNextTask({
    // The shipped deterministic runner. B0/B1 are experiment surfaces —
    // production never selects them today.
    mode: SELECTION_MODES.REFERENCE,
    learnerId: input.learnerId,
    mission,
    tasks: registry.tasks,
    capabilities: registry.capabilities,
    events: input.events,
    riskPriors: input.riskPriors ?? [],
    now: input.now,
    policy: input.policy,
  }) as NextTaskDecision;
}
