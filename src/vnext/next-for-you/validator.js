/*
 * Independent decision validator (review HIGH-6, HIGH-10).
 *
 * Validates a CHOSEN decision against the contracts and kernel facts
 * AFTER selection — deliberately not reusing the generator's own
 * helpers, so a buggy filter can't also be its own alibi. Returns a
 * list of violations; empty = the decision is honest.
 *
 * The validator is given the ACTUAL learning policy, selection config,
 * and DecisionContext the decision ran under — hard rules are checked
 * against those, never a hardcoded default.
 */
import { projectLearnerState } from '../projection.js';
import { deriveSupportLifecycle } from '../planner.js';
import { resolvePolicy } from '../policy.js';
import { validateTask, verifyEventTask, canonicalFamilyId } from '../contracts.js';
import { generateCandidates } from './candidate-generator.js';
import { hardFilter } from './policies.js';
import { deriveCorrectionEpisodes, pickRetestSurface, burnedSurfaces } from '../correction-episodes.js';
import { deriveMissionRepairPlans, deriveRetestReservations } from './repair-proof.js';
import { TIER_OF } from './constants.js';

const PURPOSE_OK = {
  resume_in_flight: ['input', 'notice', 'retrieval', 'production', 'interaction'],
  due_retrieval: ['delayed_retrieval'],
  refresh: ['remediation', 'retrieval'],
  correction: ['remediation'],
  /* 008F/B1: the delayed retest may surface on any independent
   * eliciting purpose — the episode contract does the freshness work. */
  correction_retest: ['delayed_retrieval', 'retrieval', 'production', 'interaction'],
  support_demand: ['support'],
  transfer: ['transfer'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  diagnostic_probe: ['diagnostic'],
  mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  assessment: ['assessment']
};

const REPAIR_BOUND_DEFAULT = 3;

export function validateDecision(decision, { events, tasks, capabilities, roles, mission, learnerId, now, policy, selection = {}, decisionContext = null }) {
  const v = [];
  const ch = decision?.chosen ?? {};
  const pol = resolvePolicy(policy);

  /* Terminal kinds are validated INDEPENDENTLY (HIGH-5 r3): the
   * decision's own candidates/candidateCount are policy-produced
   * metadata and can lie. The validator regenerates the candidate
   * surface under the real state/config and applies its own minimal
   * hard checks (purpose map + servable task) to decide whether honest
   * work existed at all. */
  const latestById = new Map();
  const exactByKey = new Map();
  for (const t of tasks) {
    const k = `${t.id}@${t.revision ?? 1}`;
    if (exactByKey.has(k)) v.push(`duplicate_task_revision:${k}`);
    exactByKey.set(k, t);
    const prev = latestById.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latestById.set(t.id, t);
  }
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const missionTaskIds = mission ? new Set(mission.taskIds ?? []) : null;

  /* kernel truth, recomputed independently of the policy's pipeline */
  const proj = projectLearnerState(learnerId, events, capabilities, tasks, { policy: pol });
  const lc = deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy: pol });
  const pending = lc.pending ?? [];
  const byCap = proj.byCapability;
  /* 008F: a B1-versioned decision is re-checked against independently
   * derived correction episodes — never the decision's own digest. */
  const isB1 = /b1/.test(decision.selectionPolicyVersion ?? '');
  const episodes = isB1
    ? deriveCorrectionEpisodes({ learnerId, events, capabilities, tasks, policy: pol, now })
    : null;

  /* One shared rebuild per decision — memoized so the terminal path
   * and the chosen-side reservation check never pay two generation
   * passes. For B1 the rebuild also derives the mission-local repair
   * proof + reservations independently (never the decision's own
   * digest/plans). */
  let _rebuilt = null;
  const rebuild = () => {
    if (_rebuilt) return _rebuilt;
    try {
      const gen = generateCandidates({
        learnerId, events, capabilities, tasks, roles, policy: pol,
        now, mission, decisionContext, selection
      });
      if (gen.integrityViolations?.length) return _rebuilt = { work: false, integrity: true, reservations: null };
      /* Recompute eligibility with the shared hard-filter contract —
       * the point is that the DECISION's emitted candidate view is
       * untrusted, not that the filter spec is re-derived here. The
       * freshness mode follows the decision's own policy version:
       * a0 mirrors production re-probe; b0/c0 run fresh-only; b1
       * additionally re-derives the correction-episode gate AND the
       * mission-local reservation set. */
      const mode = /a0/.test(decision.selectionPolicyVersion ?? '') ? 'production' : 'fresh';
      let reservations = null;
      if (isB1 && gen.resolver) {
        const plans = deriveMissionRepairPlans({
          episodes, mission, tasks, candidates: gen.candidates,
          resolver: gen.resolver, selection,
          decisionContext, pendingDemands: pending, roles,
          episodes, hardFilter
        });
        reservations = deriveRetestReservations({
          episodes, plans, missionTasks: gen.resolver.missionTasks
        });
      }
      const env = { ctx: decisionContext, selection, pendingDemands: pending, roles, assessmentMode: mode, episodes, reservations };
      const work = (gen.candidates ?? []).some((c) =>
        hardFilter(c, env).length === 0);
      return _rebuilt = { work, integrity: false, reservations };
    } catch {
      return _rebuilt = { work: false, integrity: true, reservations: null };
    }
  };
  if (ch.kind === 'idle' || ch.kind === 'blocked') {
    if (ch.capabilityId != null || ch.taskId != null) v.push(`${ch.kind}_with_payload`);
    const { work, integrity } = rebuild();
    /* 008F: B1 due-retest work is synthesized inside policyB1 and never
     * appears in the generic candidate rebuild — reconstruct it from
     * the independently derived episodes, never from the decision's own
     * correctionEpisodes digest. A due episode with an honest surface
     * means a B1 idle/blocked decision is fabricated. */
    let dueRetestWork = false;
    if (isB1) {
      const pool = missionTaskIds
        ? [...latestById.values()].filter((t) => missionTaskIds.has(t.id))
        : [...latestById.values()];
      dueRetestWork = (episodes?.episodes ?? []).some((ep) =>
        ep.state === 'RETEST_DUE' && pickRetestSurface(ep, pool) != null);
    }
    const anyWork = work || dueRetestWork;
    if (ch.kind === 'idle') {
      if (integrity) v.push('idle_during_integrity_violation');
      if (anyWork) v.push('fabricated_idle');
    } else {
      if (anyWork && !integrity) v.push('blocked_while_valid_work');
      if (!anyWork && !integrity && !(decision.integrityViolations ?? []).length && !(decision.candidateCount > 0)) {
        v.push('blocked_without_work');
      }
    }
    return v;
  }
  if (ch.kind == null) return ['no_chosen_kind'];


  /* task existence + registry validity + EXACT revision (BLOCKER-2):
   * the decision stamps taskRevision; the validator resolves that
   * exact contract, never "latest". */
  let task = null;
  if (ch.taskId == null) v.push('chosen_with_null_task');
  else if (ch.taskRevision != null) {
    task = exactByKey.get(`${ch.taskId}@${ch.taskRevision}`) ?? null;
    if (!task) v.push('task_revision_missing');
  } else {
    v.push('task_revision_absent'); // unversioned choices cannot be audited
    task = latestById.get(ch.taskId) ?? null;
    if (!task) v.push('task_not_in_registry');
  }
  if (task) {
    if (validateTask(task).length) v.push('task_contract_invalid');
    if (missionTaskIds && !missionTaskIds.has(task.id)) v.push('task_outside_mission');
    if (task.capabilityId !== ch.capabilityId) v.push('task_capability_mismatch');
    const cap = capById.get(task.capabilityId);
    if (!cap) v.push('capability_unknown');
    else if (task.modality !== cap.modality) v.push('modality_mismatch');
    if (!PURPOSE_OK[ch.kind]?.includes(task.purpose)) v.push(`purpose_substitution:${task.purpose}~${ch.kind}`);
  }
  if (mission) {
    for (const id of missionTaskIds ?? []) {
      if (!latestById.has(id)) { v.push(`missing_declared_task:${id}`); break; }
    }
    if (decision.missionId != null && decision.missionId !== mission.id) v.push('mission_identity_mismatch');
    if (decision.missionRevision != null && mission.revision != null && decision.missionRevision !== mission.revision) v.push('mission_revision_mismatch');
  }

  const cap = capById.get(ch.capabilityId);
  if (ch.capabilityId != null && !cap) v.push('capability_outside_surface');


  /* future-evidence check: any learner event after `now` invalidates the
   * state the decision was made on */
  if (events.some((e) => e.learnerId === learnerId && e.occurredAt > now)) v.push('future_evidence_in_state');

  /* Verified observed attempts (MEDIUM-11 + HIGH-5 r3): an event only
   * counts as direct verified evidence when it (a) resolves to an exact
   * taskId@revision in the registry, (b) passes verifyEventTask against
   * that exact revision and capability, and (c) stamps
   * attempt.observed === true. A stale revision or malformed binding is
   * context, never verified failure evidence. */
  const verified = (e) => {
    if (e.learnerId !== learnerId) return false;
    const t = exactByKey.get(`${e.taskId}@${e.taskRevision ?? 1}`);
    if (!t) return false;
    const cap2 = capById.get(t.capabilityId);
    if (!cap2) return false;
    return verifyEventTask(e, t, cap2);
  };
  const observedAttempts = (capId) => [...events]
    .filter((e) => verified(e) && e.capabilityId === capId && e.attempt?.outcome != null && e.attempt.observed === true)
    .sort((a, b) => b.occurredAt - a.occurredAt);
  const observedFailCount = (capId) => {
    let n = 0;
    for (const e of observedAttempts(capId)) {
      if (e.attempt.outcome === 'success') break;
      n++;
    }
    return n;
  };
  const episodeRepairs = (capId) => (decisionContext?.actionsChosen ?? [])
    .filter((a) => a.capabilityId === capId && (a.kind === 'correction' || a.kind === 'refresh')).length;

  /* Hard safety rules the policy claims — re-verified here */
  const diagBudget = selection.diagnosticMaxPerEpisode ?? 2;
  if (ch.kind === 'diagnostic_probe' && (decisionContext?.counts?.diagnostic ?? 0) >= diagBudget) {
    v.push('diagnostic_budget_exceeded');
  }
  const ceiling = selection.failureCeiling ?? 3;
  if (ch.kind === 'correction' && observedFailCount(ch.capabilityId) >= ceiling) v.push('failure_ceiling_exceeded');
  if ((ch.kind === 'correction' || ch.kind === 'refresh') && episodeRepairs(ch.capabilityId) >= (selection.repairMaxPerEpisodePerCap ?? REPAIR_BOUND_DEFAULT)) {
    v.push('repair_bound_exceeded');
  }

  if (cap) {
    const prereqOk = (cap.prerequisites ?? []).every((p) => byCap.get(p)?.milestones.independent);
    if (!prereqOk && ['mission_continuation', 'new_input', 'diagnostic_probe', 'independent_attempt', 'correction', 'transfer', 'assessment'].includes(ch.kind)) {
      v.push('prerequisite_open');
    }

    if (ch.kind === 'support_demand') {
      /* BLOCKER-5: the chosen decision must carry the full demand
       * identity, and that exact demand must still be pending — not
       * just any demand sharing the provider. */
      const dp = ch.demandProvenance;
      if (!dp) v.push('demand_provenance_absent');
      else {
        const exact = pending.find((d) =>
          d.supportCapabilityId === ch.capabilityId &&
          d.targetCapabilityId === dp.targetCapabilityId &&
          d.missingFunction === dp.missingFunction &&
          d.sourceEventId === dp.sourceEventId);
        if (!exact) v.push('demand_provenance_mismatch');
        else if (!(task?.response?.requiredFunctions ?? []).includes(exact.missingFunction)) v.push('probe_wrong_function');
      }
    }
    if (ch.kind === 'resume_in_flight') {
      /* RESUME means "encounter exposed, no attempt yet" — with no
       * exposure event on the capability there is nothing to resume. */
      const exposed = events.some((e) => e.learnerId === learnerId && e.capabilityId === ch.capabilityId && e.eventType === 'exposure');
      if (!exposed) v.push('resume_no_evidence');
    }
    if (ch.kind === 'refresh') {
      const obs = observedAttempts(ch.capabilityId)[0];
      if (!obs || !['fail', 'partial'].includes(obs.attempt.outcome)) v.push('false_relearning');
    }
    if (ch.kind === 'assessment') {
      if (!byCap.get(ch.capabilityId)?.milestones.transferred) v.push('assessment_without_transfer');
      /* Policy-dependent: production re-probes consumed items; the
       * strict-fresh variants must never re-sell a consumed task NOR a
       * consumed semantic family (HIGH-2 r4). Family identity derives
       * from canonicalFamilyId(capabilityId, contextSignature) — a
       * renamed promptFamily on the same signature is the same revealed
       * family. Only VERIFIED events consume: a malformed/stale event
       * cannot poison freshness. */
      const policyAllowsReprobe = /a0/.test(decision.selectionPolicyVersion ?? '');
      const familyIdOf = (o) => o?.contextSignature
        ? canonicalFamilyId(o.capabilityId, o.contextSignature)
        : (o?.promptFamily ?? o?.family ?? o?.id);
      const chosenFamily = task ? familyIdOf(task) : null;
      /* Consumption is verification-gated for BOTH the same-task and
       * the family paths (HIGH r5): resolve exact task@rev →
       * verifyEventTask → only then may it consume. A malformed binding/
       * evaluator/context event on the very task being chosen cannot
       * fake consumption — the same bar the generator applies. */
      const consumed = events.some((e) => {
        if (e.learnerId !== learnerId) return false;
        if (!(e.attempt?.outcome != null || e.eventType === 'checkpoint')) return false;
        const et = exactByKey.get(`${e.taskId}@${e.taskRevision ?? 1}`);
        if (!et || et.purpose !== 'assessment') return false;
        const cap2 = capById.get(et.capabilityId);
        if (!cap2 || !verifyEventTask(e, et, cap2)) return false;
        if (et.id === ch.taskId && (et.revision ?? 1) === (ch.taskRevision ?? 1)) return true;
        return chosenFamily != null && familyIdOf(et) === chosenFamily;
      });
      if (consumed && !policyAllowsReprobe) v.push('assessment_resold_as_fresh');
    }
    if (ch.kind === 'transfer' && byCap.get(ch.capabilityId)?.milestones.transferred) {
      v.push('transfer_already_demonstrated');
    }
  }

  /* 008F/B1 rules — the validator derives episodes itself; a chosen
   * retest must sit on a genuinely due episode and an eligible surface,
   * and a B1 certification intent can never serve on an open episode. */
  if (ch.kind === 'correction_retest') {
    const ep = episodes?.openByCapability?.[ch.capabilityId];
    if (!ep) v.push('correction_retest_without_episode');
    else {
      if (ep.state !== 'RETEST_DUE') v.push(`correction_retest_not_due:${ep.state}`);
      const covered = ep.missingFunctions
        .filter((f) => ep.verifiedFunctions[f] == null)
        .filter((f) => (task?.response?.requiredFunctions ?? []).includes(f));
      if (!covered.length) v.push('correction_retest_no_coverage');
      /* Same burned set the derivation enforces: every failure surface,
       * consumed remediation, repair-establishing success and pre-lag
       * practiced probe. */
      if (task && burnedSurfaces(ep).has(task.id)) v.push('correction_retest_reused_surface');
    }
  }
  if (episodes && (ch.kind === 'transfer' || ch.kind === 'assessment')) {
    const ep = episodes.openByCapability?.[ch.capabilityId];
    if (ep) v.push(`certification_under_open_episode:${ep.state}`);
  }
  /* 008G: a B1 decision may not serve a retest probe while the
   * mission-local repair proof withholds it — the reservation set is
   * re-derived here, never read off the decision record. The rebuild
   * pays only when the chosen task sits on an open-episode capability
   * in a reserving state. */
  if (task && episodes && ch.kind !== 'correction_retest') {
    const ep = episodes.openByCapability?.[ch.capabilityId];
    if (ep && ep.state !== 'RETEST_DUE' && ep.state !== 'VERIFIED') {
      const { reservations } = rebuild();
      if (reservations?.has(task.id)) v.push('correction_retest_surface_reserved');
    }
  }

  return v;
}

export { TIER_OF };
