import type { BookItem, CollectionItem, ContentItem, Module, TypingSession } from '@/types/content';
import type { LearningUnit, Lesson } from '@/types/learning-unit';

/** Split on sentence/paragraph boundaries; retain whitespace and every source character. */
export function splitText(text: string, maxWords = 350): string[] {
  const limit = Math.max(20, Math.min(1000, Math.floor(maxWords) || 350));
  const tokens = text.match(/\s*\S+\s*/g) ?? [text];
  const result: string[] = [];
  let chunk = '';
  let count = 0;
  for (const token of tokens) {
    chunk += token;
    count++;
    if (count >= limit || (count >= limit * 0.65 && /[.!?]["')\]]?\s*$|\n\s*\n/.test(token))) {
      result.push(chunk);
      chunk = '';
      count = 0;
    }
  }
  if (chunk) result.push(chunk);
  return result;
}

function hash(text: string): string {
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

export function unitIdForContent(content: ContentItem): string {
  return `unit:${content.category ? `category:${content.category}` : `content:${content.id}`}`;
}

function exercisesFor(content: ContentItem): ContentItem[] {
  const timestamps = content.metadata?.timestamps;
  let parts: { text: string; timestamps?: NonNullable<ContentItem['metadata']>['timestamps'] }[];
  if (timestamps?.length) {
    const groups: (typeof timestamps)[] = [];
    for (const segment of timestamps) {
      const last = groups.at(-1);
      if (!last || segment.offset - last[0].offset >= 300) groups.push([segment]);
      else last.push(segment);
    }
    parts = groups.map((group) => ({ text: group.map((s) => s.text).join(' '), timestamps: group }));
  } else {
    parts = splitText(content.text, content.metadata?.courseWordsPerLesson).map((text) => ({ text }));
  }
  return parts.map((part, i) => {
    const unchanged = parts.length === 1 && part.text === content.text;
    return {
      ...content,
      id: unchanged
        ? content.id
        : `exercise:${content.id}:${i}:${hash(part.text + JSON.stringify(part.timestamps ?? []))}`,
      title: parts.length === 1 ? content.title : `${content.title} · ${i + 1}`,
      text: part.text,
      metadata: {
        ...content.metadata,
        ...(part.timestamps ? { timestamps: part.timestamps } : {}),
        ...(!unchanged ? { lessonSourceId: content.id } : {}),
      },
    };
  });
}

export function buildLearningUnits(
  contents: ContentItem[],
  books: BookItem[] = [],
  collections: CollectionItem[] = [],
  bookNames: Record<string, string> = {},
): { units: LearningUnit[]; lessons: Lesson[] } {
  const live = contents.filter((c) => !c.deletedAt && !c.metadata?.lessonSourceId && c.text.trim());
  const memberOf = new Map<string, CollectionItem>();
  for (const collection of collections)
    for (const id of collection.itemIds) if (!memberOf.has(id)) memberOf.set(id, collection);
  const groups = new Map<string, ContentItem[]>();
  for (const content of live) {
    const collection = memberOf.get(content.id);
    const id = collection ? `unit:collection:${collection.id}` : unitIdForContent(content);
    const group = groups.get(id);
    if (group) group.push(content);
    else groups.set(id, [content]);
  }
  const units: LearningUnit[] = [];
  const lessons: Lesson[] = [];
  for (const [id, sources] of groups) {
    sources.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id, 'en', { numeric: true }));
    const first = sources[0];
    const book = books.find((b) => b.id === first.category || `book-${b.id}` === first.category);
    const collection = memberOf.get(first.id);
    const vocabulary = sources.every((c) => c.type !== 'article');
    const title =
      first.metadata?.courseTitle ||
      collection?.title ||
      book?.title ||
      (first.category ? bookNames[first.category] || first.category : first.title);
    const unitLessons: Lesson[] = [];
    const chunks: ContentItem[][] = [];
    if (vocabulary) {
      for (let i = 0; i < sources.length; i += 20) chunks.push(sources.slice(i, i + 20));
    } else {
      for (const source of sources) for (const exercise of exercisesFor(source)) chunks.push([exercise]);
    }
    for (const [index, exercises] of chunks.entries()) {
      const lessonId = `${id}:lesson:${hash(exercises.map((e) => e.id).join('|'))}`;
      const modules: Module[] = first.metadata?.audioUrl
        ? ['listen', 'read', 'speak', 'write']
        : ['read', 'listen', 'speak', 'write'];
      unitLessons.push({
        id: lessonId,
        unitId: id,
        order: index,
        title:
          first.metadata?.lessonTitles?.[lessonId] ||
          (vocabulary ? `${index + 1}. ${exercises[0].title} — ${exercises.at(-1)?.title}` : exercises[0].title),
        exercises: exercises.map((e) => ({ ...e, metadata: { ...e.metadata, lessonId } })),
        modules,
        estimatedMinutes: Math.max(
          5,
          Math.ceil(exercises.reduce((sum, e) => sum + e.text.trim().split(/\s+/).length, 0) / 40),
        ),
      });
    }
    units.push({
      id,
      title,
      sourceIds: sources.map((c) => c.id),
      lessonIds: unitLessons.map((l) => l.id),
      difficulty: first.difficulty,
      source: first.source,
      updatedAt: Math.max(...sources.map((c) => c.updatedAt)),
      kind: collection
        ? 'collection'
        : book
          ? 'book'
          : first.metadata?.audioUrl || first.metadata?.platform
            ? 'media'
            : vocabulary
              ? 'vocabulary'
              : 'article',
    });
    lessons.push(...unitLessons);
  }
  return { units, lessons };
}

export function lessonProgress(lesson: Lesson, sessions: TypingSession[]) {
  const evidence = new Set(sessions.filter((s) => s.completed).map((s) => `${s.contentId}:${s.module}`));
  const steps = lesson.modules.flatMap((module) =>
    lesson.exercises.map((item) => ({ module, item, completed: evidence.has(`${item.id}:${module}`) })),
  );
  return {
    steps,
    completed: steps.filter((s) => s.completed).length,
    total: steps.length,
    next: steps.find((s) => !s.completed),
  };
}
