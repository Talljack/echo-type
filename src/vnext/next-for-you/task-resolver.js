/*
 * Shared deterministic mission-task resolution (Mission 008G).
 *
 * Extracted from candidate-generator.js so the SAME resolution rules
 * answer both questions:
 *
 *   - routing:    "which task does this intent serve?"   (generator)
 *   - proof:      "which task COULD a repair route serve if the fresh
 *                  retest probes were withheld?"            (B1 witness)
 *
 * A task that merely exists in the registry is NOT reachable — the
 * serving mission's taskIds bound the pool, verified-event consumption
 * orders it, and `excludeTaskIds` lets a caller ask the counterfactual
 * without mutating state. B0 never passes exclusions, so production
 * routing is byte-identical.
 */
import { verifyEventTask, validateTask } from '../contracts.js';

export const REPEATABLE = new Set([
  'retrieval', 'production', 'interaction', 'remediation',
  'delayed_retrieval', 'transfer', 'support'
]);

const EXPOSURE_PURPOSES = ['input', 'notice'];
const ELICITING_FOR_INTRO = ['retrieval', 'production', 'interaction'];

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

/* Registry + mission-scope resolution: exact-revision map, latest-by-id,
 * and the mission's declared task list resolved to CURRENT revisions.
 * Integrity violations are collected in the same order the generator
 * historically emitted them (per-task duplicate/invalid, then missing
 * declared ids) — callers must surface them, never swallow. */
export function resolveMissionTasks(mission, tasks) {
  const integrityViolations = [];
  const taskByRev = new Map();
  const latestById = new Map();
  for (const t of tasks) {
    const k = keyOf(t);
    if (taskByRev.has(k)) integrityViolations.push(`duplicate_task_revision:${k}`);
    taskByRev.set(k, t);
    const prev = latestById.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latestById.set(t.id, t);
    if (validateTask(t).length) integrityViolations.push(`invalid_task_contract:${k}`);
  }
  const missionTaskIds = mission ? new Set(mission.taskIds ?? []) : null;
  let missionTasks = tasks;
  if (mission) {
    missionTasks = [];
    for (const id of missionTaskIds) {
      const t = latestById.get(id);
      if (!t) { integrityViolations.push(`missing_declared_task:${id}`); continue; }
      missionTasks.push(t);
    }
  }
  return { missionTasks, missionTaskIds, taskByRev, latestById, integrityViolations };
}

/* Verified-event consumption per task — the same bar the runner and the
 * candidate generator apply: an event resolves to an exact taskId@rev
 * and passes verifyEventTask before it may consume a surface. */
export function deriveTaskConsumption({ learnerId, events, capabilities, taskByRev }) {
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const verifiedAttemptKey = new Set();
  const verifiedEventKey = new Set();
  const lastAttemptByCap = new Map();
  const lastObservedAttemptByCap = new Map();
  const observedFailStreak = new Map();
  const seen = new Set();
  for (const e of [...events].sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1))) {
    if (e.learnerId !== learnerId || seen.has(e.id)) continue;
    seen.add(e.id);
    const t = taskByRev.get(`${e.taskId}@${e.taskRevision}`);
    const cap = t ? capById.get(t.capabilityId) : null;
    if (!t || !cap || !verifyEventTask(e, t, cap)) continue;
    verifiedEventKey.add(keyOf(t));
    if (e.attempt?.outcome != null) {
      verifiedAttemptKey.add(keyOf(t));
      lastAttemptByCap.set(t.capabilityId, { outcome: e.attempt.outcome, task: t, event: e });
      /* STRICT (MEDIUM-11): only an explicit observed===true counts as
       * direct verified performance evidence — a legacy/malformed raw
       * event missing the flag is context, never verified evidence. */
      if (e.attempt.observed === true) {
        lastObservedAttemptByCap.set(t.capabilityId, { outcome: e.attempt.outcome, task: t, event: e });
        observedFailStreak.set(t.capabilityId, e.attempt.outcome === 'success' ? 0 : (observedFailStreak.get(t.capabilityId) ?? 0) + 1);
      }
    }
  }
  return { verifiedEventKey, verifiedAttemptKey, lastAttemptByCap, lastObservedAttemptByCap, observedFailStreak };
}

