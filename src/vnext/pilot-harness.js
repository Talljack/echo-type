/*
 * vNext pilot harness (issue #50).
 *
 * Runs a small cohort of scripted learners through the full
 * mission/contract stack — selector → binder → append-only evidence →
 * projection — across deterministic sessions, then evaluates a
 * harness-level EVIDENCE PACKAGE per capability.
 *
 * The harness never mutates learner state and never changes engine
 * semantics. Its claim is recomputed from PRIMITIVE evidence — the
 * engine's milestones are reported as outputs, never consumed as
 * claim inputs (R2 research: a claim derived from the milestone it
 * certifies is circular). A milestone/primitive mismatch is reported
 * as an integrity failure — an engine promotion bug, not a gap.
 *
 * learnedByFlashday(capId) :=
 *   acquisitionSource === 'FLASHDAY'     // first attempt was not an
 *                                        // unaided diagnostic pass —
 *                                        // baseline-passers were able
 *                                        // before we taught anything
 *   AND ≥2 unaided verified successes spanning ≥2 sessions
 *   AND ≥1 delayed_retrieval success ≥ retentionDelayMs after first
 *     unaided success (retained72h is reported separately — a probe,
 *     not a claim condition)
 *   AND ≥1 transfer_attempt success on a prompt family never seen in
 *     a practiced context before that attempt (held-out delta)
 *   AND ≥1 checkpoint success
 *   AND no unresolved contradiction — the LATEST outcome of every
 *     probe type (delayed/transfer/checkpoint) is success; a failed
 *     probe repaired later resolves, one left standing is
 *     `needsRelearning`
 *
 * Sessions are implicit in the event log — two events ≥30 min apart
 * are different sessions. Every timestamp is supplied; wall-clock
 * time is never read.
 */
import { projectLearnerState } from './projection.js';
import { runMissionTrace } from './mission-runner.js';
import { answerBearing, conditionsViolated, unionSupport } from './evidence.js';
import { effectiveAllowedSupport, verifyEventTask } from './contracts.js';
import { resolvePolicy } from './policy.js';

const ATTEMPT_TYPES = new Set([
  'recognition_attempt', 'recall_attempt', 'production_attempt',
  'interaction_turn', 'retry', 'delayed_retrieval', 'transfer_attempt', 'checkpoint'
]);
const INDEPENDENT_AUTHORITIES = new Set(['deterministic', 'human']);

/* The claim's notion of "unaided verified success" must be the SAME
 * evidence the engine would promote — recomputed here, not copied: the
 * caller supplies the attempt-boundary support union and the registered
 * task/capability so conditions violations (e.g. a replay the contract
 * does not permit) disqualify exactly as they do in the projection. */
const isUnaidedVerifiedSuccess = (e, cap, task, support) =>
  ATTEMPT_TYPES.has(e.eventType) &&
  e.attempt?.outcome === 'success' &&
  e.attempt?.observed === true &&
  !answerBearing(support) &&
  !conditionsViolated(support, effectiveAllowedSupport(cap, task)) &&
  INDEPENDENT_AUTHORITIES.has(e.evaluation?.authority);

/* Session buckets from the log itself: a gap larger than the policy's
 * spacing threshold starts a new session. Deterministic and
 * content-free — no synthetic flags. */
function sessionBuckets(events, minGapMs) {
  const times = [...new Set(events.map((e) => e.occurredAt))].sort((a, b) => a - b);
  const buckets = new Map();
  let bucket = 0;
  for (let i = 0; i < times.length; i++) {
    if (i > 0 && times[i] - times[i - 1] > minGapMs) bucket++;
    buckets.set(times[i], bucket);
  }
  return (t) => buckets.get(t) ?? 0;
}

/* One learner through an ordered list of sessions. Each session is a
 * bounded runMissionTrace call sharing the learner's append-only log. */
