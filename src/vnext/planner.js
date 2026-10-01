/*
 * vNext deterministic planner (issue #42, architecture.md).
 *
 * Picks the learner's next action from evidence — inspectable, no model.
 * Priority order (spec):
 *   1. resume safe in-flight work;
 *   2. due retrieval;
 *   3. remediation — only for capabilities that were ever taught;
 *   4. scheduled transfer;
 *   5. continue current mission (supported → unaided attempt);
 *   6. diagnostic probes + introduce next eligible capability.
 *
 * A baseline failure is a diagnostic, not remediation: retrying an
 * untaught capability is pointless, so a capability that has never had a
 * supported/independent success is routed to teaching, not retry.
 *
 * Every action carries a reason so the plan is explainable.
 */
import { RETENTION_DELAY_MS, projectLearnerState } from './projection.js';
import { priorById } from './risk-priors.js';
import { resolvePolicy } from './policy.js';
import { verifyEventTask } from './contracts.js';
import { contractAttributesFunctions } from './evaluators.js';

/* Derive outstanding support demands from the event log (issue #61).
 *
 * A demand exists only when a VERIFIED attempt on a claim-bearing
 * capability failed under an evaluator contract that can attribute the
 * miss, and the stamped missingFunctions ⊆ the task's declared
 * requiredFunctions resolve to a declared support provider.
 *
 * Resolution state machine per (targetCapability, function) pair:
 *   issued    — the failure attributed the function
 *   consumed  — a later VERIFIED support_attempt on the provider cap
 *               whose task actually requires that function (success or
 *               fail — one probe cycle per demand; a probe cannot
 *               resolve evidence it never tested)
 *   cancelled — a later verified success on a TARGET task that itself
 *               requires the function: demonstrated recovery is the
 *               only evidence that retires a demand, and it also
 *               re-arms the pair's cycle budget (the episode closed).
 *               A success that never exercised the function proves
 *               nothing about it.
 *   re-issue  — bounded per unresolved episode by
 *               policy supportDemand.maxCyclesPerPair; the budget is
 *               lifetime-safe because demonstrated recovery resets it.
 *
 * Returns the full demand lifecycle — `pending` (still outstanding) and
 * `resolved` (consumed or cancelled) — in canonical issue order.
 * Everything is re-derived from events every call — replay is
 * deterministic and a foreign learner's log cannot satisfy a demand
 * (learnerId filter). The learner model reads the same derivation:
 * it never invents a second demand history. */
