/*
 * vNext curriculum checks (issue #57, R5).
 *
 * The authoring gate for the capability DAG + mission/task content —
 * contracts.js proves a task is well-formed; THIS layer proves the
 * curriculum is honest:
 *
 *   1. DAG validity — no duplicate ids, no dangling prerequisites,
 *      no cycles (delegated to validateGraph).
 *   2. Mission validity — delegated to validateMission, plus the R5
 *      evidence package: every claim-bearing TARGET capability owes
 *      practiced, delayed, held-out transfer and fresh-assessment
 *      coverage. Carriers may be rehearsed but must not carry
 *      fresh_transfer tasks (that would masquerade a target claim).
 *   3. Novelty integrity — prompt families are canonical
 *      pf.<capability>.<cueTopology>.<setting>.<register>.<channel>.vN
 *      ids that re-derive the task's contextSignature; the same family
 *      cannot mean two signatures; two families for one capability
 *      cannot share a signature; fresh families can never alias a
 *      practiced family; and a transfer task's declared changed
 *      dimensions must differ from EVERY practiced family on real
 *      signature fields — not merely in wording.
 *
 * Everything here is pure data validation — it runs in tests and in
 * content tooling, never inside the mission runner's hot path.
 */
import {
  ELICITING_PURPOSES,
  SIGNATURE_ID_FIELDS,
  SIGNATURE_FIELDS,
  signatureHash,
  validateMission,
  validateMissionContent
} from './contracts.js';
import { validateGraph } from './capabilities.js';

/* R5: prefer ~2 acquisition targets per mission; more than 3 makes
 * causal attribution of evidence weak — treated as an authoring error
 * so mission authors must split instead of bloating. */
export const MAX_TARGETS_PER_MISSION = 3;

/* R6: the binding constraint on a mission is the ACTIVE SURFACE —
 * targets + carriers + supports: the capabilities the mission can
 * actually serve tasks to. Declared `prerequisiteCapabilities` are
 * read-only gates (evidence carried from earlier missions) — they are
 * not counted here because they never consume diagnostic, exposure or
 * rehearsal bandwidth in THIS mission. */
export const MAX_SURFACE_CAPABILITIES = 6;

/* TRANSFER_DIMENSIONS are the contract's v0 vocabulary; the signature
 * fields they map to are what the novelty checker actually verifies.
 * 'support_level', 'task_goal' and 'delay' are not context fields —
 * a transfer declaring ONLY those is not a context transfer at all. */
export const TRANSFER_DIM_FIELD = {
  wording: 'cueTopology',
  partner: 'interlocutorRole',
  setting: 'setting',
  medium: 'channel',
  response_form: 'responseTopology'
};

/* Parse a canonical prompt-family id:
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.<sigHash8>.vN
 * The capability id itself contains dots, so the signature fields are
 * read from the tail: the last 6 segments are
 * cue/setting/register/channel/hash/vN and everything before is the
 * cap id. */
export function parseFamilyId(promptFamily) {
  if (typeof promptFamily !== 'string' || !promptFamily.startsWith('pf.')) return null;
  const m = promptFamily.slice(3).match(/\.v(\d+)$/);
  if (!m) return null;
  const segs = promptFamily.slice(3, promptFamily.length - m[0].length).split('.');
  if (segs.length < 6) return null;
  const [cueTopology, setting, register, channel, hash] = segs.splice(-5);
  const capabilityId = segs.join('.');
  if (!capabilityId || !/^[0-9a-f]{8}$/.test(hash)) return null;
  return { capabilityId, cueTopology, setting, register, channel, hash, version: Number(m[1]) };
}

const sigKey = (sig) =>
  JSON.stringify(SIGNATURE_FIELDS.map((f) => sig?.[f] ?? null));

const familyClass = (t) => t.freshness?.familyClass ?? 'practiced';

