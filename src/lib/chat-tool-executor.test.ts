import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeTool } from '@/lib/chat-tool-executor';
import type { ContentItem } from '@/types/content';

const todayReviewItemsMock = vi.fn();
const collectLearningSnapshotMock = vi.fn();

const sessionsStore = [
  {
    id: 'session-1',
    contentId: 'content-1',
    module: 'write' as const,
    startTime: Date.now(),
    totalWords: 42,
    wpm: 50,
    accuracy: 96,
    completed: true,
  },
];

vi.mock('@/lib/chat-analytics', () => ({
  collectLearningSnapshot: () => collectLearningSnapshotMock(),
}));

vi.mock('@/lib/today-review', () => ({
  getTodayReviewItems: () => todayReviewItemsMock(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    contents: {
      toArray: vi.fn(async () => [
        {
          id: 'content-1',
          title: 'Travel article',
          text: 'Travel text',
          type: 'article',
          tags: ['travel'],
          source: 'imported',
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    },
    sessions: {
      where: vi.fn(() => ({
        aboveOrEqual: vi.fn(() => ({
          toArray: vi.fn(async () => sessionsStore),
        })),
      })),
    },
  },
}));

function makeContext() {
  const addedContent: ContentItem[] = [];

  return {
    addedContent,
    context: {
      router: { push: vi.fn() },
      fetchImpl: vi.fn() as unknown as typeof fetch,
      addContent: vi.fn(async (item: ContentItem) => {
        addedContent.push(item);
      }),
      getContentById: vi.fn((id: string) =>
        id === 'content-1'
          ? {
              id,
              title: 'Travel article',
              text: 'Travel text',
              type: 'article' as const,
              tags: ['travel'],
              source: 'imported' as const,
              createdAt: 1,
              updatedAt: 1,
            }
          : undefined,
      ),
      searchLibrary: vi.fn(() => [
        {
          id: 'content-1',
          title: 'Travel article',
          text: 'Travel text',
          type: 'article' as const,
          tags: ['travel'],
          source: 'imported' as const,
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
      setActiveContent: vi.fn(),
      setChatMode: vi.fn(),
      setExerciseType: vi.fn(),
      speakText: vi.fn(),
      updateUserLevel: vi.fn(),
      updateProviderConfig: vi.fn(),
      buildApiHeaders: vi.fn(() => ({ 'Content-Type': 'application/json', 'x-test-key': 'abc' })),
      providerId: 'groq',
      providerConfigs: {},
      currentDifficulty: 'intermediate' as const,
    },
  };
}

describe('executeTool', () => {
  beforeEach(() => {
    collectLearningSnapshotMock.mockReset();
    todayReviewItemsMock.mockReset();
  });

  it('navigate calls router.push with the given path', async () => {
    const { context } = makeContext();
    const result = await executeTool('navigate', { path: '/settings', reason: 'Update config' }, context);

    expect(context.router.push).toHaveBeenCalledWith('/settings');
    expect(result.ok).toBe(true);
  });

  it('importYouTube calls the import endpoint and saves content', async () => {
    const { context, addedContent } = makeContext();
    context.fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        videoId: 'abc123',
        fullText: 'Transcript text',
        segmentCount: 2,
        segments: [{ text: 'Transcript text', offset: 0, duration: 1 }],
      }),
    })) as unknown as typeof fetch;

    const result = await executeTool('importYouTube', { url: 'https://www.youtube.com/watch?v=abc123' }, context);

    expect(context.fetchImpl).toHaveBeenCalledWith(
      '/api/import/youtube',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(addedContent).toHaveLength(1);
    expect(result.ok).toBe(true);
  });

  it('importYouTube returns an error result when the request fails', async () => {
    const { context } = makeContext();
    context.fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'No transcript available' }),
    })) as unknown as typeof fetch;

    const result = await executeTool('importYouTube', { url: 'https://www.youtube.com/watch?v=missing' }, context);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('No transcript available');
  });

  it('addTextContent creates and saves a content item', async () => {
    const { context, addedContent } = makeContext();

    const result = await executeTool(
      'addTextContent',
      { title: 'Weather note', text: 'The weather today is sunny.', type: 'sentence' },
      context,
    );

    expect(addedContent[0]?.title).toBe('Weather note');
    expect(result.ok).toBe(true);
  });

  it('generateContent calls the AI generation endpoint and saves the result', async () => {
    const { context, addedContent } = makeContext();
    context.fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ title: 'Weather dialogue', text: 'Generated text', type: 'article' }),
    })) as unknown as typeof fetch;

    const result = await executeTool(
      'generateContent',
      { topic: 'weather', words: ['sunny'], type: 'dialogue' },
      context,
    );

    expect(context.fetchImpl).toHaveBeenCalledWith('/api/ai/generate', expect.any(Object));
    expect(addedContent).toHaveLength(1);
    expect(result.ok).toBe(true);
  });

  it('searchLibrary returns matching library items', async () => {
    const { context } = makeContext();
    const result = await executeTool('searchLibrary', { query: 'travel' }, context);

    expect(context.searchLibrary).toHaveBeenCalledWith('travel', undefined);
    expect((result.data as { results: Array<{ id: string }> }).results[0]?.id).toBe('content-1');
  });

  it('loadContent sets the active content', async () => {
    const { context } = makeContext();
    const result = await executeTool('loadContent', { contentId: 'content-1' }, context);

    expect(context.setActiveContent).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('startExercise updates chat mode and active exercise', async () => {
    const { context } = makeContext();
    const result = await executeTool('startExercise', { type: 'quiz' }, context);

    expect(context.setChatMode).toHaveBeenCalledWith('practice');
    expect(context.setExerciseType).toHaveBeenCalledWith('quiz');
    expect(result.ok).toBe(true);
  });

  it('startPracticeSession loads content and navigates to the module', async () => {
    const { context } = makeContext();
    const result = await executeTool('startPracticeSession', { contentId: 'content-1', module: 'read' }, context);

    expect(context.setActiveContent).toHaveBeenCalled();
    expect(context.router.push).toHaveBeenCalledWith('/read');
    expect(result.ok).toBe(true);
  });

  it('speakText triggers TTS', async () => {
    const { context } = makeContext();
    const result = await executeTool('speakText', { text: 'Hello world' }, context);

    expect(context.speakText).toHaveBeenCalledWith('Hello world');
    expect(result.ok).toBe(true);
  });

  it('showAnalytics returns the learning snapshot', async () => {
    const { context } = makeContext();
    collectLearningSnapshotMock.mockResolvedValue({ overview: { totalSessions: 10 } });

    const result = await executeTool('showAnalytics', {}, context);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ overview: { totalSessions: 10 } });
  });

  it('showTodaySessions returns today sessions', async () => {
    const { context } = makeContext();
    const result = await executeTool('showTodaySessions', {}, context);

    expect(result.ok).toBe(true);
    expect((result.data as { sessions: Array<{ id: string }> }).sessions).toHaveLength(1);
  });

  it('showTodayStats aggregates today stats', async () => {
    const { context } = makeContext();
    const result = await executeTool('showTodayStats', {}, context);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ sessions: 1, words: 42, avgAccuracy: 96 });
  });

  it('showDueReviews returns due items', async () => {
    const { context } = makeContext();
    todayReviewItemsMock.mockResolvedValue([
      { id: 'review-1', title: 'Review item', subtitle: 'Write review', href: '/review/today' },
    ]);

    const result = await executeTool('showDueReviews', {}, context);

    expect(result.ok).toBe(true);
    expect((result.data as { items: Array<{ id: string }> }).items[0]?.id).toBe('review-1');
  });

  it('updateUserLevel forwards the new level', async () => {
    const { context } = makeContext();
    const result = await executeTool('updateUserLevel', { level: 'B2' }, context);

    expect(context.updateUserLevel).toHaveBeenCalledWith('B2');
    expect(result.ok).toBe(true);
  });

  it('updateProviderConfig forwards provider settings', async () => {
    const { context } = makeContext();
    const result = await executeTool(
      'updateProviderConfig',
      { providerId: 'openai', apiKey: 'sk-test', model: 'gpt-4o', baseUrl: 'https://api.openai.com' },
      context,
    );

    expect(context.updateProviderConfig).toHaveBeenCalledWith({
      providerId: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com',
    });
    expect(result.ok).toBe(true);
  });

  it('returns an error for unknown tools', async () => {
    const { context } = makeContext();
    const result = await executeTool('not-real', {}, context);

    expect(result.ok).toBe(false);
  });
});
