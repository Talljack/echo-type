import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai';
import { NextRequest } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { createChatTools } from '@/lib/chat-tools';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';
import type { ChatContext, ChatUIMessage } from '@/types/chat';
import type { ContentType } from '@/types/content';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are a friendly and patient English tutor. Your role is to:
- Help students improve their English skills
- Correct grammar mistakes gently and explain why
- Suggest better word choices and expressions
- Answer questions about English grammar, vocabulary, and pronunciation
- Keep responses concise and focused on learning
- Encourage the student and celebrate their progress

CRITICAL LANGUAGE RULES:
- You MUST ONLY use English and Simplified Chinese (简体中文) in your responses. NEVER use any other languages (no Japanese, Korean, Thai, Arabic, etc.)
- Use English as the primary language. Use Chinese only when explaining complex grammar concepts or translating for the student.
- Always spell English words correctly (e.g., "grammar" not "grammer", "vocabulary" not "vocablure", "pronunciation" not "pronounciation")
- When the student writes in Chinese, respond in English first, then add a Chinese translation if helpful.`;

const TOOL_USAGE_PROMPT = `

You can take actions inside EchoType by calling tools.
Use tools instead of merely describing steps whenever the user asks for an action.

Action rules:
- Navigation requests -> use navigate
- YouTube URLs -> use importYouTube
- Normal article/web URLs -> use importUrl
- User asks to save pasted text -> use addTextContent
- User asks for generated learning material -> use generateContent
- User asks to search saved content -> use searchLibrary
- User asks to search built-in word books -> use searchWordBooks
- User asks to load or practice a specific item -> use loadContent or startPracticeSession
- User asks for exercises -> use startExercise
- User asks for analytics or progress -> use showAnalytics, showTodaySessions, showTodayStats, or showDueReviews
- User asks to read something aloud -> use speakText
- User asks to update level/settings/provider config -> use updateUserLevel or updateProviderConfig

Do not ask the user to click toolbar buttons for these actions. Perform the action with tools.
When the user pastes a YouTube link or article URL, proactively import it.
After each successful tool call, briefly confirm the result and tell the user what happened next.`;

const MODE_PROMPTS: Record<string, string> = {
  practice: `

You are now in PRACTICE mode. Generate interactive exercises using special block syntax.
Use triple-colon fenced blocks (:::type) for interactive content. Available blocks:

:::quiz
{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}
:::

:::fill-blank
{"sentence": "She ___ to school.", "answers": ["goes"], "hints": ["present tense"]}
:::

:::translation
{"source": "Hello", "sourceLang": "English", "target": "你好", "targetLang": "Chinese"}
:::

:::audio
{"text": "Text to read aloud", "label": "Listen carefully"}
:::

:::vocab
{"word": "elaborate", "phonetic": "/ɪˈlæb.ər.ət/", "partOfSpeech": "adjective", "definition": "detailed and complex", "example": "She gave an elaborate explanation."}
:::

Generate exercises based on the provided content. Mix question types for variety.
After the student answers, provide encouraging feedback and explanation.`,

  reading: `

You are now in READING mode. Guide the student through reading English text.
Use the reading block to present segmented text:

:::reading
{"title": "Title", "segments": [{"id": "s1", "text": "Paragraph text...", "translation": "中文翻译..."}]}
:::

Break longer texts into 2-4 segments. After each reading block:
1. Ask a comprehension question using :::quiz
2. Highlight key vocabulary using :::vocab
3. Help with pronunciation using :::audio`,

  analytics: `

You are now in ANALYTICS mode. Analyze the student's learning data provided in context.
Present key statistics using:

:::analytics
{"stats": [{"label": "Stat Name", "value": "Value", "change": "+5%"}]}
:::

Provide specific, actionable insights:
1. Summarize overall progress with numbers
2. Identify strengths and weaknesses by module
3. Suggest specific exercises for weak areas
4. Note any patterns (consistency, improving/declining trends)`,

  search: `

You are now in SEARCH mode. Help the student find and recommend learning resources.
When suggesting resources, use:

:::resource
{"title": "Resource Name", "description": "Brief description", "difficulty": "intermediate", "resourceType": "article"}
:::

Recommend content appropriate to the student's level.`,
};

type LegacyChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function extractTextFromUIMessage(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is Extract<ChatUIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function normalizeMessages(messages: Array<ChatUIMessage | LegacyChatMessage>): ChatUIMessage[] {
  return messages.map((message) => {
    if ('parts' in message) {
      return message;
    }

    return {
      id: crypto.randomUUID(),
      role: message.role,
      parts: [{ type: 'text', text: message.content }],
    };
  });
}

function getLastUserText(messages: ChatUIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;
    const text = extractTextFromUIMessage(message);
    if (text) return text;
  }
  return '';
}

function getLatestToolOutput(messages: ChatUIMessage[]) {
  const message = messages.at(-1);
  if (!message || message.role !== 'assistant') {
    return null;
  }

  for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
    const part = message.parts[partIndex];
    if (!part.type.startsWith('tool-')) continue;
    if (!('state' in part) || part.state !== 'output-available') continue;
    return {
      toolName: part.type.slice(5),
      output: 'output' in part ? part.output : undefined,
    };
  }

  return null;
}

function buildMockToolCallResponse(
  uiMessages: ChatUIMessage[],
  toolName: string,
  input: Record<string, unknown>,
  text: string,
) {
  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'start-step' });
      writer.write({ type: 'tool-input-available', toolCallId: `${toolName}-call-1`, toolName, input });
      writer.write({ type: 'finish-step' });
      writer.write({ type: 'finish', finishReason: 'tool-calls', messageMetadata: { mockText: text } });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'x-provider-id': 'mock-agent',
      'x-provider-source': 'e2e',
      'x-provider-fallback': 'false',
    },
  });
}

function buildMockTextResponse(uiMessages: ChatUIMessage[], text: string) {
  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'start-step' });
      writer.write({ type: 'text-start', id: 'mock-text' });
      writer.write({ type: 'text-delta', id: 'mock-text', delta: text });
      writer.write({ type: 'text-end', id: 'mock-text' });
      writer.write({ type: 'finish-step' });
      writer.write({ type: 'finish', finishReason: 'stop' });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'x-provider-id': 'mock-agent',
      'x-provider-source': 'e2e',
      'x-provider-fallback': 'false',
    },
  });
}

function getMockToolData<T>(toolOutput: { output: unknown } | null): T | null {
  if (!toolOutput?.output || typeof toolOutput.output !== 'object' || !('data' in toolOutput.output)) {
    return null;
  }

  return (toolOutput.output as { data?: T }).data ?? null;
}

function buildMockAnalyticsText(stats: Array<{ label: string; value: string | number; icon?: string }>) {
  return `Here is your learning snapshot.\n\n:::analytics
${JSON.stringify({ stats })}
:::`;
}

