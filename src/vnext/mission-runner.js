/*
 * vNext mission runner / task selector (issue #47).
 *
 * Turns the planner's capability-level intent into a CONCRETE registered
 * TaskContract inside a mission. The selector never invents a task or a
 * prompt — it can only choose among `mission.taskIds`, and it maps
 * planner kinds to task purposes conservatively:
 *
 *   diagnostic_probe   → diagnostic
 *   resume             → pending input/notice phase, else retrieval /
 *                        production / interaction (never remediation,
 *                        delayed, transfer or assessment)
 *   expose             → input / notice, else the same bounded
 *                        elicitation fallback
 *   retry              → remediation
 *   independent_attempt→ retrieval / production / interaction
 *   delayed_retrieval  → delayed_retrieval
 *   transfer           → transfer
 *   checkpoint         → assessment
 *
 * Trust rules mirroring the projection layer:
 *
 * - Task identity is taskId@taskRevision — selection returns both, and
 *   consumption is revision-scoped. Evidence bound under v1 can never
 *   consume the v2 contract, and the selector always resolves a mission
 *   task id to the highest registered revision.
 * - Only VERIFIED events count as consumption. A raw or forged event
 *   that would fail verifyEventTask cannot mark a task run — the same
 *   registry check that gates evidence credit gates the runner.
 * - Mission integrity fails closed: a declared taskId absent from the
 *   registry, or resolving to a task that fails validateTask, blocks
 *   the whole selection instead of being silently skipped.
 *
 * A planner intent with no compatible mission task is recorded and the
 * capability skipped for this call — never a semantic-purpose
 * substitute. When nothing serveable remains the result is `blocked`
 * (with the uncovered intents listed) or `idle` when no intent existed.
 *
 * The assessment task runs last: only when the mission requires it, it
 * is still unconsumed, and its capability has actually reached
 * TRANSFERRED — a fresh assessment samples achieved ability, it never
 * substitutes for it.
 */
import { projectLearnerState } from './projection.js';
import { planNext } from './planner.js';
import { bindAttempt, bindObservation } from './bind.js';
import { verifyEventTask, validateTask } from './contracts.js';

const EXPOSURE = ['input', 'notice'];
const ELICITABLE = ['retrieval', 'production', 'interaction'];

const INTENT_PURPOSES = {
  diagnostic_probe: ['diagnostic'],
  retry: ['remediation'],
  independent_attempt: ELICITABLE,
  delayed_retrieval: ['delayed_retrieval'],
  transfer: ['transfer'],
  checkpoint: ['assessment'],
  /* Demand-routed substrate repair (issue #61): a support_demand intent
   * can only be served by a support-purpose task — never substituted by
   * a semantically different task on the support cap. */
  support_demand: ['support']
};

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;
const revOf = (t) => t.revision ?? 1;

const ready = (task, reason) => ({
  status: 'ready',
  taskId: task.id,
  taskRevision: revOf(task),
  capabilityId: task.capabilityId,
  purpose: task.purpose,
  reason
});

const blocked = (reason) => ({ status: 'blocked', taskId: null, taskRevision: null, capabilityId: null, purpose: null, reason });

