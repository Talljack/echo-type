import { describe, expect, it } from 'vitest';
import { CHAT_TOOL_INPUT_SCHEMAS, CHAT_TOOL_NAMES, createChatTools } from '@/lib/chat-tools';

describe('chat API tool schemas', () => {
  it('all 17 tools are defined', () => {
    const tools = createChatTools();

    expect(Object.keys(tools)).toHaveLength(17);
    expect(Object.keys(tools)).toEqual(CHAT_TOOL_NAMES);
  });

  it('navigate validates supported app paths', () => {
    expect(CHAT_TOOL_INPUT_SCHEMAS.navigate.safeParse({ path: '/settings', reason: 'Open settings' }).success).toBe(true);
    expect(CHAT_TOOL_INPUT_SCHEMAS.navigate.safeParse({ path: '/nope', reason: 'Bad route' }).success).toBe(false);
  });

  it('importYouTube validates url format', () => {
    expect(CHAT_TOOL_INPUT_SCHEMAS.importYouTube.safeParse({ url: 'https://www.youtube.com/watch?v=abc123' }).success).toBe(
      true,
    );
    expect(CHAT_TOOL_INPUT_SCHEMAS.importYouTube.safeParse({ url: 'not-a-url' }).success).toBe(false);
  });

  it('updateProviderConfig validates provider ids', () => {
    expect(
      CHAT_TOOL_INPUT_SCHEMAS.updateProviderConfig.safeParse({ providerId: 'openai', model: 'gpt-4o' }).success,
    ).toBe(true);
    expect(
      CHAT_TOOL_INPUT_SCHEMAS.updateProviderConfig.safeParse({ providerId: 'unknown-provider' }).success,
    ).toBe(false);
  });

  it('tools with no params accept empty objects', () => {
    expect(CHAT_TOOL_INPUT_SCHEMAS.showAnalytics.safeParse({}).success).toBe(true);
    expect(CHAT_TOOL_INPUT_SCHEMAS.showTodaySessions.safeParse({}).success).toBe(true);
    expect(CHAT_TOOL_INPUT_SCHEMAS.showTodayStats.safeParse({}).success).toBe(true);
    expect(CHAT_TOOL_INPUT_SCHEMAS.showDueReviews.safeParse({}).success).toBe(true);
  });
});
