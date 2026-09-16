import type { ContentItem } from '@/types/content';
import { db } from './db';
import { buildLearningUnits } from './learning-units';
import { buildTextCourseTasks } from './text-daily-tasks';
import { buildVocabularyTasks } from './vocabulary';

/** Explicit opt-in from the completed import; never records practice evidence. */
export async function scheduleImportedMaterial(ids: string[]) {
  const owner = db;
  return owner.transaction(
    'rw',
    [owner.contents, owner.dailyTasks, owner.learningAttempts, owner.records],
    async () => {
      if (owner !== db) throw new Error('Account changed. Reopen imports.');
      const contents = (await owner.contents.bulkGet(ids)).filter(
        (item): item is ContentItem => !!item && !item.deletedAt,
      );
      const lesson = buildLearningUnits(contents).lessons[0];
      if (!lesson) throw new Error('Imported material is unavailable');
      const attempts = await owner.learningAttempts.toArray();
      const vocabulary = contents.every((item) => item.type === 'word');
      const task = vocabulary
        ? buildVocabularyTasks(contents, await owner.records.toArray(), attempts, 100000, Date.now())[0]
        : buildTextCourseTasks([lesson], attempts, Date.now())[0];
      if (!task) throw new Error('No practice is due for this material');
      const existing = (await owner.dailyTasks.toArray()).find(
        (item) =>
          item.dateKey === task.dateKey &&
          item.sourceId === task.sourceId &&
          item.stage === task.stage &&
          !item.superseded,
      );
      if (existing) return existing;
      await owner.dailyTasks.add(task);
      return task;
    },
  );
}