/* The deterministic servable/pickTask/pendingPhase machinery bound to
 * one (mission, registry, learner, events) slice. `excludeTaskIds`
 * withholds surfaces from every picker — the B1 repair proof's "if the
 * fresh probes stay protected" question. */
export function createTaskResolver({ mission, tasks, learnerId, events, capabilities }) {
  const reg = resolveMissionTasks(mission, tasks);
  const consumption = deriveTaskConsumption({ learnerId, events, capabilities, taskByRev: reg.taskByRev });
  const { missionTasks } = reg;
  const { verifiedEventKey, lastAttemptByCap } = consumption;

  /* Ordered servable stream: fresh (never verified-consumed) tasks in
   * mission-declared order; when nothing fresh remains, the repeatable-
   * purpose matches in mission order. Non-repeatable purposes with all
   * matches consumed yield the empty stream. */
  const optionsFor = (capId, purposes, {
    requiresFunction = null, requiredFunctions = null,
    exceptTaskId = null, excludeTaskIds = null
  } = {}) => {
    const matches = missionTasks.filter((t) =>
      t.capabilityId === capId &&
      purposes.includes(t.purpose) &&
      t.id !== exceptTaskId &&
      !(excludeTaskIds && excludeTaskIds.has(t.id)) &&
      (requiresFunction == null ||
        (t.response?.requiredFunctions ?? []).includes(requiresFunction)) &&
      (requiredFunctions == null ||
        requiredFunctions.some((f) => (t.response?.requiredFunctions ?? []).includes(f))));
    const fresh = matches.filter((t) => !verifiedEventKey.has(keyOf(t)));
    if (fresh.length) return fresh;
    if (purposes.every((p) => !REPEATABLE.has(p))) return [];
    return matches.filter((t) => REPEATABLE.has(t.purpose));
  };

  const servable = (capId, purposes, opts) => optionsFor(capId, purposes, opts)[0] ?? null;

  /* Pending-phase selection (runner's pickPendingPhase): next UNCONSUMED
   * exposure task, else the next unconsumed eliciting one. */
  const pendingPhase = (capId, { excludeTaskIds = null } = {}) => {
    const open = (t) =>
      t.capabilityId === capId &&
      !(excludeTaskIds && excludeTaskIds.has(t.id)) &&
      !verifiedEventKey.has(keyOf(t));
    return missionTasks.find((t) => open(t) && EXPOSURE_PURPOSES.includes(t.purpose))
      ?? missionTasks.find((t) => open(t) && ELICITING_FOR_INTRO.includes(t.purpose))
      ?? null;
  };

  /* Failure-ceiling escape [SAFETY_PRIOR]: past `ceiling` consecutive
   * observed failures on a capability, re-serving the same task is a
   * hard violation — an alternate is offered when one exists. */
  const pickTask = (capId, purposes, f, ceiling, { excludeTaskIds = null } = {}) => {
    const primary = servable(capId, purposes, { excludeTaskIds });
    const lastTask = lastAttemptByCap.get(capId)?.task;
    if (primary && (f.observedFails ?? f.consecutiveFailures) >= ceiling && lastTask && primary.id === lastTask.id) {
      const alt = servable(capId, purposes, { exceptTaskId: lastTask.id, excludeTaskIds });
      return { task: alt ?? primary, identicalRetry: alt == null, alternateTask: alt != null };
    }
    return { task: primary, identicalRetry: false, alternateTask: false };
  };

  return {
    ...reg,
    ...consumption,
    missionTasks,
    optionsFor,
    servable,
    pendingPhase,
    pickTask
  };
}

/* Standalone spec-shaped entry point: resolve what a mission could serve
 * for (capability, purposes, requiredFunctions) with surfaces withheld.
 * Derives its own consumption — used by proofs/tests that do not have a
 * generator-produced resolver at hand. */
export function resolveMissionTaskOptions({ mission, tasks, learnerId, events, capabilities,
  capabilityId, purposes, requiredFunctions = null, excludeTaskIds = null }) {
  const resolver = createTaskResolver({ mission, tasks, learnerId, events, capabilities });
  return resolver.optionsFor(capabilityId, purposes, { requiredFunctions, excludeTaskIds });
}
