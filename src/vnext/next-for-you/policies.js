/*
 * Next For You prototype policies (spec §9):
 *
 *   Policy A — reference cascade: production kernel order over the
 *     SAME hard-filter eligibility set B/C use. A differs in ordering
 *     only, never in honesty (review HIGH-7).
 *   Policy B — filter → tier → ordinal preferences → deterministic
 *     tie-break → explanation. No floating-point learning score.
 *   Policy C — B + bounded information-value heuristic for
 *     diagnostics.
 *
 * Every returned decision carries a machine-readable explanation (spec
 * §8), stamps selectionPolicyVersion + learnerModelVersion, task and
 * mission revisions, support-demand provenance, and a deterministic id
 * bound to the decision-input digest — same inputs, same id; changed
 * inputs at the same episode ordinal can never collide.
 */
import { KINDS, POLICY_VERSIONS, PROVENANCE, TIER_OF } from './constants.js';
import { generateCandidates } from './candidate-generator.js';
import { deriveCorrectionEpisodes, episodeDigest, pickRetestSurface, remainingOf, CORRECTION_EPISODES_VERSION } from '../correction-episodes.js';
import { deriveMissionRepairPlans, deriveRetestReservations } from './repair-proof.js';
import { LEARNER_MODEL_VERSION } from '../learner-model.js';
import { decisionInputSnapshot } from './decision-log.js';
import { sha256, canon } from './canonical.js';
import { nextMissionTask } from '../mission-runner.js';

/* BLOCKER-2 r3: ONE authoritative selection config per decision. The
 * same resolved object feeds candidate generation, hard filtering,
 * ordering, the input digest, and the log. A second, conflicting
 * config source is a fail-closed integrity violation — never a silent
 * X-for-generation / Y-for-filtering mix. */
function resolveSelection(state, opts) {
  const a = state?.selection;
  const b = opts?.selection;
  if (a == null && b == null) return { config: {}, conflict: false };
  if (a == null) return { config: b, conflict: false };
  if (b == null) return { config: a, conflict: false };
  return canon(a) === canon(b)
    ? { config: a, conflict: false }
    : { config: a, conflict: true };
}

const configConflict = (version, state, sel) => makeDecision({
  version, chosen: null, candidates: [], skipped: [], model: null,
  ctx: state?.decisionContext, pendingDemands: [],
  state: { ...state, selection: sel.config, integrityViolations: ['selection_config_conflict: state.selection vs call-option selection differ'] }
});