export function runPilotLearner({ learner, mission, tasks, capabilities, riskPriors = [], sessions, stepsPerSession = 40, policy }) {
  const events = [];
  const trace = [];
  const sessionReports = [];
  let seq = 0;
  /* Per-run service counter: `ctx.call` is the Nth time this task has
   * been served to this learner in THIS run. Scripts key behavior on
   * it instead of closures — replaying a run must not inherit state. */
  const callCount = new Map();
  for (const session of sessions) {
    const result = runMissionTrace({
      learnerId: learner.id,
      mission: typeof mission === 'function' ? mission(learner) : mission,
      tasks,
      capabilities,
      events,
      riskPriors,
      nowAt: (step) => session.startMs + step * session.stepMs,
      act: (task, ctx) => {
        const key = `${task.id}@${task.revision ?? 1}`;
        const call = (callCount.get(key) ?? 0) + 1;
        callCount.set(key, call);
        return (learner.act(task, { ...ctx, session: session.name, call }) ?? [])
          .map((raw, i) => ({
            id: raw.id ?? `${learner.id}.ev.${++seq}`,
            occurredAt: raw.occurredAt ?? ctx.now + i * 100,
            ...raw,
            learnerId: learner.id // learner isolation is the harness's job, never the act's
          }));
      },
      maxSteps: stepsPerSession,
      policy
    });
    trace.push(...result.trace.map((t) => ({ ...t, session: session.name })));
    events.push(...result.events.slice(events.length));
    const last = result.trace[result.trace.length - 1];
    sessionReports.push({
      session: session.name,
      steps: result.trace.filter((t) => t.taskId).length,
      endedWith: last?.status ?? 'idle',
      lastReason: last?.reason ?? null
    });
  }
  return { learnerId: learner.id, events, trace, sessionReports };
}

/* Harness-level claim — recomputed from PRIMITIVE evidence, not from
 * milestones (R2 research: TRANSFERRED is a materialized conclusion,
 * never the input to its own claim).
 *
 *   learnedByFlashday(capId) :=
 *     acquisitionSource === 'FLASHDAY'        // baseline did NOT pass
 *     AND ≥2 unaided successes, spaced ≥2 sessions
 *     AND ≥1 delayed_retrieval success ≥24h after first unaided
 *     AND ≥1 transfer_attempt success on a family never seen in a
 *         practiced context before that attempt
 *     AND ≥1 checkpoint success
 *     AND no unresolved contradiction: the LATEST outcome of every
 *         probe type (delayed / transfer / checkpoint) is success —
 *         a fail followed by remediation + re-pass is resolved, a fail
 *         left standing is `needsRelearning`
 *
 * Baseline attribution: if the capability's first attempt is an
 * unaided diagnostic PASS, acquisitionSource = 'PREEXISTING' — the
 * learner arrived able; FlashDay may confirm but must never claim it. */
