import { translateText } from '@/services/translation-api';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Content } from '@/types/content';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Mirrors the mobile tool definitions sent to `/api/chat` (server uses `toolSuite: 'mobile'`). */
export const MOBILE_TOOLS = {
  searchLibrary: {
    description: 'Search the user library for content matching a query',
    parameters: { query: { type: 'string' } },
  },
  suggestContent: {
    description: 'Suggest content for the user to practice',
    parameters: {
      topic: { type: 'string' },
      type: { type: 'string', enum: ['word', 'phrase', 'sentence', 'article'] },
    },
  },
  translateText: {
    description: 'Translate text to the user target language',
    parameters: { text: { type: 'string' } },
  },
} as const;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
  /** Called before a follow-up request after client-side tools (clear assistant bubble). */
  onBeforeToolFollowUp?: () => void;
  /** Tool lifecycle for UI (start = stream received tool call; done = output sent back to model). */
  onToolStatus?: (event: { toolName: string; toolCallId: string; phase: 'start' | 'done' }) => void;
}

function parseLegacyTextLine(line: string): string | null {
  const t = line.trim();
  if (!t.startsWith('0:')) return null;
  try {
    const token = JSON.parse(t.slice(2)) as unknown;
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}

function parseDataLinePayload(payload: string): Record<string, unknown> | null {
  if (payload === '[DONE]') return null;
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type UiStreamChunk = Record<string, unknown>;

type ToolCallPayload = { toolCallId: string; toolName: string; input: unknown };

/** Minimal UI message shape accepted by the web `/api/chat` normalizer. */
type ApiMessage =
  | ChatMessage
  | {
      id: string;
      role: 'user' | 'assistant' | 'system';
      parts: Array<Record<string, unknown>>;
    };

function randomId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function filterLibraryByQuery(contents: Content[], query: string): Content[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return contents.filter((item) => {
    const body = `${item.title}\n${item.text || item.content}`.toLowerCase();
    const tagHit = item.tags?.some((tag) => tag.toLowerCase().includes(normalized));
    return body.includes(normalized) || tagHit;
  });
}

async function executeMobileTool(toolName: string, input: unknown): Promise<unknown> {
  switch (toolName) {
    case 'searchLibrary': {
      const q =
        typeof input === 'object' && input && 'query' in input
          ? String((input as { query?: unknown }).query ?? '')
          : '';
      const contents = useLibraryStore.getState().contents;
      const hits = filterLibraryByQuery(contents, q).slice(0, 12);
      return {
        results: hits.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          snippet: (c.text || c.content).slice(0, 160),
        })),
      };
    }
    case 'suggestContent': {
      const topic =
        typeof input === 'object' && input && 'topic' in input
          ? String((input as { topic?: unknown }).topic ?? '')
          : '';
      const type =
        typeof input === 'object' && input && 'type' in input ? String((input as { type?: unknown }).type ?? '') : '';
      const contents = useLibraryStore.getState().contents;
      const t = topic.toLowerCase();
      const typed = contents.filter((c) => c.type === type);
      const pool = typed.length > 0 ? typed : contents;
      const hits = pool
        .filter((c) => {
          const body = `${c.title}\n${c.text || c.content}`.toLowerCase();
          return !t || body.includes(t) || c.tags?.some((tag) => tag.toLowerCase().includes(t));
        })
        .slice(0, 8);
      return {
        suggestions: hits.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          reason: 'Matches topic or library context',
        })),
      };
    }
    case 'translateText': {
      const text =
        typeof input === 'object' && input && 'text' in input ? String((input as { text?: unknown }).text ?? '') : '';
      const { settings } = useSettingsStore.getState();
      const targetLang = settings.translationTargetLang?.trim() || 'zh';
      try {
        const result = await translateText(text, targetLang, 'AI chat');
        return {
          targetLang,
          itemTranslation: result.itemTranslation,
          pronunciation: result.pronunciation,
          exampleSentence: result.exampleSentence,
          exampleTranslation: result.exampleTranslation,
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Translation failed' };
      }
    }
    default:
      return { error: `Unsupported tool: ${toolName}` };
  }
}

function buildAssistantToolMessage(args: {
  messageId: string;
  text: string;
  toolCalls: ToolCallPayload[];
  outputs: Record<string, unknown>;
}): ApiMessage {
  const parts: Array<Record<string, unknown>> = [];
  if (args.text.trim()) {
    parts.push({ type: 'text', text: args.text, state: 'done' });
  }
  for (const tc of args.toolCalls) {
    parts.push({
      type: `tool-${tc.toolName}`,
      toolCallId: tc.toolCallId,
      state: 'output-available',
      input: tc.input,
      output: args.outputs[tc.toolCallId],
    });
  }
  return {
    id: args.messageId,
    role: 'assistant',
    parts,
  };
}

interface StreamRoundResult {
  fullText: string;
  finishReason: string | undefined;
  toolCalls: ToolCallPayload[];
  streamMessageId: string;
}

const MAX_TOOL_ROUNDS = 5;

/**
 * Incrementally parse Vercel AI SDK UI stream (`data: {...}`) and legacy `0:` text lines.
 * With `enableMobileTools`, handles client-side tool rounds and follow-up requests.
 */
