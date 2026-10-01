/*
 * Contract registry: the seam's trust boundary.
 *
 * A registry is an immutable, validated set of kernel contracts. The
 * bridge resolves taskId → task → capability here — caller-supplied
 * identities never bypass it. Registration runs the kernel's authoring
 * gate (checkCurriculum) so a registry that would not ship in FlashDay
 * cannot mint evidence in EchoType either.
 */
import { CAPABILITIES } from '@/vnext/capabilities';
import { checkCurriculum } from '@/vnext/curriculum-checks';
import { FIXTURES } from '@/vnext/fixtures';
import type { ContractRegistry, KernelCapability, KernelMission, KernelTask } from './types';

export function createRegistry(input: {
  tasks: KernelTask[];
  capabilities: KernelCapability[];
  missions?: KernelMission[];
  contentPolicy?: Record<string, unknown>;
}): ContractRegistry {
  const tasks = input.tasks ?? [];
  const capabilities = input.capabilities ?? [];
  const missions = input.missions ?? [];

  const problems = checkCurriculum({
    capabilities: capabilities as never[],
    missions: missions as never[],
    tasks: tasks as never[],
    contentPolicy: input.contentPolicy ?? {},
  });
  if (problems.length) {
    throw new Error(`contract registry failed authoring gate:\n - ${problems.join('\n - ')}`);
  }

  // Duplicate id@revision registrations are an integrity violation —
  // replaying history under a silently reinterpreted contract is worse
  // than refusing to start.
  const byRev = new Map<string, KernelTask>();
  const byId = new Map<string, KernelTask>();
  for (const t of tasks) {
    const rev = `${t.id}@${t.revision}`;
    if (byRev.has(rev)) throw new Error(`duplicate task registration '${rev}'`);
    byRev.set(rev, t);
    // A revised task supersedes its earlier contract for binding; replay
    // still resolves old events by their stamped taskRevision.
    const prior = byId.get(t.id);
    if (!prior || t.revision > prior.revision) byId.set(t.id, t);
  }
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const missionById = new Map(missions.map((m) => [m.id, m]));

  return {
    tasks,
    capabilities,
    missions,
    taskById: (id) => byId.get(id),
    capabilityById: (id) => capById.get(id),
    missionById: (id) => missionById.get(id),
  };
}

/** The vendored curriculum + canonical capability set, as shipped. */
export function fixtureRegistry(): ContractRegistry {
  return createRegistry({
    tasks: FIXTURES.flatMap((f) => f.tasks) as KernelTask[],
    capabilities: CAPABILITIES as KernelCapability[],
    missions: FIXTURES.map((f) => f.mission) as KernelMission[],
  });
}
