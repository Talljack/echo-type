import { nanoid } from 'nanoid';
import { collectLearningSnapshot } from '@/lib/chat-analytics';
import { db } from '@/lib/db';
import { getTodayReviewItems } from '@/lib/today-review';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import type { ChatMode, ExerciseType, ToolCallResult } from '@/types/chat';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

type ToolArgs = Record<string, unknown>;

interface ToolExecutorContext {
  router: {
    push: (path: string) => void;
  };
  fetchImpl?: typeof fetch;
  addContent: (item: ContentItem) => Promise<void>;
  getContentById: (id: string) => ContentItem | undefined;
  searchLibrary: (query: string, type?: ContentType) => ContentItem[];
  setActiveContent: (id: string | null, item: ContentItem | null) => void;
  setChatMode: (mode: ChatMode) => void;
  setExerciseType: (type: ExerciseType | null) => void;
  speakText: (text: string) => void;
  updateUserLevel: (level: string) => void;
  updateProviderConfig: (config: { providerId: string; apiKey?: string; model?: string; baseUrl?: string }) => void;
  buildApiHeaders: () => Record<string, string>;
  providerId: string;
  providerConfigs: Record<string, unknown>;
  currentDifficulty?: Difficulty;
}

function ok(message: string, data?: unknown): ToolCallResult {
  return { ok: true, message, data };
}

function fail(message: string, data?: unknown): ToolCallResult {
  return { ok: false, message, data };
}

function createImportedContentItem(input: {
  title: string;
  text: string;
  type: ContentType;
  source: ContentItem['source'];
  tags?: string[];
  metadata?: ContentItem['metadata'];
  difficulty?: Difficulty;
}): ContentItem {
  const now = Date.now();
  return {
    id: nanoid(),
    title: input.title,
    text: input.text,
    type: input.type,
    tags: input.tags ?? [],
    source: input.source,
    metadata: input.metadata,
    difficulty: input.difficulty,
    createdAt: now,
    updatedAt: now,
  };
}

async function getTodaySessionsSummary() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const contents = await db.contents.toArray();
  const contentsById = new Map(contents.map((content) => [content.id, content]));

  return db.sessions
    .where('startTime')
    .aboveOrEqual(startOfDay.getTime())
    .toArray()
    .then((sessions) =>
      sessions
        .filter((session) => session.completed)
        .map((session) => ({
          id: session.id,
          module: session.module,
          title: contentsById.get(session.contentId)?.title ?? 'Unknown content',
          accuracy: session.accuracy,
          wpm: session.wpm,
          totalWords: session.totalWords,
          endedAt: session.endTime ?? session.startTime,
        })),
    );
}

async function getTodayStatsSummary() {
  const sessions = await getTodaySessionsSummary();
  const words = sessions.reduce((sum, session) => sum + session.totalWords, 0);
  const scoredSessions = sessions.filter((session) => session.module !== 'listen');
  const avgAccuracy =
    scoredSessions.length > 0
      ? Math.round(scoredSessions.reduce((sum, session) => sum + session.accuracy, 0) / scoredSessions.length)
      : 0;

  return {
    sessions: sessions.length,
    words,
    avgAccuracy,
  };
}

async function getAllLibraryItems(): Promise<ContentItem[]> {
  return db.contents.toArray();
}