function buildMockFillBlankText() {
  return `I started a fill-blank exercise for you.\n\n:::fill-blank
${JSON.stringify({
  sentence: 'Sound helps us stay ___ during conversation practice.',
  answers: ['focused'],
  hints: ['adjective'],
})}
:::`;
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

function maybeHandleMockChat(
  uiMessages: ChatUIMessage[],
  mockMode: string | null,
  context?: ChatContext & {
    module?: string;
    contentTitle?: string;
    contentText?: string;
    contentType?: ContentType;
    chatMode?: string;
    exerciseType?: string;
    analyticsData?: Record<string, unknown>;
  },
) {
  if (!mockMode) return null;

  const lastMessage = uiMessages.at(-1);
  const toolOutput = lastMessage?.role === 'assistant' ? getLatestToolOutput(uiMessages) : null;
  if (toolOutput) {
    switch (toolOutput.toolName) {
      case 'navigate':
        return buildMockTextResponse(
          uiMessages,
          `Done. I navigated to ${(toolOutput.output as { data?: { path?: string } })?.data?.path ?? 'the requested page'}.`,
        );
      case 'importYouTube':
        return buildMockTextResponse(uiMessages, 'Done. I imported the YouTube transcript into your library.');
      case 'importUrl':
        return buildMockTextResponse(uiMessages, 'Done. I imported the article into your library.');
      case 'addTextContent':
        return buildMockTextResponse(uiMessages, 'Done. I saved that text to your library.');
      case 'generateContent':
        return buildMockTextResponse(uiMessages, 'Done. I generated new content and saved it to your library.');
      case 'searchLibrary': {
        const results = (toolOutput.output as { data?: { results?: Array<{ title: string }> } })?.data?.results ?? [];
        const firstTitle = results[0]?.title ?? 'nothing relevant';
        return buildMockTextResponse(uiMessages, `I searched your library. The top result is ${firstTitle}.`);
      }
      case 'searchWordBooks': {
        const results = getMockToolData<Array<{ name: string; nameEn: string }>>(toolOutput) ?? [];
        if (results.length === 0) {
          return buildMockTextResponse(uiMessages, 'I could not find a matching word book right now.');
        }

        return buildMockTextResponse(
          uiMessages,
          `I found ${results.length} matching word books:\n${formatList(results.slice(0, 3).map((book) => `${book.name} (${book.nameEn})`))}`,
        );
      }
      case 'loadContent': {
        const data = getMockToolData<{ title?: string }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          `Loaded "${data?.title ?? 'the selected content'}" into the current practice context.`,
        );
      }
      case 'startExercise':
        return buildMockTextResponse(uiMessages, buildMockFillBlankText());
      case 'startPracticeSession': {
        const data = getMockToolData<{ module?: string; title?: string }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          `Opened ${data?.module ?? 'the requested'} practice for "${data?.title ?? 'the selected content'}".`,
        );
      }
      case 'showAnalytics': {
        const data = getMockToolData<{
          overview?: { totalSessions?: number; totalWords?: number; avgAccuracy?: number };
        }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          buildMockAnalyticsText([
            { label: 'Sessions', value: data?.overview?.totalSessions ?? 0, icon: 'sessions' },
            { label: 'Words', value: data?.overview?.totalWords ?? 0, icon: 'content' },
            { label: 'Accuracy', value: `${data?.overview?.avgAccuracy ?? 0}%`, icon: 'accuracy' },
            { label: 'Focus', value: 'Keep going', icon: 'progress' },
          ]),
        );
      }
      case 'showTodaySessions': {
        const sessions = getMockToolData<Array<{ title: string; module: string }>>(toolOutput) ?? [];
        if (sessions.length === 0) {
          return buildMockTextResponse(uiMessages, 'You have not completed any sessions today yet.');
        }

        return buildMockTextResponse(
          uiMessages,
          `Here is what you practiced today:\n${formatList(sessions.map((session) => `${session.title} (${session.module})`))}`,
        );
      }
      case 'showTodayStats': {
        const data = getMockToolData<{ sessions?: number; words?: number; avgAccuracy?: number }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          buildMockAnalyticsText([
            { label: 'Today Sessions', value: data?.sessions ?? 0, icon: 'sessions' },
            { label: 'Words', value: data?.words ?? 0, icon: 'content' },
            { label: 'Accuracy', value: `${data?.avgAccuracy ?? 0}%`, icon: 'accuracy' },
            { label: 'Trend', value: 'Steady', icon: 'progress' },
          ]),
        );
      }
      case 'showDueReviews': {
        const items = getMockToolData<Array<{ title: string; subtitle: string }>>(toolOutput) ?? [];
        if (items.length === 0) {
          return buildMockTextResponse(uiMessages, 'Nothing is due for review today.');
        }

        return buildMockTextResponse(
          uiMessages,
          `These items need review today:\n${formatList(items.map((item) => `${item.title} — ${item.subtitle}`))}`,
        );
      }
      case 'updateUserLevel': {
        const data = getMockToolData<{ level?: string }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          `Done. I updated your level to ${data?.level ?? 'the requested level'}.`,
        );
      }
      case 'updateProviderConfig': {
        const data = getMockToolData<{ providerId?: string }>(toolOutput);
        return buildMockTextResponse(
          uiMessages,
          `Done. I updated the provider settings for ${data?.providerId ?? 'the selected provider'}.`,
        );
      }
      case 'speakText':
        return buildMockTextResponse(uiMessages, 'Done. I am reading that text aloud now.');
      default:
        return buildMockTextResponse(uiMessages, 'Done. The requested action has been completed.');
    }
  }

  const lastUserText = getLastUserText(uiMessages);
  const contextTitle = context?.contentTitle ?? '';
  const youTubeUrl = lastUserText.match(/https?:\/\/\S*youtube\.com\/watch\?v=\S+/)?.[0];
  const articleUrl = lastUserText.match(/https?:\/\/example\.com\S*/)?.[0];
  const addTextMatch = lastUserText.match(/加入学习库[:：]\s*(.+)$/);
  const levelMatch = lastUserText.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  const speakMatch = lastUserText.match(/(?:帮我读一下|read (?:this|aloud)[:：]?)\s*(.+)$/i);

  if (/设置页面|go to settings/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'navigate',
      { path: '/settings', reason: 'Open settings page' },
      lastUserText,
    );
  }

  if (/go to library/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'navigate',
      { path: '/library', reason: 'Open library page' },
      lastUserText,
    );
  }

  if (/听力练习|go to listen/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'navigate',
      { path: '/listen', reason: 'Open listen page' },
      lastUserText,
    );
  }

  if (youTubeUrl) {
    return buildMockToolCallResponse(uiMessages, 'importYouTube', { url: youTubeUrl }, lastUserText);
  }

  if (articleUrl) {
    return buildMockToolCallResponse(uiMessages, 'importUrl', { url: articleUrl }, lastUserText);
  }

  if (addTextMatch) {
    return buildMockToolCallResponse(
      uiMessages,
      'addTextContent',
      {
        title: 'Chat Imported Text',
        text: addTextMatch[1],
        type: 'sentence',
      },
      lastUserText,
    );
  }

  if (/生成.*天气|weather/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'generateContent',
      { topic: 'weather', words: ['sunny', 'forecast'], type: 'dialogue' },
      lastUserText,
    );
  }

  if (/travel/i.test(lastUserText) && /搜|search/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'searchLibrary', { query: 'travel', type: 'article' }, lastUserText);
  }

  if (/商务英语|wordbook/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'searchWordBooks', { query: 'business' }, lastUserText);
  }

  if (/加载|load/i.test(lastUserText) && /sound/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'loadContent', { contentId: 'seed-sound-word' }, lastUserText);
  }

  if (/填空题|fill-blank|fill blank/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'startExercise', { type: 'fill-blank' }, lastUserText);
  }

  if (/练听力|listen/i.test(lastUserText) && (/travel article/i.test(lastUserText) || /这篇文章/.test(lastUserText))) {
    const contentId = contextTitle.includes('Travel article') ? 'seed-travel-article' : 'seed-travel-article';
    return buildMockToolCallResponse(uiMessages, 'startPracticeSession', { contentId, module: 'listen' }, lastUserText);
  }

  if (/学习进度|learning progress/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'showAnalytics', {}, lastUserText);
  }

  if (/今天练习了什么|what did i practice today/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'showTodaySessions', {}, lastUserText);
  }

  if (/今天的练习情况|today.*stats|统计一下今天/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'showTodayStats', {}, lastUserText);
  }

  if (/今天有什么需要复习的|due review|需要复习/i.test(lastUserText)) {
    return buildMockToolCallResponse(uiMessages, 'showDueReviews', {}, lastUserText);
  }

  if (levelMatch && /英语水平|level/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'updateUserLevel',
      { level: levelMatch[1].toUpperCase() },
      lastUserText,
    );
  }

  if (/openai/i.test(lastUserText) && /gpt-4o/i.test(lastUserText)) {
    return buildMockToolCallResponse(
      uiMessages,
      'updateProviderConfig',
      { providerId: 'openai', model: 'gpt-4o' },
      lastUserText,
    );
  }

  if (speakMatch) {
    return buildMockToolCallResponse(uiMessages, 'speakText', { text: speakMatch[1] }, lastUserText);
  }

  return buildMockTextResponse(uiMessages, `I heard you: ${lastUserText || 'Hello'}`);
}