export function checkCurriculum({ capabilities = [], missions = [], tasks = [], contentPolicy = {} }) {
  const problems = [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  /* ── 1. DAG validity ─────────────────────────────────────── */
  for (const prob of validateGraph(capabilities)) problems.push(`graph: ${prob}`);

  /* ── 2. Mission validity + evidenceability + content contract ──
   * checkCurriculum is the authoritative authoring gate: a mission that
   * passes structure but violates its own language declaration
   * (undeclared chunks/vocabulary/constructions, over-budget
   * introductions) must not ship. `contentPolicy` carries optional
   * budgets (maxNewChunks / maxNewVocabulary / maxNewConstructions);
   * budgets are only enforced when supplied. */
  for (const mission of missions) {
    const tag = mission?.id ?? '?';
    for (const prob of validateMission(mission, tasks, capabilities)) problems.push(`${tag}: ${prob}`);
    for (const prob of validateMissionContent(mission, tasks, capabilities, contentPolicy)) {
      problems.push(`${tag}: ${prob}`);
    }

    const missionTasks = (mission?.taskIds ?? []).map((id) => taskById.get(id)).filter(Boolean);
    const targets = mission?.targetCapabilities ?? [];
    if (targets.length > MAX_TARGETS_PER_MISSION) {
      problems.push(`${tag}: ${targets.length} target capabilities — missions claim at most ${MAX_TARGETS_PER_MISSION} (prefer 2; split the rest into carriers or a later mission)`);
    }
    const surface = targets.length +
      (mission?.carrierCapabilities ?? []).length +
      (mission?.supportCapabilities ?? []).length;
    if (surface > MAX_SURFACE_CAPABILITIES) {
      problems.push(`${tag}: ${surface} active capabilities — the active surface is capped at ${MAX_SURFACE_CAPABILITIES} (prerequisite gates excluded); split into another mission`);
    }
    for (const capId of targets) {
      const capTasks = missionTasks.filter((t) => t.capabilityId === capId);
      /* R6: targets owe a mandatory baseline probe — the planner's
       * diagnostic_probe intent only stays honest if a task exists to
       * serve it. */
      if (!capTasks.some((t) => t.purpose === 'diagnostic')) {
        problems.push(`${tag}: target '${capId}' has no diagnostic task — a claim-bearing capability must sample its baseline before teaching`);
      }
      const taught = capTasks.some((t) => ELICITING_PURPOSES.has(t.purpose) && familyClass(t) === 'practiced');
      if (!taught) problems.push(`${tag}: target '${capId}' has no practiced-family eliciting task — there is nothing to retain`);
      if (!capTasks.some((t) => t.purpose === 'delayed_retrieval')) {
        problems.push(`${tag}: target '${capId}' has no delayed_retrieval task — retention cannot be evidenced`);
      }
      if (mission?.transferPlan?.required && !capTasks.some((t) => familyClass(t) === 'fresh_transfer')) {
        problems.push(`${tag}: target '${capId}' has no fresh_transfer task — transfer cannot be evidenced`);
      }
      if (mission?.assessmentPlan?.required &&
          !missionTasks.some((t) => t.purpose === 'assessment' && (t.assessment?.capabilitySample ?? []).includes(capId))) {
        problems.push(`${tag}: target '${capId}' is not in any assessment capabilitySample — fresh assessment cannot be evidenced`);
      }
    }
    for (const capId of mission?.carrierCapabilities ?? []) {
      const capTasks = missionTasks.filter((t) => t.capabilityId === capId);
      if (!capTasks.length) {
        problems.push(`${tag}: carrier '${capId}' has no tasks — a dead declaration only invites planner intents the mission cannot serve`);
      }
      if (capTasks.some((t) => familyClass(t) === 'fresh_transfer')) {
        problems.push(`${tag}: carrier '${capId}' carries a fresh_transfer task — held-out transfer credit is reserved for claim-bearing targets`);
      }
      /* R6: carriers are rehearsed, never baselined or certified —
       * the planner never emits a diagnostic_probe intent for them
       * and they can never reach the TRANSFERRED state an assessment
       * waits on, so either task kind here is dead authoring. */
      if (capTasks.some((t) => t.purpose === 'diagnostic' || t.purpose === 'assessment')) {
        problems.push(`${tag}: carrier '${capId}' owns a diagnostic/assessment task — carriers get no baseline and no certification`);
      }
    }

    /* ── Support roles (#61): a declared support capability must be a
     * REAL demand route, not paper — it must provide at least one
     * function some mission task requires, own at least one support-
     * purpose probe task, and never share a role with target/carrier/
     * prerequisite surfaces. Tasks ON a support cap may only be support
     * probes — a claim-bearing purpose would launder remediation work
     * into capability evidence. */
    const supports = mission?.supportCapabilities ?? [];
    const supportSet = new Set(supports);
    const roleOverlap = supports.filter((id) =>
      targets.includes(id) ||
      (mission?.carrierCapabilities ?? []).includes(id) ||
      (mission?.prerequisiteCapabilities ?? []).includes(id));
    for (const id of roleOverlap) {
      problems.push(`${tag}: support '${id}' also appears as target/carrier/prerequisite — a capability holds exactly one mission role`);
    }
    const capByIdAll = new Map(capabilities.map((c) => [c.id, c]));
    const missionRequiredFns = new Set();
    for (const t of missionTasks) {
      for (const fn of t.response?.requiredFunctions ?? []) missionRequiredFns.add(fn);
    }
    for (const capId of supports) {
      const cap = capByIdAll.get(capId);
      if (!cap) continue; // unknown id already flagged by validateMission
      const provided = (cap.providesFunctions ?? []).filter((fn) => missionRequiredFns.has(fn));
      if (!provided.length) {
        problems.push(`${tag}: support '${capId}' provides no function any mission task requires — a dead paper support declaration`);
      }
      const capTasks = missionTasks.filter((t) => t.capabilityId === capId);
      const probes = capTasks.filter((t) => t.purpose === 'support');
      if (!probes.length) {
        problems.push(`${tag}: support '${capId}' owns no support-purpose probe task — a demand could be issued but never served`);
      }
      if (capTasks.some((t) => t.purpose !== 'support')) {
        problems.push(`${tag}: support '${capId}' owns a non-support task — remediation substrate cannot carry claim-bearing purposes`);
      }
      /* Function-scoped routing needs per-function servability: every
       * mission-relevant provided function must be exercised by at
       * least one probe (else its demand issues but is never correctly
       * served), and a probe may only test functions the cap actually
       * provides — otherwise its evidence is misprovenanced and could
       * consume demands it never addressed. */
      const covered = new Set();
      for (const t of probes) {
        for (const fn of t.response?.requiredFunctions ?? []) {
          covered.add(fn);
          if (!(cap.providesFunctions ?? []).includes(fn)) {
            problems.push(`${tag}: support probe '${t.id}' tests '${fn}', which '${capId}' does not provide — misprovenanced substrate evidence`);
          }
        }
      }
      for (const fn of provided) {
        if (!covered.has(fn)) {
          problems.push(`${tag}: support '${capId}' provides '${fn}' but no probe on it tests that function — a demand for '${fn}' can issue but is unservable`);
        }
      }
    }
    for (const t of missionTasks) {
      if (t.purpose === 'support' && !supportSet.has(t.capabilityId)) {
        problems.push(`${tag}: task '${t.id}' has purpose 'support' on non-support capability '${t.capabilityId}' — support probes live on support roles only`);
      }
    }
  }

  /* ── 3a. Signature presence + canonical family ids ───────── */
  for (const t of tasks) {
    const tag = `task '${t.id}'`;
    if (t.contextSignature == null) {
      problems.push(`${tag}: missing contextSignature — a family without an auditable signature cannot prove novelty`);
    }
    const fam = parseFamilyId(t.promptFamily);
    if (!fam) {
      problems.push(`${tag}: promptFamily '${t.promptFamily}' is not canonical pf.<cap>.<cue>.<setting>.<register>.<channel>.<sigHash8>.vN form`);
    } else {
      if (fam.capabilityId !== t.capabilityId) {
        problems.push(`${tag}: family id names capability '${fam.capabilityId}' but the task declares '${t.capabilityId}'`);
      }
      for (const f of SIGNATURE_ID_FIELDS) {
        if (t.contextSignature != null && fam[f] !== t.contextSignature[f]) {
          problems.push(`${tag}: family id ${f} '${fam[f]}' contradicts contextSignature.${f} '${t.contextSignature[f]}'`);
        }
      }
      if (t.contextSignature != null && fam.hash !== signatureHash(t.contextSignature)) {
        problems.push(`${tag}: family id hash '${fam.hash}' does not recompute from its contextSignature — id and signature disagree`);
      }
    }
  }

  /* ── 3b. Family coherence + per-capability novelty ───────── */
  const byFamily = new Map();
  for (const t of tasks) {
    if (!byFamily.has(t.promptFamily)) byFamily.set(t.promptFamily, []);
    byFamily.get(t.promptFamily).push(t);
  }
  for (const [fam, members] of byFamily) {
    const sigs = new Set(members.map((t) => sigKey(t.contextSignature)));
    if (sigs.size > 1) {
      problems.push(`prompt family '${fam}' spans ${sigs.size} different signatures — same-family tasks must describe the same context`);
    }
    const classes = new Set(members.map(familyClass));
    if (classes.size > 1) {
      problems.push(`prompt family '${fam}' mixes freshness classes (${[...classes].join(', ')}) — teaching and held-out testing cannot share a family`);
    }
  }

  const capIds = [...new Set(tasks.map((t) => t.capabilityId))];
  for (const capId of capIds) {
    const capTasks = tasks.filter((t) => t.capabilityId === capId);
    const sigByFamily = new Map();
    for (const t of capTasks) {
      if (!t.contextSignature) continue;
      const key = sigKey(t.contextSignature);
      const other = sigByFamily.get(key);
      if (other && other !== t.promptFamily) {
        problems.push(`capability '${capId}': families '${other}' and '${t.promptFamily}' have identical signatures — fake novelty`);
      } else {
        sigByFamily.set(key, t.promptFamily);
      }
    }
  }

  /* ── 3c. Transfer deltas must be real signature deltas ───── */
  for (const t of tasks.filter((t) => t.purpose === 'transfer')) {
    const dims = t.transfer?.changedDimensions ?? [];
    const mappable = dims.filter((d) => TRANSFER_DIM_FIELD[d]);
    if (!mappable.length) {
      problems.push(`transfer task '${t.id}' declares no signature-mappable changed dimension (${dims.join(', ') || 'none'}) — delay/support_level/task_goal alone are not a context transfer`);
      continue;
    }
    const practiced = tasks.filter(
      (p) => p.capabilityId === t.capabilityId && p.id !== t.id && familyClass(p) === 'practiced'
    );
    for (const d of mappable) {
      const field = TRANSFER_DIM_FIELD[d];
      if (!t.contextSignature?.[field]) {
        problems.push(`transfer task '${t.id}' declares '${d}' but its signature lacks '${field}'`);
        continue;
      }
      for (const p of practiced) {
        if (!p.contextSignature?.[field]) {
          problems.push(`practiced task '${p.id}' has no signature.${field} — transfer task '${t.id}' cannot prove its declared '${d}' delta against family '${p.promptFamily}'`);
          continue;
        }
        if (p.contextSignature[field] === t.contextSignature[field]) {
          problems.push(`transfer task '${t.id}' declares changed dimension '${d}' but signature.${field} '${t.contextSignature[field]}' equals practiced family '${p.promptFamily}' — the declared delta does not exist`);
        }
      }
    }
  }

  return problems;
}