export function evaluateClaim(learnerId, events, capabilities, tasks, capId, { retentionDelayMs, policy } = {}) {
  /* Thresholds are policy (issue #52): every claim is stamped with the
   * policyVersion that produced it — a threshold change is a new
   * policy, never a silent reinterpretation of an old claim. */
  const pol = resolvePolicy(policy);
  const lag = retentionDelayMs ?? pol.retention.minLagMs;
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks, { policy: pol });
  const slot = byCapability.get(capId);
  /* Claims count only verified evidence — the same registry gate the
   * engine applies. An unverifiable event is neither proof nor
   * contradiction; it simply does not exist for the claim. */
  const byKey = new Map(tasks.map((t) => [`${t.id}@${t.revision ?? 1}`, t]));
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const cap = capById.get(capId);

  /* Support union and family rehearsal must scan the FULL learner log —
   * the same events the projection sees (learner + capability +
   * modality matched, deduped, canonical order), including UNVERIFIED
   * records. A support_use or exposure event that fails contract
   * verification still contaminates the engine's attempt history and
   * rehearsal set; an oracle that only scans verified events would call
   * evidence clean/novel where the engine correctly refuses. */
  const allCap = [];
  const seenIds = new Set();
  for (const e of events) {
    if (e.learnerId !== learnerId || e.capabilityId !== capId) continue;
    if (!cap || e.modality !== cap.modality) continue;
    if (seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    allCap.push(e);
  }
  allCap.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1));

  const supportByAttempt = new Map();
  const supportOf = new Map();
  const novelAtAttempt = new Map();
  const seenFamilies = new Set();
  for (const e of allCap) {
    const aid = e.attempt?.attemptId;
    if (aid) {
      const key = `${e.taskId}::${aid}`;
      const merged = unionSupport(supportByAttempt.get(key) ?? null, e.support);
      supportByAttempt.set(key, merged);
      supportOf.set(e, merged);
    }
    const fam = e.context?.promptFamily;
    if (e.context?.practicedOrTransfer === 'transfer') {
      novelAtAttempt.set(e, Boolean(fam) && !seenFamilies.has(fam));
    } else if (fam) {
      seenFamilies.add(fam);
    }
  }

  /* Claims count only verified evidence — the same registry gate the
   * engine applies. An unverifiable event is neither proof nor
   * contradiction; it simply does not exist for the claim. */
  const mine = allCap.filter((e) => {
    const t = byKey.get(`${e.taskId}@${e.taskRevision}`);
    const c = t ? capById.get(t.capabilityId) : null;
    return !!t && !!c && verifyEventTask(e, t, c);
  });
  const bucketOf = sessionBuckets(mine, pol.independent.minSpacingGapMs);

  const taskOf = (e) => byKey.get(`${e.taskId}@${e.taskRevision}`);
  const isUnaided = (e) =>
    isUnaidedVerifiedSuccess(e, capById.get(taskOf(e)?.capabilityId), taskOf(e), supportOf.get(e) ?? e.support);

  const attempts = mine.filter((e) => ATTEMPT_TYPES.has(e.eventType) && e.attempt?.outcome != null);
  const unaided = mine.filter(isUnaided);
  const unaidedSessions = new Set(unaided.map((e) => bucketOf(e.occurredAt)));
  const firstUnaidedAt = unaided.length ? unaided[0].occurredAt : null;

  /* Baseline attribution — the first eliciting attempt decides. */
  const baselineMastered = attempts.length > 0 && isUnaided(attempts[0]);
  const acquisitionSource = baselineMastered ? 'PREEXISTING' : 'FLASHDAY';

  const delayedPasses = mine.filter((e) => e.eventType === 'delayed_retrieval' && isUnaided(e));
  const retained24h = delayedPasses.some((e) => firstUnaidedAt != null && e.occurredAt >= firstUnaidedAt + lag);
  const retained72h = delayedPasses.some((e) => firstUnaidedAt != null && e.occurredAt >= firstUnaidedAt + 3 * lag);

  /* Held-out transfer: an UNAIDED verified success whose family was
   * never rehearsed in a practiced/assessment context before it —
   * canonical order, same as the engine. */
  const transferSuccess = mine.some((e) =>
    e.eventType === 'transfer_attempt' && e.context?.practicedOrTransfer === 'transfer'
    && isUnaided(e) && novelAtAttempt.get(e) === true);
  const checkpointPass = mine.some((e) => e.eventType === 'checkpoint' && isUnaided(e));

  /* Unresolved contradiction = latest outcome of a probe type is not
   * success. A failed probe repaired later resolves; one left standing
   * is needsRelearning. */
  const probeTypes = ['delayed_retrieval', 'transfer_attempt', 'checkpoint'];
  const openProbes = probeTypes.filter((t) => {
    const latest = [...mine].reverse().find((e) => e.eventType === t && e.attempt?.outcome != null);
    return latest && latest.attempt.outcome !== 'success';
  });
  const remediationEpisodes = mine.filter((e) => e.binding?.purpose === 'remediation' && e.attempt?.outcome != null).length;

  const gaps = [];
  if (baselineMastered) gaps.push('acquisitionSource PREEXISTING — baseline already demonstrated the capability');
  if (unaided.length < pol.independent.successfulUnaidedRetrievals) {
    gaps.push(`${unaided.length} unaided success(es), need ≥${pol.independent.successfulUnaidedRetrievals}`);
  }
  if (unaidedSessions.size < pol.independent.minDistinctSessions) {
    gaps.push(`unaided successes span ${unaidedSessions.size} session(s), need ≥${pol.independent.minDistinctSessions}`);
  }
  if (pol.claim.requireDelayedSuccess && !retained24h) gaps.push('no delayed_retrieval success ≥ retention horizon after first unaided success');
  if (pol.claim.requireTransferSuccess && !transferSuccess) gaps.push('no transfer_attempt success on held-out context');
  if (pol.claim.requireAssessmentSuccess && !checkpointPass) gaps.push('no checkpoint success');
  if (pol.claim.blockOnUnresolvedContradiction && openProbes.length) {
    gaps.push(`unresolved contradictory evidence: latest ${openProbes.join(', ')} outcome not success`);
  }

  /* Integrity cross-check — milestone vs the primitives it claims to
   * summarize. The primitive replicates the milestone's full semantics
   * (unaided + conditions-valid + verified + novel family) — a weaker
   * primitive would alarm whenever the engine correctly refuses a
   * milestone on contaminated evidence, which is a false failure, not a
   * promotion bug. */
  const primitiveTransfer = mine.some((e) =>
    e.context?.practicedOrTransfer === 'transfer' && isUnaided(e) && novelAtAttempt.get(e) === true);
  const integrity = {
    transferredMatchesPrimitives: slot?.milestones.transferred === primitiveTransfer
      ? true : `milestone=${slot?.milestones.transferred} vs primitive=${primitiveTransfer}`,
    independentMatchesPrimitives: (slot?.milestones.independent ?? false) === (unaided.length > 0)
      ? true : `milestone=${slot?.milestones.independent} vs primitive=${unaided.length > 0}`
  };

  const checkpointAttempts = mine.filter((e) => e.eventType === 'checkpoint' && e.attempt?.outcome != null);
  const latestCheckpoint = checkpointAttempts[checkpointAttempts.length - 1];

  return {
    capId,
    policyVersion: pol.version,
    acquisitionSource,
    baselineMastered,
    learnedByFlashday: gaps.length === 0,
    needsRelearning: openProbes.length > 0,
    retained24h,
    retained72h,
    transferred: slot?.milestones.transferred ?? false,
    assessmentStatus: !latestCheckpoint ? 'pending' : latestCheckpoint.attempt.outcome === 'success' ? 'pass' : 'fail',
    gaps,
    unaidedSuccesses: unaided.length,
    remediationEpisodes,
    integrity
  };
}