function makeDecision({ policy, version, chosen, candidates, skipped, model, ctx, pendingDemands = [], state = null, escape = null }) {
  const candidateView = candidates.map((c) => ({
    kind: c.kind, capabilityId: c.capabilityId,
    taskId: c.servableTask?.id ?? null, taskRevision: c.servableTask?.revision ?? null,
    eligible: c.eligible !== false,
    filterReason: c.filterReason || null,
    tier: c.tierName ?? null
  }));

  /* Terminal semantics (HIGH-6): BLOCKED = work exists but nothing can
   * honestly be served; IDLE = the valid set is genuinely empty. */
  const terminal = !chosen;
  const terminalKind = terminal
    ? (state?.integrityViolations?.length || candidates.length > 0 ? 'blocked' : 'idle')
    : null;
  const blockedReasons = terminalKind === 'blocked'
    ? [
        ...(state?.integrityViolations ?? []).map((r) => `mission_integrity:${r}`),
        ...candidates.filter((c) => c.eligible === false).map((c) => `${c.kind}@${c.capabilityId}: ${c.filterReason}`),
        ...candidates.filter((c) => c.eligible !== false && !c.servableTask).map((c) => `${c.kind}@${c.capabilityId}: no_servable_task`)
      ]
    : [];

  const losers = (chosen?._losers ?? []);
  const explanation = chosen
    ? {
        whyExists: chosen.why,
        tier: chosen.tierName,
        preferences: (chosen.preferences ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        penalties: (chosen.penalties ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        /* MEDIUM-13: every eligible loser keeps a reconstructible
         * comparison — tier, named preferences/penalties, and WHY it
         * lost (higher tier / preference name / tie-break field). */
        beat: losers.map((l) => ({
          kind: l.candidate.kind, capabilityId: l.candidate.capabilityId,
          taskId: l.candidate.servableTask?.id ?? null,
          taskRevision: l.candidate.servableTask?.revision ?? null,
          tier: l.candidate.tierName ?? null,
          preferences: (l.candidate.preferences ?? []).map((p) => p.name),
          penalties: (l.candidate.penalties ?? []).map((p) => p.name),
          lostTo: l.lostTo, lostBecause: l.reason
        })),
        tieBreak: chosen._tieBreak ?? null,
        escape: escape ?? null,
        suppressed: [
          ...skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`),
          ...candidates.filter((c) => c.eligible === false).map((c) => `${c.kind}@${c.capabilityId}: filtered — ${c.filterReason}`)
        ]
      }
    : {
        whyExists: terminalKind === 'blocked' ? 'work remains but nothing honestly servable' : 'no valid candidate',
        tier: 'TERMINAL', preferences: [], penalties: [], beat: [], tieBreak: null,
        blockedReasons,
        suppressed: skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`)
      };

  /* Deterministic id: episode + ordinal + policy + input digest — the
   * digest makes same-ordinal decisions on different input states
   * distinguishable (review MEDIUM-15). The selector passes the digest
   * it already computed (state.inputDigestHex — same canonical input,
   * identical value); standalone callers fall back to computing it. */
  const inputDigest = state
    ? (state.inputDigestHex ?? sha256(decisionInputSnapshot({ ...state }))).slice(0, 16)
    : 'no-state';
  const chosenStub = chosen
    ? `${chosen.kind}@${chosen.capabilityId}:${chosen.servableTask?.id ?? 'none'}@${chosen.servableTask?.revision ?? 1}`
    : terminalKind;
  const demand = chosen?.kind === KINDS.SUPPORT_DEMAND ? chosen.demand : null;

  return {
    decisionId: `dec:${ctx?.decisionEpisodeId ?? 'ep'}#${ctx?.actionsChosen?.length ?? 0}:${version}:${inputDigest}:${chosenStub}`,
    selectionPolicyVersion: version,
    learnerModelVersion: LEARNER_MODEL_VERSION,
    missionId: state?.mission?.id ?? null,
    missionRevision: state?.mission?.revision ?? null,
    chosen: chosen
      ? {
          kind: chosen.kind, capabilityId: chosen.capabilityId,
          taskId: chosen.servableTask?.id ?? null,
          taskRevision: chosen.servableTask?.revision ?? null,
          tier: chosen.tierName,
          /* BLOCKER-5: support demand keeps its full provenance in the
           * chosen record — which target miss this probe serves. */
          ...(demand ? {
            demandProvenance: {
              targetCapabilityId: demand.targetCapabilityId,
              targetTaskId: demand.targetTaskId ?? null,
              targetTaskRevision: demand.targetTaskRevision ?? null,
              missingFunction: demand.missingFunction,
              sourceEventId: demand.sourceEventId ?? null,
              issuedAt: demand.issuedAt ?? null,
              supportCapabilityId: demand.supportCapabilityId
            }
          } : {})
        }
      : { kind: terminalKind, capabilityId: null, taskId: null, taskRevision: null, tier: 'TERMINAL' },
    explanation,
    candidates: candidateView,
    decisionContextSummary: ctx ? { episode: ctx.decisionEpisodeId, counts: { ...ctx.counts }, thread: ctx.currentThreadCapabilityId, lastActed: ctx.lastActedCapabilityId ?? null } : null,
    openDemands: pendingDemands.map((d) => `${d.targetCapabilityId}|${d.missingFunction}|${d.supportCapabilityId}`),
    candidateCount: candidates.length,
    integrityViolations: state?.integrityViolations ?? [],
    blocked: chosen == null && terminalKind === 'blocked'
  };
}

/* ============ Hard filters (spec §4) — shared by A/B/C ============ */

const PURPOSE_OK = {
  correction: ['remediation'],
  /* 008F/B1: a delayed retest may surface on ANY independent eliciting
   * task — the episode contract excludes only the failed source task
   * and consumed repair surfaces, never a purpose. */
  correction_retest: ['delayed_retrieval', 'retrieval', 'production', 'interaction'],
  refresh: ['remediation', 'retrieval'],
  due_retrieval: ['delayed_retrieval'],
  transfer: ['transfer'],
  assessment: ['assessment'],
  support_demand: ['support'],
  diagnostic_probe: ['diagnostic'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  resume_in_flight: ['input', 'notice', 'retrieval', 'production', 'interaction']
};

/* Per-capability repair bound per episode [SAFETY_PRIOR]: after this
 * many correction/refresh actions on one capability in one episode the
 * REPAIR tier stops monopolizing — sideways/maintenance/forward work
 * proceeds (or honest BLOCKED if the cap is a hard gate). Not a
 * pedagogical optimum. */
const REPAIR_BOUND_PER_CAP_EPISODE = 3;

export function hardFilter(cand, { ctx, selection, pendingDemands, roles, assessmentMode = 'fresh', episodes = null, reservations = null }) {
  const reasons = [];
  const diagBudget = selection.diagnosticMaxPerEpisode ?? 2;
  const ceiling = selection.failureCeiling ?? 3;
  const repairBound = selection.repairMaxPerEpisodePerCap ?? REPAIR_BOUND_PER_CAP_EPISODE;

  if (!cand.servableTask) reasons.push('no_servable_task');
  else {
    const p = cand.servableTask.purpose;
    if (!PURPOSE_OK[cand.kind]?.includes(p)) reasons.push(`purpose_substitution:${p}`);
  }
  if (cand.kind === KINDS.SUPPORT_DEMAND) {
    /* BLOCKER-5: match the EXACT pending demand, not the first demand
     * sharing a provider. */
    const dp = cand.demand;
    const stillPending = dp && pendingDemands.some((d) =>
      d.supportCapabilityId === cand.capabilityId &&
      d.targetCapabilityId === dp.targetCapabilityId &&
      d.missingFunction === dp.missingFunction &&
      d.sourceEventId === dp.sourceEventId);
    if (!stillPending) reasons.push('demand_no_longer_pending');
    else if (!(cand.servableTask?.response?.requiredFunctions ?? []).includes(dp.missingFunction)) {
      reasons.push('probe_does_not_cover_function');
    }
  }
  /* HIGH-6 r3: hard bounds run on the VERIFIED observed streak only —
   * unobserved outcomes never move the failure ceiling, the refresh
   * gate, or the identical-retry escape. */
  if (cand.kind === KINDS.CORRECTION && (cand.facts.observedFails ?? 0) >= ceiling) {
    reasons.push(`failure_ceiling:${ceiling}`);
  }
  if (cand.identicalRetry) {
    reasons.push('identical_retry_after_failure_ceiling');
  }
  if ((cand.kind === KINDS.CORRECTION || cand.kind === KINDS.REFRESH) &&
      (ctx?.actionsChosen ?? []).filter((a) => a.capabilityId === cand.capabilityId && (a.kind === KINDS.CORRECTION || a.kind === KINDS.REFRESH)).length >= repairBound) {
    reasons.push(`repair_bound:${repairBound}`);
  }
  if (cand.kind === KINDS.DIAGNOSTIC_PROBE && (ctx?.counts?.diagnostic ?? 0) >= diagBudget) {
    /* Budget is per-episode and applies to EVERY probe, baseline
     * included — an exhausted budget defers new-target introduction to
     * a later episode instead of silently unbounding diagnostics
     * (review MEDIUM-8). */
    reasons.push(`diagnostic_budget:${diagBudget}`);
  }
  if (cand.kind === KINDS.REFRESH && !(cand.facts.lastObservedOutcome === 'fail' || cand.facts.lastObservedOutcome === 'partial')) {
    reasons.push('no_verified_failure'); // time alone never mints refresh
  }
  /* HIGH-8/HIGH-4: consumed-assessment reuse is a POLICY choice, not
   * kernel truth. A mirrors production (re-probe allowed); B/C refuse
   * — and freshness is FAMILY-level: a same-promptFamily clone with a
   * new id is not a fresh sample. */
  if (assessmentMode === 'fresh' && cand.kind === KINDS.ASSESSMENT && (cand.consumed || cand.familyConsumed)) {
    reasons.push(cand.familyConsumed ? 'assessment_family_consumed' : 'assessment_consumed');
  }
  /* 008F/B1 correction-episode gate: while an episode on this
   * capability is unresolved (failure repaired but not yet verified by
   * a delayed independent retest), certification intents may not
   * serve — transfer/assessment evidence minted on an open episode
   * would certify an unverified repair (research doc 14, D1/D5).
   * `episodes` is null under A/B/C — the gate exists only inside B1. */
  const openEp = episodes?.openByCapability?.[cand.capabilityId];
  if (openEp && (cand.kind === KINDS.TRANSFER || cand.kind === KINDS.ASSESSMENT)) {
    reasons.push(`correction_episode_gate:${openEp.state}`);
  }
  /* A correction retest is only honest while its episode is actually
   * due — a retest candidate on a waiting/closed episode is malformed. */
  if (cand.kind === KINDS.CORRECTION_RETEST) {
    if (!openEp || openEp.state !== 'RETEST_DUE') {
      reasons.push(`correction_retest_not_due:${openEp?.state ?? 'none'}`);
    }
  }
  /* While an episode waits out its lag — or still owes a mission-local
   * repair path — B1 withholds the surfaces that could serve as its
   * delayed retest: pre-lag practice on the probe contaminates the
   * delayed evidence. The withheld set is produced by the mission-local
   * repair proof (repair-proof.js), never by the evidence layer. Null
   * under A/B/C. */
  if (cand.kind !== KINDS.CORRECTION_RETEST && cand.servableTask &&
      reservations?.has(cand.servableTask.id)) {
    reasons.push('correction_retest_surface_reserved');
  }
  return reasons;
}

function applyFilters(candidates, env) {
  for (const c of candidates) {
    const violations = hardFilter(c, env);
    c.eligible = violations.length === 0;
    c.filterReason = violations.join('; ');
    c.tier = TIER_OF[c.kind];
    c.tierName = tierNameOf(c.kind);
  }
}

/* ============ POLICY A — production-mirror reference cascade ============ */

export function policyA(state, opts = {}) {
  const sel = resolveSelection(state, opts);
  if (sel.conflict) return configConflict(POLICY_VERSIONS.A, state, sel);
  const s2 = { ...state, selection: sel.config };
  const gen = generateCandidates(s2);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.A, chosen: null, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state: { ...s2, integrityViolations } });
  }
  /* HIGH-7: A runs the SAME hard filters as B/C — only ordering
   * differs. Production-mirror semantics keep consumed assessments
   * eligible (the runner re-probes failed checkpoints). */
  applyFilters(candidates, { ctx: state.decisionContext, selection: sel.config, pendingDemands, roles: state.roles, assessmentMode: 'production' });

  /* A follows the production `nextMissionTask` ORDER — phase-0 declared
   * baseline diagnostics first (mission order, once each), then resume →
   * due → support_demand → remediation → transfer → independent →
   * expose/continuation → introduce → assessment-close — but filtered
   * through the shared safety envelope (HIGH-3 r4: safety-normalized
   * cascade baseline, not a literal production mirror). */
  const taskOrder = new Map((state.mission?.taskIds ?? []).map((id, i) => [id, i]));
  const phase0 = candidates
    .filter((c) => c.kind === KINDS.DIAGNOSTIC_PROBE && c.servableTask && taskOrder.has(c.servableTask.id))
    .sort((a, b) => taskOrder.get(a.servableTask.id) - taskOrder.get(b.servableTask.id));
  if (phase0[0] && phase0[0].eligible) {
    phase0[0]._losers = candidates.filter((c) => c !== phase0[0] && c.eligible).map((c) => ({ candidate: c, lostTo: 'phase0', reason: 'declared baseline diagnostics precede generic planning' }));
    phase0[0]._tieBreak = 'production_phase0_mission_order';
    return makeDecision({ version: POLICY_VERSIONS.A, chosen: phase0[0], candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state: s2 });
  }

  const order = [
    KINDS.RESUME,
    KINDS.DUE_RETRIEVAL,
    KINDS.SUPPORT_DEMAND,
    KINDS.CORRECTION,
    KINDS.REFRESH,
    KINDS.TRANSFER,
    KINDS.INDEPENDENT_ATTEMPT,
    KINDS.MISSION_CONTINUATION,
    KINDS.DIAGNOSTIC_PROBE,
    KINDS.NEW_INPUT,
    KINDS.ASSESSMENT
  ];
  for (const kind of order) {
    const hit = candidates.find((c) => c.kind === kind && c.eligible);
    if (hit) {
      hit._losers = candidates.filter((c) => c !== hit && c.eligible).map((c) => ({ candidate: c, lostTo: 'cascade', reason: `kernel order: ${kind} precedes ${c.kind}` }));
      hit._tieBreak = 'kernel_order';
      return makeDecision({ version: POLICY_VERSIONS.A, chosen: hit, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state: s2 });
    }
  }
  return makeDecision({ version: POLICY_VERSIONS.A, chosen: null, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state: s2 });
}