export function nextMissionTask({ learnerId, mission, tasks, capabilities, events, riskPriors = [], now, policy }) {
  /* Registry: keyed by id@revision like projectLearnerState — duplicate
   * registrations are an integrity violation, not last-write-wins. */
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const byKey = new Map();
  const latestById = new Map();
  for (const t of tasks) {
    const key = keyOf(t);
    if (byKey.has(key)) throw new Error(`duplicate task registration '${key}'`);
    byKey.set(key, t);
    const prev = latestById.get(t.id);
    if (!prev || revOf(t) > revOf(prev)) latestById.set(t.id, t);
  }

  /* Fail closed on mission integrity: every declared taskId must resolve
   * to a task that is itself a valid contract. A missing or malformed
   * task is never silently dropped. */
  const integrity = [];
  const missionTasks = [];
  for (const id of mission.taskIds ?? []) {
    const t = latestById.get(id);
    if (!t) {
      integrity.push(`declared task '${id}' is absent from the registry`);
      continue;
    }
    const problems = validateTask(t);
    if (problems.length) {
      integrity.push(`declared task ${keyOf(t)} is invalid: ${problems.join('; ')}`);
      continue;
    }
    missionTasks.push(t);
  }
  if (integrity.length) return blocked(integrity.join('; '));

  /* Consumption is verified-only and revision-scoped: an event marks its
   * task consumed only if it would pass the same registry verification
   * the projection applies. Forged or mis-revisioned events cannot hide
   * an unrun task. */
  const verifiedEvent = new Set();
  const verifiedAttempt = new Set();
  const attemptOutcomes = new Map(); // key → [{outcome, occurredAt, id}] verified only
  for (const e of events) {
    if (e.learnerId !== learnerId) continue;
    const t = byKey.get(`${e.taskId}@${e.taskRevision}`);
    const cap = t ? capById.get(t.capabilityId) : null;
    if (!t || !cap || !verifyEventTask(e, t, cap)) continue;
    const key = keyOf(t);
    verifiedEvent.add(key);
    if (e.attempt?.outcome != null) {
      verifiedAttempt.add(key);
      const list = attemptOutcomes.get(key) ?? [];
      list.push({ outcome: e.attempt.outcome, occurredAt: e.occurredAt, id: e.id });
      attemptOutcomes.set(key, list);
    }
  }
  for (const list of attemptOutcomes.values()) {
    list.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1));
  }

  /* Phase 0 — declared baseline diagnostics run once, in mission order.
   * The mission's baseline must be sampled before the planner's generic
   * ordering: a diagnostic establishes what is actually known, and
   * until every declared probe has produced a VERIFIED outcome the
   * planner cannot see an honest picture. */
  for (const t of missionTasks) {
    if (t.purpose === 'diagnostic' && !verifiedAttempt.has(keyOf(t))) {
      return ready(t, `baseline diagnostic ${keyOf(t)} declared by the mission — not yet sampled`);
    }
  }

  /* Planner intents are capability-scoped; the mission's declared
   * capability surface limits what the selector may route to — a
   * capability outside the mission never gets a task from inside it.
   * The role map also tells the planner HOW to introduce each cap
   * (R6): targets owe a baseline probe, carriers and declared
   * prerequisites rehearse opportunistically, supports wait for a
   * demand signal rather than auto-introducing. */
  const surface = new Set([
    ...(mission.targetCapabilities ?? []),
    ...(mission.carrierCapabilities ?? []),
    ...(mission.prerequisiteCapabilities ?? []),
    ...(mission.supportCapabilities ?? [])
  ]);
  const scopedCaps = capabilities.filter((c) => surface.has(c.id));
  const targets = new Set(mission.targetCapabilities ?? []);
  const roles = {
    targets,
    supports: new Set(mission.supportCapabilities ?? []),
    prereqs: new Set(mission.prerequisiteCapabilities ?? [])
  };

  /* Exposure-phase tasks are one-shot: re-running consumed input is
   * meaningless, so they only qualify while unrun. Eliciting tasks may
   * legitimately repeat (remediation loops, another delayed check) —
   * prefer unrun, fall back to the first declared. The expose/resume
   * fallback reaches only retrieval/production/interaction — it can
   * never skip ahead to remediation, delayed, transfer or assessment. */
  /* Practice and re-check intents may legitimately re-elicit a consumed
   * task — remediation loops, another unaided attempt, and retention
   * re-probes after another lag window are the point (a delayed check
   * re-measures memory on the same practiced prompt). A failed transfer
   * probe may also re-elicit: the engine does not burn a held-out
   * family's novelty on a failure, so the retry is still a valid
   * transfer sample — and once it succeeds the intent never fires
   * again. Diagnostics stay single-sample: a consumed probe already
   * answered what it was meant to ask. */
  /* 'support' is repeatable: a support probe may be re-served for a
   * distinct later demand (a different target or function). Demand
   * bounding lives in the planner's per-pair cycle cap — the selector
   * just stays honest about consumption. */
  const REPEATABLE = new Set(['retrieval', 'production', 'interaction', 'remediation', 'delayed_retrieval', 'transfer', 'support']);
  /* `requiresFunction` scopes a pick to tasks that actually exercise
   * the demanded function — a support_demand must be served by a probe
   * that TESTS the missing function, not merely any task sharing the
   * provider capability (#61 audit: capability-scoped picks serve the
   * wrong evidence and can never consume the demand). */
  const pick = (capId, purposes, { unattemptedOnly = false, requiresFunction = null } = {}) => {
    const candidates = missionTasks.filter((t) =>
      t.capabilityId === capId &&
      purposes.includes(t.purpose) &&
      (requiresFunction == null || (t.response?.requiredFunctions ?? []).includes(requiresFunction)));
    const fresh = candidates.filter((t) => !verifiedAttempt.has(keyOf(t)) && !verifiedEvent.has(keyOf(t)));
    if (fresh[0]) return fresh[0];
    if (unattemptedOnly || purposes.every((p) => !REPEATABLE.has(p))) return null;
    return candidates[0] ?? null;
  };
  const pickPendingPhase = (capId) =>
    pick(capId, EXPOSURE, { unattemptedOnly: true })
      ?? pick(capId, ELICITABLE, { unattemptedOnly: true });

  /* An intent the mission cannot serve is recorded per (capability,
   * kind) and that kind is silenced for THIS call — but it only counts
   * as a hard block when it belongs to a claim-bearing TARGET. Due,
   * transfer or remediation intents on carriers/prerequisite gates are
   * cross-mission backlog (their claim path lives in their origin
   * mission or a later cumulative checkpoint), not this mission's
   * integrity problem — reporting them as `blocked` would freeze every
   * later mission on stale evidence it was never meant to serve. */
  const skipped = [];
  const excluded = new Set();
  for (;;) {
    const plan = planNext(learnerId, events, {
      /* Exclusion is per (capability, intent kind) — caps stay in the
       * surface so they still count as prerequisites and still route
       * their other intents. Filtering a cap out entirely would poison
       * dependent readiness checks and kill unrelated pending work. */
      capabilities: scopedCaps,
      tasks,
      riskPriors,
      now,
      policy,
      skipIntentFor: excluded,
      roles
    });
    if (plan.kind === 'idle') break;
    const task = (plan.kind === 'expose' || plan.kind === 'resume')
      ? pickPendingPhase(plan.capabilityId)
      : pick(plan.capabilityId, INTENT_PURPOSES[plan.kind] ?? [], { requiresFunction: plan.demand?.missingFunction });
    if (task) {
      return ready(task, `${plan.kind} on ${plan.capabilityId}: ${plan.reason}`);
    }
    const purposes = INTENT_PURPOSES[plan.kind] ?? [...EXPOSURE, ...ELICITABLE];
    skipped.push({ capabilityId: plan.capabilityId, kind: plan.kind, reason: `${plan.capabilityId}: planner wants '${plan.kind}' but the mission has no compatible task (${purposes.join('/')})` });
    excluded.add(`${plan.capabilityId}|${plan.kind}`);
  }

  /* Assessment is the mission's closing step — it runs once, after the
   * capability it samples has actually proven transfer. It is never a
   * substitute for transfer work. */
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks, { policy });
  for (const t of missionTasks) {
    if (t.purpose === 'assessment' && mission.assessmentPlan?.required) {
      const attempts = attemptOutcomes.get(keyOf(t)) ?? [];
      const latest = attempts[attempts.length - 1];
      /* A non-success assessment is probed again after remediation —
       * the capability must still hold TRANSFERRED, and the retry is
       * just as fresh as the first sample. */
      if (attempts.length && latest.outcome === 'success') continue;
      if (byCapability.get(t.capabilityId)?.milestones.transferred) {
        return ready(t, latest
          ? `assessment re-probe after ${latest.outcome} outcome — TRANSFERRED still requires a fresh pass`
          : 'assessment plan requires a fresh sample after transfer');
      }
      skipped.push({ capabilityId: t.capabilityId, kind: 'checkpoint', reason: `${t.capabilityId}: assessment '${keyOf(t)}' waits for TRANSFERRED` });
    }
  }

  const fatal = skipped.filter((s) => targets.has(s.capabilityId));
  if (fatal.length) return blocked([...skipped.map((s) => s.reason)].join('; '));
  return {
    status: 'idle',
    taskId: null,
    taskRevision: null,
    capabilityId: null,
    purpose: null,
    reason: skipped.length
      ? `mission plan exhausted; cross-mission backlog remains: ${skipped.map((s) => s.reason).join('; ')}`
      : 'no planner intents and no pending assessment — mission plan exhausted',
    skippedIntents: skipped.map((s) => s.reason)
  };
}

