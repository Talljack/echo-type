import { db } from './db';
import { buildLearningUnits } from './learning-units';
import { ALL_WORDBOOKS } from './wordbooks';

/** Rebuild derived indexes atomically. Stable IDs preserve evidence across devices. */
export async function reconcileLearningUnits() {
  const database = db;
  return database.transaction(
    'rw',
    [database.contents, database.books, database.collections, database.learningUnits, database.lessons],
    async () => {
      const [contents, books, collections, oldUnits, oldLessons] = await Promise.all([
        database.contents.toArray(),
        database.books.toArray(),
        database.collections.toArray(),
        database.learningUnits.toArray(),
        database.lessons.toArray(),
      ]);
      const result = buildLearningUnits(
        contents,
        books,
        collections,
        Object.fromEntries(ALL_WORDBOOKS.map((b) => [b.id, b.nameEn])),
      );
      const unitsById = new Map(oldUnits.map((unit) => [unit.id, unit]));
      const lessonsById = new Map(oldLessons.map((lesson) => [lesson.id, lesson]));
      const changedUnits = result.units.filter(
        (unit) => JSON.stringify(unitsById.get(unit.id)) !== JSON.stringify(unit),
      );
      const changedLessons = result.lessons.filter(
        (lesson) => JSON.stringify(lessonsById.get(lesson.id)) !== JSON.stringify(lesson),
      );
      if (changedUnits.length) await database.learningUnits.bulkPut(changedUnits);
      if (changedLessons.length) await database.lessons.bulkPut(changedLessons);
      const unitIds = new Set(result.units.map((u) => u.id));
      const lessonIds = new Set(result.lessons.map((l) => l.id));
      // Only disposable derived indexes are pruned; originals, practice and history remain.
      await database.learningUnits.bulkDelete(oldUnits.filter((u) => !unitIds.has(u.id)).map((u) => u.id));
      await database.lessons.bulkDelete(oldLessons.filter((l) => !lessonIds.has(l.id)).map((l) => l.id));
      return result;
    },
  );
}