/* PRODUCTION REFERENCE — the authoritative differential baseline
 * [KERNEL]: a literal executable wrapper
 * around the shipped `nextMissionTask` — the same code the product
 * runs, wrapped in the decision record shape so the benchmark and
 * differential tests can compare byte-for-byte choices. It does not
 * emit candidates/explanations of its own; selection work belongs
 * entirely to the production runner. */
/* Production purpose → experiment kind. Shared by policyRef and the
 * runtime selector's shadow/audit path — one mapping, no drift. */
export const PURPOSE_TO_KIND = {
  assessment: KINDS.ASSESSMENT, diagnostic: KINDS.DIAGNOSTIC_PROBE,
  delayed_retrieval: KINDS.DUE_RETRIEVAL, transfer: KINDS.TRANSFER,
  support: KINDS.SUPPORT_DEMAND, remediation: KINDS.CORRECTION
};

export function policyRef(state) {
  const r = nextMissionTask({
    learnerId: state.learnerId, mission: state.mission, tasks: state.tasks,
    capabilities: state.capabilities, events: state.events,
    riskPriors: state.riskPriors ?? [], now: state.now, policy: state.policy
  });
  const purposeToKind = PURPOSE_TO_KIND;
  const ready = r.status === 'ready';
  const kind = ready ? (purposeToKind[r.purpose] ?? KINDS.MISSION_CONTINUATION) : r.status;
  return {
    decisionId: `ref:${r.status}:${r.taskId ?? 'none'}@${r.taskRevision ?? 0}`,
    selectionPolicyVersion: 'production.nextMissionTask',
    learnerModelVersion: null,
    missionId: state.mission?.id ?? null,
    missionRevision: state.mission?.revision ?? null,
    chosen: ready
      ? { kind, capabilityId: r.capabilityId, taskId: r.taskId, taskRevision: r.taskRevision, tier: 'PRODUCTION' }
      : { kind: r.status, capabilityId: null, taskId: null, taskRevision: null, tier: 'TERMINAL' },
    production: { status: r.status, reason: r.reason, skippedIntents: r.skippedIntents ?? [] },
    explanation: { whyExists: r.reason, tier: 'PRODUCTION', preferences: [], penalties: [], beat: [], tieBreak: null, suppressed: [] },
    candidates: [], candidateCount: 0,
    integrityViolations: [],
    blocked: r.status === 'blocked'
  };
}