/* Headless trace helper (issue #47 §8): drives a scripted learner
 * through the mission — selector → binder → append → snapshot — and
 * returns an audit log of why each step was taken and what state the
 * capability was in before/after. Diagnostic output only, never UI.
 *
 *   act(task, { step, beforeState }) → array of raw event specs:
 *     { observe: 'exposure'|'support_use'|'feedback', ...raw }
 *     { attempt fields..., support, evaluation }  → bindAttempt
 *   nowAt(step) → deterministic timestamp for the selection call.
 */
export function runMissionTrace({ learnerId, mission, tasks, capabilities, events = [], riskPriors = [], nowAt, act, maxSteps = 60, policy }) {
  const log = [...events];
  const trace = [];
  for (let step = 1; step <= maxSteps; step++) {
    const now = nowAt ? nowAt(step) : undefined;
    const sel = nextMissionTask({ learnerId, mission, tasks, capabilities, events: log, riskPriors, now, policy });
    const task = sel.taskId
      ? tasks.find((t) => t.id === sel.taskId && revOf(t) === sel.taskRevision)
      : null;
    const cap = task ? capByIdFrom(capabilities, task.capabilityId) : null;
    const beforeState = cap
      ? projectLearnerState(learnerId, log, capabilities, tasks, { policy }).byCapability.get(cap.id).state
      : null;
    if (sel.status !== 'ready' || !task || !cap) {
      trace.push({ step, taskId: sel.taskId, taskRevision: sel.taskRevision, purpose: sel.purpose, reason: sel.reason, status: sel.status, beforeState, afterState: beforeState, eventCount: log.length });
      break;
    }
    const acts = act(task, { step, beforeState, now }) ?? [];
    for (const raw of acts) {
      const { observe, ...rest } = raw;
      log.push(observe
        ? bindObservation(task, cap, { eventType: observe, ...rest })
        : bindAttempt(task, cap, rest));
    }
    const afterState = projectLearnerState(learnerId, log, capabilities, tasks, { policy }).byCapability.get(cap.id).state;
    trace.push({ step, taskId: task.id, taskRevision: revOf(task), purpose: task.purpose, reason: sel.reason, status: 'ready', beforeState, afterState, eventCount: log.length });
  }
  return { trace, events: log };
}

const capByIdFrom = (capabilities, id) => capabilities.find((c) => c.id === id) ?? null;
