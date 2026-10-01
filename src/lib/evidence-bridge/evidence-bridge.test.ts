import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CAPABILITIES } from '@/vnext/capabilities';
import { makeTask } from '@/vnext/contracts';
import { FIXTURES, MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '@/vnext/fixtures';
import { db } from '../db';
import {
  createDexieEventStore,
  createRegistry,
  fixtureRegistry,
  nextAction,
  projectState,
  submitAttempt,
  submitObservation,
} from './index';
import type { CapabilitySlot, LearnerProjection } from './types';

/*
 * Evidence Bridge contract tests (mission §15 pins).
 *
 * The seam under test: EchoType can only ever submit OBSERVED REALITY —
 * a task id plus what the learner did — into a registered FlashDay
 * contract registry. capabilityId, purpose, context, freshness,
 * transfer, outcome authority and binding metadata are derived from the
 * contract, never from the caller.
 */

const LEARNER = 'learner.bridge';
const OTHER = 'learner.other';
const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3_600_000;

const cloneTask = (id: string) => {
  const src = TASKS_MEET_PERSON.find((t) => t.id === id);
  if (!src) throw new Error(`fixture task '${id}' missing`);
  return JSON.parse(JSON.stringify(src));
};

/* An STT-backed speaking task: the transcript is real, the ASR engine
 * is the declared evaluating authority — it must never mint
 * independent credit no matter how clean the transcript looks. */
const ASR_SHADOW_TASK = makeTask({
  ...cloneTask('task.meet.retrieval.ask_name'),
  id: 'task.test.asr_shadow.ask_name',
  evaluation: { authority: 'asr', contractId: 'eval.required_functions.v1' },
});

// The kernel requires every task to be declared by its mission.
const MISSION_WITH_ASR = {
  ...MISSION_MEET_PERSON,
  taskIds: [...MISSION_MEET_PERSON.taskIds, ASR_SHADOW_TASK.id],
};

const registry = () =>
  createRegistry({
    tasks: [...TASKS_MEET_PERSON, ASR_SHADOW_TASK],
    capabilities: CAPABILITIES,
    missions: [MISSION_WITH_ASR],
  });

const storeFor = () => createDexieEventStore(db.evidenceEvents);

beforeEach(async () => {
  await db.evidenceEvents.clear();
});

const cap = (projection: LearnerProjection, id: string): CapabilitySlot => {
  const slot = projection.byCapability.get(id);
  if (!slot) throw new Error(`capability '${id}' not in projection`);
  return slot;
};

describe('contract forgery is impossible', () => {
  it.each([
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
  ])('rejects a submission carrying forged semantic field %s', async (field) => {
    await expect(
      submitAttempt(storeFor(), registry(), {
        learnerId: LEARNER,
        taskId: 'task.meet.retrieval.ask_name',
        occurredAt: T0,
        response: "What's your name?",
        [field]: 'forged',
      } as never),
    ).rejects.toThrow();
  });

  it('rejects an unregistered task id — no contract, no evidence', async () => {
    await expect(
      submitAttempt(storeFor(), registry(), {
        learnerId: LEARNER,
        taskId: 'task.ui.invented',
        occurredAt: T0,
        response: 'whatever',
      }),
    ).rejects.toThrow(/unregistered|unknown/i);
  });

  it('derives capabilityId from the contract, not the caller', async () => {
    const event = await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      response: "What's your name?",
    });
    expect(event.capabilityId).toBe('interaction.ask_name');
    expect(event.context?.promptFamily).toBe(
      'pf.interaction.ask_name.cued_recall.personal.casual.f2f.4b7cc635.v1',
    );
  });
});

describe('outcome authority lives in the contract', () => {
  it('correct=true cannot mint capability: evaluator scores the response, not the UI claim', async () => {
    // The UI claims success; the produced text evidences nothing.
    const event = await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      response: 'hello there',
      outcome: 'success',
    });
    expect(event.attempt?.outcome).toBe('fail');

    const projection = await projectState(LEARNER, storeFor(), registry());
    expect(cap(projection, 'interaction.ask_name').state).not.toBe('INDEPENDENT');
  });

  it('lesson completion cannot mint mastery: a practiced success is at most INDEPENDENT', async () => {
    await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.complete',
      response: "What's your name?",
    });
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    expect(['INDEPENDENT', 'SUPPORTED', 'EXPOSED']).toContain(slot.state);
    expect(slot.state).not.toBe('TRANSFERRED');
    expect(slot.state).not.toBe('FLUENT');
  });
});

describe('support honesty', () => {
  it('a hint-supported success is SUPPORTED, never INDEPENDENT', async () => {
    await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.hinted',
      response: "What's your name?",
      support: { hint: true },
    });
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    expect(slot.milestones.supported).toBe(true);
    expect(slot.milestones.independent).toBe(false);
  });
});

describe('speaking boundary', () => {
  it('STT success cannot mint independent speaking credit', async () => {
    const event = await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.test.asr_shadow.ask_name',
      occurredAt: T0,
      response: "What's your name?",
      evaluation: { evaluator: 'web-speech-stt', version: '1' },
    });
    // The transcript scored perfectly — authority is still 'asr'.
    expect(event.attempt?.outcome).toBe('success');
    expect(event.evaluation?.authority).toBe('asr');

    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    expect(slot.milestones.supported).toBe(true);
    expect(slot.milestones.independent).toBe(false);
  });
});