/* ============ POLICY B — filter → tier → ordinal → tie-break ============ */

export function policyB(state, opts = {}) {
  const sel = resolveSelection(state, opts);
  if (sel.conflict) return configConflict(POLICY_VERSIONS.B, state, sel);
  const s2 = { ...state, selection: sel.config };
  const gen = generateCandidates(s2);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  const ctx = state.decisionContext;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.B, chosen: null, candidates, skipped, model, ctx, pendingDemands, state: { ...s2, integrityViolations } });
  }

  applyFilters(candidates, { ctx, selection: sel.config, pendingDemands, roles: state.roles, assessmentMode: 'fresh' });
  const eligible = candidates.filter((c) => c.eligible);
  const { winner, losers, escape } = pickOrdinal(eligible, ctx, sel.config);
  if (winner) { winner._losers = losers; winner._tieBreak = winner._tieBreak ?? 'total_order'; }
  return makeDecision({ version: POLICY_VERSIONS.B, chosen: winner, candidates, skipped, model, ctx, pendingDemands, state: s2, escape });
}

/* ============ POLICY C — B + bounded information value ============ */

export function policyC(state, opts = {}) {
  const sel = resolveSelection(state, opts);
  if (sel.conflict) return configConflict(POLICY_VERSIONS.C, state, sel);
  const s2 = { ...state, selection: sel.config };
  const gen = generateCandidates(s2);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  const ctx = state.decisionContext;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.C, chosen: null, candidates, skipped, model, ctx, pendingDemands, state: { ...s2, integrityViolations } });
  }

  applyFilters(candidates, { ctx, selection: sel.config, pendingDemands, roles: state.roles, assessmentMode: 'fresh' });
  for (const c of candidates) {
    /* Information-value heuristic [EXPERIMENTAL]: thin/conflicting/
     * never-sampled evidence boosts probes within the budget. Coarse
     * categorical signal only — no psychometric item model exists. */
    if (c.eligible && c.kind === KINDS.DIAGNOSTIC_PROBE) {
      const codes = new Set(c.facts.reasonCodes);
      if (codes.has('thin_independent_evidence') || codes.has('no_independent_evidence') ||
          codes.has('no_assessment_evidence') || codes.has('currently_failing')) {
        c.preferences.push({ name: 'information_value', provenance: PROVENANCE.EXPERIMENTAL });
      }
    }
  }
  const eligible = candidates.filter((c) => c.eligible);
  const { winner, losers, escape } = pickOrdinal(eligible, ctx, sel.config);
  if (winner) { winner._losers = losers; winner._tieBreak = winner._tieBreak ?? 'total_order'; }
  return makeDecision({ version: POLICY_VERSIONS.C, chosen: winner, candidates, skipped, model, ctx, pendingDemands, state: s2, escape });
}