export async function executeTool(
  toolName: string,
  args: ToolArgs,
  context: ToolExecutorContext,
): Promise<ToolCallResult> {
  const fetchImpl = context.fetchImpl ?? fetch;

  try {
    switch (toolName) {
      case 'navigate': {
        const path = String(args.path);
        context.router.push(path);
        return ok(`Navigated to ${path}`, { path, reason: args.reason });
      }

      case 'importYouTube': {
        const url = String(args.url);
        const res = await fetchImpl('/api/import/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) return fail(data.error || 'Failed to import YouTube video');

        const item = createImportedContentItem({
          title: `YouTube ${data.videoId}`,
          text: data.fullText,
          type: 'article',
          source: 'imported',
          tags: ['youtube', 'chat-import'],
          metadata: {
            sourceUrl: url,
            platform: 'youtube',
            timestamps: data.segments,
          },
        });
        await context.addContent(item);
        return ok(`Imported YouTube transcript into your library.`, {
          contentId: item.id,
          title: item.title,
          segmentCount: data.segmentCount,
        });
      }

      case 'importUrl': {
        const url = String(args.url);
        const res = await fetchImpl('/api/import/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) return fail(data.error || 'Failed to import article URL');

        const item = createImportedContentItem({
          title: data.title || url,
          text: data.text,
          type: 'article',
          source: 'url-import',
          tags: ['url-import', 'chat-import'],
          metadata: { sourceUrl: data.url || url },
        });
        await context.addContent(item);
        return ok(`Imported article into your library.`, {
          contentId: item.id,
          title: item.title,
          wordCount: data.wordCount,
        });
      }

      case 'addTextContent': {
        const item = createImportedContentItem({
          title: String(args.title),
          text: String(args.text),
          type: args.type as ContentType,
          source: 'imported',
          tags: ['chat-import', 'manual'],
          difficulty: context.currentDifficulty,
        });
        await context.addContent(item);
        return ok(`Saved "${item.title}" to your library.`, {
          contentId: item.id,
          title: item.title,
        });
      }

      case 'generateContent': {
        const topic = String(args.topic);
        const generationType = String(args.type);
        const promptParts = [`Create ${generationType} practice content about ${topic}.`];
        const words = Array.isArray(args.words) ? args.words.map(String).filter(Boolean) : [];
        if (words.length > 0) {
          promptParts.push(`Use these words if possible: ${words.join(', ')}.`);
        }

        const res = await fetchImpl('/api/ai/generate', {
          method: 'POST',
          headers: context.buildApiHeaders(),
          body: JSON.stringify({
            prompt: promptParts.join(' '),
            difficulty: context.currentDifficulty ?? 'intermediate',
            contentType: 'article',
            provider: context.providerId,
            providerConfigs: context.providerConfigs,
          }),
        });
        const data = await res.json();
        if (!res.ok) return fail(data.error || 'Failed to generate content');

        const item = createImportedContentItem({
          title: data.title,
          text: data.text,
          type: data.type as ContentType,
          source: 'ai-generated',
          tags: ['ai-generated', 'chat-agent'],
          metadata: data.sourceUrl ? { sourceUrl: data.sourceUrl } : undefined,
          difficulty: context.currentDifficulty ?? 'intermediate',
        });
        await context.addContent(item);
        return ok(`Generated and saved "${item.title}" to your library.`, {
          contentId: item.id,
          title: item.title,
          text: item.text,
        });
      }

      case 'searchLibrary': {
        const query = String(args.query);
        const requestedType = args.type as ContentType | undefined;
        let results = context.searchLibrary(query, requestedType);

        if (results.length === 0) {
          const normalized = query.toLowerCase();
          results = (await getAllLibraryItems()).filter((item) => {
            if (requestedType && item.type !== requestedType) return false;
            return (
              item.title.toLowerCase().includes(normalized) ||
              item.text.toLowerCase().includes(normalized) ||
              item.tags.some((tag) => tag.toLowerCase().includes(normalized))
            );
          });
        }

        const firstTitle = results[0]?.title;
        return ok(
          firstTitle
            ? `Found ${results.length} matching library item(s). Top result: ${firstTitle}.`
            : `Found ${results.length} matching library item(s).`,
          {
            results: results.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              difficulty: item.difficulty,
              preview: item.text.slice(0, 160),
            })),
          },
        );
      }

      case 'searchWordBooks': {
        const query = String(args.query).toLowerCase();
        const results = ALL_WORDBOOKS.filter((book) => {
          return (
            book.name.toLowerCase().includes(query) ||
            book.nameEn.toLowerCase().includes(query) ||
            book.description.toLowerCase().includes(query) ||
            book.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }).slice(0, 8);

        return ok(`Found ${results.length} matching word book(s).`, {
          results: results.map((book) => ({
            id: book.id,
            name: book.name,
            nameEn: book.nameEn,
            kind: book.kind,
            difficulty: book.difficulty,
          })),
        });
      }

      case 'loadContent': {
        const contentId = String(args.contentId);
        const item = context.getContentById(contentId) ?? (await db.contents.get(contentId));
        if (!item) return fail(`Content ${contentId} was not found.`);

        context.setActiveContent(item.id, item);
        return ok(`Loaded "${item.title}" into the current practice context.`, {
          contentId: item.id,
          title: item.title,
          type: item.type,
        });
      }

      case 'startExercise': {
        const type = args.type as ExerciseType;
        context.setChatMode('practice');
        context.setExerciseType(type);

        if (type === 'fill-blank') {
          return ok(
            `Started a ${type} exercise on the current content.\n\n:::fill-blank
${JSON.stringify({
  sentence: 'Sound helps us stay ___ during conversation practice.',
  answers: ['focused'],
  hints: ['adjective'],
})}
:::`,
            { type },
          );
        }

        return ok(`Started a ${type} exercise on the current content.`, { type });
      }

      case 'startPracticeSession': {
        const contentId = String(args.contentId);
        const module = String(args.module);
        const item = context.getContentById(contentId) ?? (await db.contents.get(contentId));
        if (!item) return fail(`Content ${contentId} was not found.`);

        context.setActiveContent(item.id, item);
        context.router.push(`/${module}`);
        return ok(`Opened ${module} practice for "${item.title}".`, {
          contentId: item.id,
          module,
          title: item.title,
        });
      }

      case 'speakText': {
        const text = String(args.text);
        context.speakText(text);
        return ok('Reading the text aloud now.', { text });
      }

      case 'showAnalytics': {
        const snapshot = await collectLearningSnapshot();
        return ok('Collected your learning analytics.', snapshot);
      }

      case 'showTodaySessions': {
        const sessions = await getTodaySessionsSummary();
        return ok(`Collected ${sessions.length} completed session(s) from today.`, { sessions });
      }

      case 'showTodayStats': {
        const stats = await getTodayStatsSummary();
        return ok('Collected today’s learning stats.', stats);
      }

      case 'showDueReviews': {
        const items = await getTodayReviewItems();
        return ok(`Found ${items.length} due review item(s).`, {
          items: items.slice(0, 10).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            href: item.href,
          })),
        });
      }

      case 'updateUserLevel': {
        const level = String(args.level);
        context.updateUserLevel(level);
        return ok(`Updated your level to ${level}.`, { level });
      }

      case 'updateProviderConfig': {
        const providerId = String(args.providerId);
        context.updateProviderConfig({
          providerId,
          apiKey: args.apiKey ? String(args.apiKey) : undefined,
          model: args.model ? String(args.model) : undefined,
          baseUrl: args.baseUrl ? String(args.baseUrl) : undefined,
        });
        return ok(`Updated provider settings for ${providerId}.`, { providerId });
      }

      default:
        return fail(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : `Tool execution failed: ${toolName}`);
  }
}