export function deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy }) {
  if (!roles?.supports?.size) return { pending: [], resolved: [] };
  const pol = resolvePolicy(policy);
  const maxCycles = pol.supportDemand?.maxCyclesPerPair ?? 1;
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const taskByRev = new Map(tasks.map((t) => [`${t.id}@${t.revision ?? 1}`, t]));

  const scoped = new Set(capabilities.map((c) => c.id));
  const isSupport = (id) => roles.supports.has(id);

  /* Deterministic provider pick for one missing function: only declared
   * support caps that actually provide `fn` qualify; among them prefer
   * the cap covering the most of THIS failure's missing functions, ties
   * break on capability id. Explainable: "the substrate that fixes the
   * most of what the learner demonstrably missed". */
  const pickProvider = (fn, allMissing) => {
    let best = null;
    let bestCover = 0;
    for (const id of [...roles.supports].sort()) {
      const c = capById.get(id);
      if (!c || !scoped.has(c.id)) continue;
      if (!(c.providesFunctions ?? []).includes(fn)) continue;
      const cover = allMissing.filter((f) => c.providesFunctions.includes(f)).length;
      if (!best || cover > bestCover) {
        best = c;
        bestCover = cover;
      }
    }
    return best;
  };

  const mine = events
    .filter((e) => e.learnerId === learnerId)
    .sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const pending = new Map(); // `${targetCap}|${fn}` → demand record
  const resolved = [];       // issued demands retired by consume/cancel
  const issued = new Map();  // pair key → the demand record (for lifecycle history)
  const cycles = new Map();  // pair key → consumed count in the OPEN episode
  const seenIds = new Set(); // resynced duplicates replay idempotently
  for (const e of mine) {
    if (seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    const t = taskByRev.get(`${e.taskId}@${e.taskRevision}`);
    const cap = t ? capById.get(t.capabilityId) : null;
    if (!t || !cap || !scoped.has(cap.id) || !verifyEventTask(e, t, cap)) continue;
    /* Same evidence bar as the projection: an UNOBSERVED outcome
     * (self-report) can neither issue, consume nor cancel a demand —
     * routing substrate work on unobserved claims is how support
     * laundering starts. */
    if (e.attempt?.observed !== true) continue;

    if (e.eventType === 'support_attempt') {
      /* A verified probe consumes only the demands it actually TESTED:
       * coverage proof is the probe task's requiredFunctions. A probe
       * for fn_a can never resolve a pending fn_b demand — one probe
       * must not stand in for evidence it did not collect. */
      const covered = new Set(t.response?.requiredFunctions ?? []);
      for (const [key, d] of pending) {
        if (d.supportCapabilityId === e.capabilityId && covered.has(d.missingFunction)) {
          pending.delete(key);
          cycles.set(key, (cycles.get(key) ?? 0) + 1);
          resolved.push({ ...d, status: 'consumed', resolvedByEventId: e.id, resolvedAt: e.occurredAt, probeTaskId: t.id });
        }
      }
      continue;
    }

    if (e.attempt?.outcome == null) continue;

    if (e.attempt.outcome === 'success') {
      /* Demonstrated recovery is the ONLY evidence that retires a
       * demand: a verified success on a task requiring the function
       * cancels the pending demand for it AND resets the pair's cycle
       * budget — the episode closed, so a substrate gap re-evidenced
       * weeks later routes a fresh probe (the bound is per unresolved
       * episode, never a lifetime ban). */
      for (const fn of t.response?.requiredFunctions ?? []) {
        const key = `${e.capabilityId}|${fn}`;
        if (pending.delete(key)) {
          resolved.push({ ...(issued.get(key) ?? { targetCapabilityId: e.capabilityId, missingFunction: fn }), status: 'cancelled', resolvedByEventId: e.id, resolvedAt: e.occurredAt });
        }
        cycles.delete(key);
      }
      continue;
    }

    if (e.attempt.outcome !== 'fail' && e.attempt.outcome !== 'partial') continue;
    if (isSupport(e.capabilityId)) continue; // a failed probe demands nothing
    if (!contractAttributesFunctions(t.evaluation?.contractId)) continue;

    const declared = t.response?.requiredFunctions ?? [];
    const missing = (e.evaluation?.missingFunctions ?? []).filter((f) => declared.includes(f));
    if (!missing.length) continue;

    for (const fn of missing) {
      const key = `${e.capabilityId}|${fn}`;
      if ((cycles.get(key) ?? 0) >= maxCycles) continue;
      if (pending.has(key)) continue;
      const provider = pickProvider(fn, missing);
      if (!provider) continue;
      const demand = {
        targetCapabilityId: e.capabilityId,
        targetTaskId: e.taskId,
        targetTaskRevision: e.taskRevision,
        missingFunction: fn,
        supportCapabilityId: provider.id,
        sourceEventId: e.id,
        issuedAt: e.occurredAt
      };
      pending.set(key, demand);
      issued.set(key, demand);
    }
  }
  return { pending: [...pending.values()], resolved };
}

/* The planner's view of the lifecycle: only still-outstanding demands
 * can route work. */
function deriveSupportDemands(learnerId, events, opts) {
  return deriveSupportLifecycle(learnerId, events, opts).pending;
}

export function planNext(learnerId, events, { capabilities, tasks = [], riskPriors = [], now, retentionDelayMs, policy, skipIntentFor, roles }) {
  const pol = resolvePolicy(policy);
  const lag = retentionDelayMs ?? pol.retention.minLagMs;
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks, { retentionDelayMs: lag, policy: pol });
  const priorMap = new Map(riskPriors.map((p) => [p.id, p]));

  /* Mission roles decide how a never-seen capability is introduced
   * (R6): targets owe a baseline probe; carriers — and declared
   * prerequisites — rehearse context opportunistically with no
   * baseline at all; supports are demand-driven ONLY — every rule
   * below skips them, so they surface exclusively through
   * SUPPORT_DEMAND. Callers without a mission (null roles) keep the
   * original probe-or-expose behavior. */
  const roleOf = roles
    ? (id) => (roles.targets?.has(id) ? 'target' : roles.supports?.has(id) ? 'support' : 'carrier')
    : () => null;
  /* Support-role caps are demand-driven ONLY: none of the normal rules
   * (resume/due/remediation/transfer/independent/expose/introduce) may
   * reach them — a support cap free-running is exactly what the demand
   * mechanism exists to prevent. */
  const isSupportCap = (id) => roleOf(id) === 'support';

  /* `skipIntentFor` holds 'capabilityId|intentKind' keys: it silences
   * ONE kind of intent for a capability (the selector has no servable
   * task for that intent) WITHOUT removing the capability itself —
   * excluded caps still count as prerequisites, and their OTHER
   * intents still route: a delayed check with no task must not also
   * kill that same capability's pending transfer intent. */
  const skipped = (id, kind) => skipIntentFor?.has(`${id}|${kind}`) === true;

  /* 1. Resume in-flight work: the encounter started but no attempt
   *    outcome exists yet. */
  for (const c of capabilities) {
    if (skipped(c.id, 'resume') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if (s.state === 'EXPOSED' && s.lastAttemptOutcome == null) {
      return { kind: 'resume', capabilityId: c.id, reason: 'encounter started, no attempt recorded yet' };
    }
  }

  /* 2. Due retrieval: an independent ability whose last unaided success
   *    is older than the retention window goes back in for a delayed
   *    check. Earliest due first. A FAILED due check is remediation
   *    (rule 3), not a reschedule — otherwise the planner re-queues
   *    delayed_retrieval forever after each failure. */
  let due = null;
  for (const c of capabilities) {
    if (skipped(c.id, 'delayed_retrieval') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if (!s.milestones.independent || s.lastIndependentSuccessAt == null) continue;
    if (s.lastAttemptOutcome === 'fail' || s.lastAttemptOutcome === 'partial') continue;
    const dueAt = s.lastIndependentSuccessAt + lag;
    if (now >= dueAt && (!due || dueAt < due.dueAt)) {
      due = { kind: 'delayed_retrieval', capabilityId: c.id, dueAt, reason: 'independent success is due for a delayed check' };
    }
  }
  if (due) return due;

  /* 3. SUPPORT_DEMAND (issue #61): a verified, attributing failure on a
   *    target/carrier whose missing functions resolve to a declared
   *    support cap routes that cap's probe BEFORE the target's own
   *    remediation/continuation. Demands are bounded (one cycle per
   *    target×function pair), self-cancelling on target recovery, and
   *    consumed by a verified support_attempt regardless of outcome. */
  for (const d of deriveSupportDemands(learnerId, events, { capabilities, tasks, roles, policy })) {
    if (skipped(d.supportCapabilityId, 'support_demand')) continue;
    return {
      kind: 'support_demand',
      capabilityId: d.supportCapabilityId,
      demand: d,
      reason: `${d.targetCapabilityId} missed '${d.missingFunction}' on ${d.targetTaskId} — probing substrate ${d.supportCapabilityId}`
    };
  }

  /* 4. Remediation: enough consecutive failures on a capability that
   *    was previously taught (supported or independent success exists).
   *    The threshold is policy — a baseline probe failure still does
   *    NOT land here; untaught work routes to introduction below. */
  for (const c of capabilities) {
    if (skipped(c.id, 'retry') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if ((s.milestones.supported || s.milestones.independent) &&
        s.consecutiveFailures >= pol.remediation.minConsecutiveFailures) {
      return { kind: 'retry', capabilityId: c.id, reason: `${s.consecutiveFailures} consecutive ${s.lastAttemptOutcome} outcome(s) — feedback and self-repair first` };
    }
  }

  /* 5. Scheduled transfer: retained but never proven in a changed
   *    context — send it somewhere new. */
  for (const c of capabilities) {
    if (skipped(c.id, 'transfer') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if (s.milestones.retained && !s.milestones.transferred) {
      return { kind: 'transfer', capabilityId: c.id, reason: 'retained ability has not survived a changed context yet' };
    }
  }

  /* 6. Continue current mission: supported work needs an unaided run. */
  for (const c of capabilities) {
    if (skipped(c.id, 'independent_attempt') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if (s.milestones.supported && !s.milestones.independent) {
      return { kind: 'independent_attempt', capabilityId: c.id, reason: 'succeeded with support — now try without it' };
    }
  }

  /* 7a. Continue the current mission: a started-but-never-taught
   *     capability whose prerequisites are NOW met gets its first real
   *     input — a mission in progress outranks opening a new one. */
  for (const c of capabilities) {
    if (skipped(c.id, 'expose') || isSupportCap(c.id)) continue;
    const s = byCapability.get(c.id);
    if (s.state === 'NOT_SEEN') continue;
    if (s.milestones.supported || s.milestones.independent) continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (ready) {
      return { kind: 'expose', capabilityId: c.id, reason: 'mission in progress — prerequisites met, comprehensible input' };
    }
  }

  /* 7b. Introduce the first eligible never-seen capability, by role:
   *     a target always asks for a baseline probe first (falling back
   *     to input only if the mission declared none — an authoring gap
   *     the curriculum gate also flags); a carrier goes straight to
   *     input; a support is skipped — demand-driven intents only. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.state !== 'NOT_SEEN' || isSupportCap(c.id)) continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (!ready) continue;
    const role = roleOf(c.id);
    const probes = (c.vietnameseRiskProbes || [])
      .map((id) => priorMap.get(id) || priorById(id))
      .filter((p) => p && p.mayTriggerProbe && p.appliesTo.includes(c.modality))
      .map((p) => p.id);
    const kind = role === 'target' && !skipped(c.id, 'diagnostic_probe')
      ? 'diagnostic_probe'
      : role === 'carrier'
        ? 'expose'
        : probes.length ? 'diagnostic_probe' : 'expose';
    if (skipped(c.id, kind)) continue;
    if (kind === 'diagnostic_probe') {
      return { kind, capabilityId: c.id, probes, reason: 'eligible for introduction — probe known risk areas first' };
    }
    return { kind, capabilityId: c.id, reason: 'prerequisites met — comprehensible input first' };
  }

  return { kind: 'idle', reason: 'nothing due, nothing eligible — fluency work or new content needed' };
}