/* ============ POLICY B1 — B0 + correction-episode gate (Mission 008F)
 *
 * B1 is a SHADOW/experimental policy over the same immutable input:
 * same generator, same filters, same ordinal ladder — plus the
 * correction-episode contract. A remediation success is immediate
 * performance, never resolution; only a delayed independent retest on
 * an alternate surface verifies the correction.
 *
 * Differences vs B0, all explicit and episode-scoped:
 *   1. unresolved episodes hard-gate transfer + assessment candidates
 *      (`correction_episode_gate:<state>` filter reason);
 *   2. a `correction_retest` candidate mints while an episode is
 *      RETEST_DUE — REPAIR tier so the delayed check is actually served;
 *   3. a due episode with no retest-eligible surface is reported as
 *      `correction_content_backlog` — authoring debt, never silently
 *      falling through to transfer on the failed surface. */
export function policyB1(state, opts = {}) {
  const sel = resolveSelection(state, opts);
  if (sel.conflict) return configConflict(POLICY_VERSIONS.B1, state, sel);
  const s2 = { ...state, selection: sel.config };
  const gen = generateCandidates(s2);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  const ctx = state.decisionContext;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.B1, chosen: null, candidates, skipped, model, ctx, pendingDemands, state: { ...s2, integrityViolations } });
  }

  /* Episode derivation runs on THE SAME inputs as the learner model —
   * learner-scoped, registered-task-verified, canonical replay order.
   * Evidence truth only (Mission 008G); the reservation question is
   * answered by the mission-local repair proof below. */
  const episodes = deriveCorrectionEpisodes({
    learnerId: state.learnerId, events: state.events,
    capabilities: state.capabilities, tasks: state.tasks,
    policy: state.policy, now: state.now
  });

  /* Routing truth (008G): per open episode, prove inside THIS mission —
   * through the shared resolver — that every still-missing function has
   * a reachable, hard-filter-clean repair route that does not consume a
   * fresh retest probe. Only a complete proof reserves the probes. */
  const repairPlans = deriveMissionRepairPlans({
    episodes, mission: s2.mission, tasks: state.tasks,
    candidates, resolver: gen.resolver,
    selection: sel.config, decisionContext: ctx,
    pendingDemands, roles: state.roles, episodes,
    hardFilter
  });
  const reservations = deriveRetestReservations({
    episodes, plans: repairPlans, missionTasks: gen.resolver?.missionTasks
  });

  /* Mint one retest candidate per due episode. The surface must not be
   * a burned failure surface (the opening miss AND any retest that
   * itself failed) or a consumed repair task (research D5) — and must
   * cover a still-missing function, else it is honest backlog. */
  const f = (capId) => candidates.find((c) => c.capabilityId === capId)?.facts
    ?? { capabilityId: capId, state: 'NOT_SEEN', milestones: {}, consecutiveFailures: 0, reasonCodes: [] };
  for (const ep of episodes.episodes) {
    if (ep.state !== 'RETEST_DUE') continue;
    const surface = pickRetestSurface(ep, missionTaskList(state));
    if (!surface) {
      skipped.push({
        capabilityId: ep.capabilityId, kind: KINDS.CORRECTION_RETEST,
        reason: `correction_content_backlog: episode ${ep.episodeId} due but no retest surface covers [${remainingOf(ep).join(',')}]`
      });
      continue;
    }
    candidates.push({
      kind: KINDS.CORRECTION_RETEST, capabilityId: ep.capabilityId,
      facts: f(ep.capabilityId),
      servableTask: surface,
      episodeId: ep.episodeId,
      preferences: [{ name: 'correction_retest_due', detail: `${ep.episodeId} due since ${new Date(ep.retestDueAt).toISOString()}`, provenance: PROVENANCE.EVIDENCE }],
      penalties: [],
      provenance: [PROVENANCE.EVIDENCE, PROVENANCE.SAFETY],
      why: `correction episode ${ep.episodeId} repaired at ${new Date(ep.repairedAt).toISOString()} — delayed independent retest now due`,
      dueAt: ep.retestDueAt
    });
  }

  applyFilters(candidates, { ctx, selection: sel.config, pendingDemands, roles: state.roles, assessmentMode: 'fresh', episodes, reservations });
  const eligible = candidates.filter((c) => c.eligible);
  const { winner, losers, escape } = pickOrdinal(eligible, ctx, sel.config);
  if (winner) { winner._losers = losers; winner._tieBreak = winner._tieBreak ?? 'total_order'; }
  const decision = makeDecision({ version: POLICY_VERSIONS.B1, chosen: winner, candidates, skipped, model, ctx, pendingDemands, state: s2, escape });
  /* The episode view rides the decision record so the audit/shadow path
   * and the B0↔B1 classifier can attribute every divergence to an
   * episode state without re-deriving — including the machine-readable
   * repair proofs that justified each reservation. */
  decision.correctionEpisodes = {
    contractVersion: CORRECTION_EPISODES_VERSION,
    digest: episodeDigest(episodes),
    repairPlans
  };
  return decision;
}