export async function POST(req: NextRequest) {
  const {
    messages,
    provider = 'groq',
    context,
    userLevel,
    providerConfigs = {},
  }: {
    messages: Array<ChatUIMessage | LegacyChatMessage>;
    provider?: ProviderId;
    context?: ChatContext & {
      module?: string;
      contentTitle?: string;
      contentText?: string;
      contentType?: ContentType;
      chatMode?: string;
      exerciseType?: string;
      analyticsData?: Record<string, unknown>;
    };
    userLevel?: string;
    providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
  } = await req.json();

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Messages are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const providerId = provider as ProviderId;
  if (!PROVIDER_REGISTRY[providerId]) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const uiMessages = normalizeMessages(messages);
  const mockResponse = maybeHandleMockChat(uiMessages, req.headers.get('x-echotype-e2e-chat-mock'), context);
  if (mockResponse) {
    return mockResponse;
  }

  let resolution;
  try {
    resolution = resolveProviderForCapability({
      capability: 'chat',
      requestedProviderId: providerId,
      availableProviderConfigs: providerConfigs,
      headers: req.headers,
    });
  } catch (error) {
    if (error instanceof ProviderResolutionError) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw error;
  }

  const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${PROVIDER_REGISTRY[resolution.providerId].name}. Add your key in Settings.`,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const rateLimit = await enforcePlatformRateLimit({
    headers: req.headers,
    capability: 'chat',
    resolution,
  });
  if (!rateLimit.ok) {
    return new Response(JSON.stringify({ error: rateLimit.message, code: 'platform_rate_limited' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
    });
  }

  // ─── Build system prompt ──────────────────────────────────────────────

  let systemPrompt = BASE_SYSTEM_PROMPT;
  systemPrompt += TOOL_USAGE_PROMPT;

  // Mode-specific prompt section
  const chatMode = context?.chatMode || 'general';
  if (chatMode !== 'general' && MODE_PROMPTS[chatMode]) {
    systemPrompt += MODE_PROMPTS[chatMode];
  }

  // Content context
  let contextNote = '';
  if (context?.module && context.module !== 'general') {
    contextNote = `\n\nThe student is currently in the "${context.module}" module`;
    if (context.contentTitle) {
      contextNote += `, practicing: "${context.contentTitle}"`;
    }
    contextNote += '. Tailor your responses to help with their current practice.';
  }

  if (context?.contentText) {
    contextNote += `\n\nContent text for practice:\n"${context.contentText}"`;
    if (context.contentType) {
      contextNote += `\nContent type: ${context.contentType}`;
    }
  }

  if (context?.exerciseType) {
    contextNote += `\nExercise type requested: ${context.exerciseType}`;
  }

  if (context?.exercisePrompt) {
    contextNote += `\n\nDetailed exercise instructions for the AI (follow these carefully):\n${context.exercisePrompt}`;
  }

  if (context?.analyticsData) {
    contextNote += `\n\nStudent learning data:\n${JSON.stringify(context.analyticsData)}`;
  }

  if (userLevel) {
    contextNote += `\nThe user's English proficiency is ${userLevel} (CEFR). Adjust vocabulary complexity, sentence structure, and explanations to match this level.`;
  }

  systemPrompt += contextNote;

  const tools = createChatTools();
  const modelMessages = await convertToModelMessages(uiMessages, { tools });

  const model = resolveModel({
    providerId: resolution.providerId,
    modelId: resolution.modelId,
    apiKey,
    baseUrl: resolution.baseUrl,
    apiPath: resolution.apiPath,
  });

  const responseHeaders = {
    'x-provider-id': resolution.providerId,
    'x-provider-source': resolution.credentialSource,
    'x-provider-fallback': String(resolution.fallbackApplied),
    ...(resolution.fallbackReason ? { 'x-provider-fallback-reason': resolution.fallbackReason } : {}),
  };

  // Stream with tool-call error recovery: if tools fail, fall back to text-only.
  // The error from providers like Groq arrives as a stream event (type: 'error')
  // before any content, so we buffer early events and check for errors first.
  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(3),
      });

      const uiStream = result.toUIMessageStream();
      const reader = uiStream.getReader();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const earlyBuffer: any[] = [];
      let hitError = false;

      // Read early events and check for error before any content arrives
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        if ('type' in value && value.type === 'error') {
          hitError = true;
          // Drain remaining events from the failed stream
          for (;;) {
            const rest = await reader.read();
            if (rest.done) break;
          }
          break;
        }

        // Buffer start/step-start events (they arrive before content)
        if ('type' in value && (value.type === 'start' || value.type === 'start-step')) {
          earlyBuffer.push(value);
          continue;
        }

        // First content event — stream is healthy; flush buffer and forward
        for (const buffered of earlyBuffer) writer.write(buffered);
        writer.write(value);
        // Forward remaining events directly
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          writer.write(next.value);
        }
        return;
      }

      if (hitError) {
        // Tool calling failed — retry without tools for a text-only response
        const noToolMessages = await convertToModelMessages(uiMessages);
        const fallback = streamText({ model, system: systemPrompt, messages: noToolMessages });
        writer.merge(fallback.toUIMessageStream());
      }
    },
  });

  return createUIMessageStreamResponse({ stream, headers: responseHeaders });
}