export async function streamChatResponse(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: { enableMobileTools?: boolean },
): Promise<void> {
  const { settings } = useSettingsStore.getState();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  if (!settings.aiProvider?.trim() || !settings.aiApiKey?.trim()) {
    callbacks.onError(new Error('AI provider not configured. Go to Settings to set up your API key.'));
    return;
  }

  const providerId = settings.aiProvider;
  const providerConfigs: Record<
    string,
    { auth: { type: 'api-key'; apiKey: string }; selectedModelId: string; baseUrl?: string }
  > = {
    [providerId]: {
      auth: { type: 'api-key', apiKey: settings.aiApiKey },
      selectedModelId: settings.aiModel,
      ...(settings.aiBaseUrl ? { baseUrl: settings.aiBaseUrl } : {}),
    },
  };

  const enableMobileTools = options?.enableMobileTools === true;
  let apiMessages: ApiMessage[] = [...messages];

  const runOneRound = async (): Promise<StreamRoundResult> => {
    let fullText = '';
    const toolCalls: ToolCallPayload[] = [];
    const seenTool = new Set<string>();
    let streamMessageId = randomId();
    let finishReason: string | undefined;

    const appendDelta = (delta: string) => {
      fullText += delta;
      callbacks.onToken(fullText);
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: apiMessages,
        provider: providerId,
        model: settings.aiModel,
        providerConfigs,
        context: { module: 'chat' },
        ...(enableMobileTools ? { toolSuite: 'mobile', tools: MOBILE_TOOLS } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Chat request failed' }))) as {
        error?: string;
      };
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response has no readable body');
    }

    const decoder = new TextDecoder();
    let lineBuffer = '';

    const handleChunk = (chunk: UiStreamChunk) => {
      const type = typeof chunk.type === 'string' ? chunk.type : '';
      if (type === 'error' && typeof chunk.errorText === 'string') {
        throw new Error(chunk.errorText);
      }
      if (type === 'start' && typeof chunk.messageId === 'string' && chunk.messageId) {
        streamMessageId = chunk.messageId;
      }
      if (type === 'text-delta' && typeof chunk.delta === 'string' && chunk.delta.length > 0) {
        appendDelta(chunk.delta);
      }
      if (type === 'tool-input-start') {
        const toolCallId = typeof chunk.toolCallId === 'string' ? chunk.toolCallId : '';
        const toolName = typeof chunk.toolName === 'string' ? chunk.toolName : '';
        if (toolCallId && toolName) {
          callbacks.onToolStatus?.({ toolName, toolCallId, phase: 'start' });
        }
      }
      if (type === 'tool-input-available') {
        const toolCallId = typeof chunk.toolCallId === 'string' ? chunk.toolCallId : '';
        const toolName = typeof chunk.toolName === 'string' ? chunk.toolName : '';
        if (toolCallId && toolName && !seenTool.has(toolCallId)) {
          seenTool.add(toolCallId);
          toolCalls.push({ toolCallId, toolName, input: chunk.input });
        }
      }
      if (type === 'finish') {
        finishReason = typeof chunk.finishReason === 'string' ? chunk.finishReason : undefined;
      }
    };

    const handleLine = (rawLine: string) => {
      const line = rawLine.replace(/\r$/, '');
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        const chunk = parseDataLinePayload(payload);
        if (chunk) handleChunk(chunk);
        return;
      }

      const legacy = parseLegacyTextLine(trimmed);
      if (legacy) {
        appendDelta(legacy);
      }
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const parts = lineBuffer.split('\n');
        lineBuffer = parts.pop() ?? '';

        for (const part of parts) {
          handleLine(part);
        }
      }

      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) {
        for (const part of lineBuffer.split('\n')) {
          handleLine(part);
        }
      }
    } finally {
      reader.releaseLock?.();
    }

    return { fullText, finishReason, toolCalls, streamMessageId };
  };

  try {
    let round = 0;
    while (round < MAX_TOOL_ROUNDS) {
      round += 1;
      const { fullText, finishReason, toolCalls, streamMessageId } = await runOneRound();

      const isToolRound = enableMobileTools && finishReason === 'tool-calls' && toolCalls.length > 0;
      if (!isToolRound) {
        if (fullText.length > 0) {
          callbacks.onDone(fullText);
          return;
        }
        callbacks.onError(new Error('No response received from AI provider'));
        return;
      }

      const outputs: Record<string, unknown> = {};
      for (const tc of toolCalls) {
        outputs[tc.toolCallId] = await executeMobileTool(tc.toolName, tc.input);
        callbacks.onToolStatus?.({ toolName: tc.toolName, toolCallId: tc.toolCallId, phase: 'done' });
      }

      const assistantFollowUp = buildAssistantToolMessage({
        messageId: streamMessageId,
        text: fullText,
        toolCalls,
        outputs,
      });
      apiMessages = [...apiMessages, assistantFollowUp];
      callbacks.onBeforeToolFollowUp?.();
    }

    callbacks.onError(new Error('Too many tool calling rounds'));
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