export function runPilot({ learners, mission, tasks, capabilities, riskPriors = [], sessions, targetCapabilities, stepsPerSession = 40, policy }) {
  const reports = learners.map((learner) => {
    const run = runPilotLearner({ learner, mission, tasks, capabilities, riskPriors, sessions, stepsPerSession, policy });
    const caps = targetCapabilities ?? mission.targetCapabilities ?? [];
    const claims = {};
    for (const capId of caps) claims[capId] = evaluateClaim(run.learnerId, run.events, capabilities, tasks, capId, { policy });
    return { ...run, claims };
  });

  const caps = targetCapabilities ?? mission.targetCapabilities ?? [];
  /* Eligible denominator excludes baseline-mastered claims — a
   * preexisting ability was never FlashDay's to claim. */
  const eligible = reports.flatMap((r) => caps.map((c) => r.claims[c]).filter((cl) => cl && !cl.baselineMastered));
  const learned = eligible.filter((cl) => cl.learnedByFlashday).length;
  const integrityFailures = reports.flatMap((r) =>
    caps.flatMap((c) => Object.values(r.claims[c]?.integrity ?? {}).filter((v) => v !== true).map((v) => `${r.learnerId}/${c}: ${v}`)));

  return {
    learners: reports,
    summary: {
      learners: reports.length,
      capabilitiesChecked: caps,
      claimRate: eligible.length ? learned / eligible.length : 0,
      claimsSatisfied: learned,
      claimsEligible: eligible.length,
      baselineMastered: reports.reduce((n, r) => n + caps.filter((c) => r.claims[c]?.baselineMastered).length, 0),
      needsRelearning: reports.reduce((n, r) => n + caps.filter((c) => r.claims[c]?.needsRelearning).length, 0),
      integrityFailures,
      totalSteps: reports.reduce((n, r) => n + r.trace.filter((t) => t.taskId).length, 0)
    }
  };
}