describe('transfer and assessment discipline', () => {
  it('a practiced-family task can never earn transfer credit', async () => {
    await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.practiced',
      response: "What's your name?",
    });
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    expect(slot.milestones.transferred).toBe(false);
    expect(slot.transferPromptFamilies).toHaveLength(0);
  });

  it('assessment attempts require a stable attemptId', async () => {
    const assessTask = TASKS_MEET_PERSON.find((t) => t.purpose === 'assessment');
    if (!assessTask) throw new Error('fixture has no assessment task');
    await expect(
      submitAttempt(storeFor(), registry(), {
        learnerId: LEARNER,
        taskId: assessTask.id,
        occurredAt: T0,
        response: "What's your name?",
      }),
    ).rejects.toThrow(/attemptId/);
  });
});

describe('FSRS stays the memory model, never the ability model', () => {
  it('fsrs-style scheduling fields on a submission are inert', async () => {
    await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.fsrs',
      response: 'uhhh name?',
      fsrs: { stability: 99, difficulty: 1, reps: 42 },
    } as never);
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    // Scheduling metadata must not have laundered into evidence credit.
    expect(slot.milestones.independent).toBe(false);
    expect(slot.milestones.transferred).toBe(false);
  });
});

describe('persistence and replay', () => {
  it('learner isolation: another learner’s evidence never enters the projection', async () => {
    const store = storeFor();
    await submitAttempt(store, registry(), {
      learnerId: OTHER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.other',
      response: "What's your name?",
    });
    const projection = await projectState(LEARNER, store, registry());
    expect(cap(projection, 'interaction.ask_name').state).toBe('NOT_SEEN');
    expect(projection.generatedFrom).toBe(0);
  });

  it('identical redelivery dedupes; same id + different content is a conflict', async () => {
    const store = storeFor();
    const event = await submitAttempt(store, registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.once',
      response: "What's your name?",
    });
    expect(await store.append([event])).toEqual({ appended: 0, deduped: 1 });
    await expect(store.append([{ ...event, occurredAt: T0 + 999 }])).rejects.toThrow(/conflict/i);
  });

  it('provenance survives a persist → reload → replay roundtrip identically', async () => {
    const store = storeFor();
    await submitAttempt(store, registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.persist',
      response: "What's your name?",
      evaluation: { evaluator: 'test', version: '1' },
    });
    const first = await projectState(LEARNER, store, registry());
    // Re-read from Dexie and replay from scratch.
    const second = await projectState(LEARNER, storeFor(), registry());
    expect(first).toEqual(second);
    const slot = cap(second, 'interaction.ask_name');
    expect(slot.state).toBe('INDEPENDENT');
  });
});

describe('retention needs delayed re-verification', () => {
  it('one success is INDEPENDENT, not RETAINED', async () => {
    await submitAttempt(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.now',
      response: "What's your name?",
    });
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'interaction.ask_name');
    expect(slot.milestones.independent).toBe(true);
    expect(slot.milestones.retained).toBe(false);
  });

  it('a delayed success beyond the retention lag earns RETAINED', async () => {
    const store = storeFor();
    const reg = registry();
    await submitAttempt(store, reg, {
      learnerId: LEARNER,
      taskId: 'task.meet.retrieval.ask_name',
      occurredAt: T0,
      attemptId: 'a.first',
      response: "What's your name?",
    });
    await submitAttempt(store, reg, {
      learnerId: LEARNER,
      taskId: 'task.meet.delayed.check',
      occurredAt: T0 + 25 * HOUR,
      attemptId: 'a.delayed',
      response: "What's your name?",
    });
    const projection = await projectState(LEARNER, store, reg);
    expect(cap(projection, 'interaction.ask_name').milestones.retained).toBe(true);
  });
});

describe('planner auditability', () => {
  it('nextAction returns a decision that explains itself', async () => {
    const store = storeFor();
    const reg = fixtureRegistry();
    const decision = await nextAction(reg, {
      learnerId: LEARNER,
      missionId: 'mission.meet_new_person',
      events: await store.list(),
      now: T0,
    });
    expect(decision).toMatchObject({
      status: 'ready',
      taskId: expect.any(String),
      purpose: expect.any(String),
      reason: expect.any(String),
    });
    expect(decision.reason.length).toBeGreaterThan(0);
  });
});

describe('observations', () => {
  it('bindObservation records exposure without outcome credit', async () => {
    const event = await submitObservation(storeFor(), registry(), {
      learnerId: LEARNER,
      taskId: 'task.meet.input.scene',
      occurredAt: T0,
      eventType: 'exposure',
    });
    expect(event.eventType).toBe('exposure');
    expect(event.attempt?.outcome).toBeNull();
    const projection = await projectState(LEARNER, storeFor(), registry());
    const slot = cap(projection, 'reception.listen.greeting_basic');
    expect(slot.state).toBe('EXPOSED');
    expect(slot.milestones.independent).toBe(false);
  });
});