function missionTaskList(state) {
  const ids = new Set(state.mission?.taskIds ?? []);
  if (!ids.size) return state.tasks;
  const latest = new Map();
  for (const t of state.tasks) {
    const prev = latest.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latest.set(t.id, t);
  }
  return [...ids].map((id) => latest.get(id)).filter(Boolean);
}

/* Starvation-guard limits per variant [SAFETY_PRIOR/EXPERIMENTAL]: how
 * many consecutive same-tier decisions an episode tolerates before one
 * decision escapes to the next eligible tier. Bounded escape valve —
 * not an efficacy claim. */
const STARVATION_LIMITS = { review: 8, balanced: 4, forward: 2 };

/* Ordinal preference: within a tier, apply named comparisons in order;
 * every preference name is provenance-tagged. Returns the winner plus
 * a reconstructible reason for every loser (MEDIUM-13). */
function pickOrdinal(eligible, ctx, selection) {
  if (!eligible.length) return { winner: null, losers: [], escape: null };

  /* Starvation escape (HIGH-9): if the best eligible tier has produced
   * ≥ limit consecutive decisions this episode and other tiers have
   * eligible work, one decision goes to the best candidate OUTSIDE the
   * monopolizing tier. Limits are variant tunables, never "optimal".
   *
   * HIGH-7 r3 boundaries: MANDATORY is NEVER escaped (in-flight work
   * cannot be abandoned by a streak), and a tier carrying a still-
   * pending support_demand is NEVER escaped — an active substrate
   * obligation is a hard gate, not a preference. */
  let pool = eligible;
  let escape = null;
  let bestTier = Math.min(...pool.map((c) => c.tier));
  const limit = STARVATION_LIMITS[selection.starvationGuard ?? 'balanced'] ?? STARVATION_LIMITS.balanced;
  const actions = ctx?.actionsChosen ?? [];
  let streak = 0;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (TIER_OF[actions[i].kind] === bestTier) streak++; else break;
  }
  const bestTierPool = pool.filter((c) => c.tier === bestTier);
  const tierProtected = bestTier === 0 || bestTierPool.some((c) => c.kind === KINDS.SUPPORT_DEMAND);
  if (!tierProtected && streak >= limit && pool.some((c) => c.tier !== bestTier)) {
    pool = pool.filter((c) => c.tier !== bestTier);
    escape = { from: tierLabel(bestTier), streak, reason: `starvation_guard(${selection.starvationGuard ?? 'balanced'}):${limit}` };
    bestTier = Math.min(...pool.map((c) => c.tier));
  }
  const inTier = pool.filter((c) => c.tier === bestTier);
  const tierLosers = pool.filter((c) => c.tier !== bestTier)
    .map((c) => ({ candidate: c, lostTo: 'tier', reason: `tier ${tierLabel(c.tier)} loses to ${tierLabel(bestTier)}${escape ? ' after starvation escape' : ''}` }));

  const score = (c) => {
    const names = c.preferences.map((p) => p.name);
    /* Ordered contribution ladder — earlier = stronger. Every rung is
     * named so "why A beat B" is a reason, not a number. */
    const ladder = [
      'pending_demand',                 // KERNEL — open substrate gap
      'verified_failure_on_demonstrated',// KERNEL — refresh semantics
      'correction_retest_due',          // EVIDENCE — 008F delayed retest gate
      'open_attributed_gap',            // EVIDENCE — repairable failure
      'support_dependency_fade',        // EVIDENCE — fade scaffolding
      'due',                            // EVIDENCE — spacing
      'mission_assessment_plan',        // KERNEL — claim-bearing evidence
      'unattributed_failure',           // EXPERIMENTAL — clarify
      'information_value',              // EXPERIMENTAL — Policy C only
      'baseline_probe',                 // KERNEL — R6 role semantics
      'transfer_pending',               // EVIDENCE — varied practice
      'thread_continuation',            // SAFETY/UX — hysteresis
      'breadth'                         // EXPERIMENTAL — starvation guard
    ];
    for (const name of ladder) {
      if (names.includes(name)) return ladder.length - ladder.indexOf(name);
    }
    return 0;
  };
  const topPref = (c) => {
    const names = c.preferences.map((p) => p.name);
    const ladder = ['pending_demand', 'verified_failure_on_demonstrated', 'correction_retest_due', 'open_attributed_gap', 'support_dependency_fade', 'due', 'mission_assessment_plan', 'unattributed_failure', 'information_value', 'baseline_probe', 'transfer_pending', 'thread_continuation', 'breadth'];
    return ladder.find((n) => names.includes(n)) ?? null;
  };

  const tieFields = [
    ['score', (c) => -score(c)],
    ['dueAt', (c) => c.dueAt ?? Infinity],
    ['consecutiveFailures', (c) => -(c.facts?.consecutiveFailures ?? 0)],
    ['thread', (c) => -(ctx?.currentThreadCapabilityId === c.capabilityId ? 1 : 0)],
    ['capabilityId', (c) => c.capabilityId],
    ['kind', (c) => c.kind],
    ['taskId', (c) => c.servableTask?.id ?? '']
  ];
  const cmp = (a, b) => {
    for (const [, f] of tieFields) {
      const fa = f(a), fb = f(b);
      if (fa < fb) return { d: -1 };
      if (fa > fb) return { d: 1 };
    }
    return { d: 0 };
  };
  const sorted = [...inTier].sort((a, b) => cmp(a, b).d);
  const winner = sorted[0];
  const breakReason = (loser) => {
    for (const [name, f] of tieFields) {
      const fw = f(winner), fl = f(loser);
      if (fw !== fl) return { field: name, winner: String(fw), loser: String(fl) };
    }
    return { field: 'identical', winner: '', loser: '' };
  };
  const inTierLosers = sorted.slice(1).map((c) => {
    const br = breakReason(c);
    return br.field === 'score'
      ? { candidate: c, lostTo: 'preference', reason: `${topPref(winner) ?? 'none'} outranks ${topPref(c) ?? 'none'}` }
      : { candidate: c, lostTo: 'tiebreak', reason: `${br.field}: ${br.loser} loses to ${br.winner}` };
  });
  winner._tieBreak = escape ? `starvation_escape:${escape.from}` : 'ordinal+tier+lexicographic';
  return { winner, losers: [...tierLosers, ...inTierLosers], escape };
}

function tierLabel(t) {
  return ['MANDATORY', 'REPAIR', 'MAINTENANCE', 'EVIDENCE', 'PROGRESS', 'INTRODUCE', 'TERMINAL'][t] ?? 'TERMINAL';
}

function tierNameOf(kind) {
  return tierLabel(TIER_OF[kind]);
}

export const POLICIES = { A: policyA, B: policyB, C: policyC, B1: policyB1 };
