import { useSettingsStore } from '@/stores/useSettingsStore';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
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

function parseDataLinePayload(payload: string): { type?: string; delta?: string; errorText?: string } | null {
  if (payload === '[DONE]') return null;
  try {
    return JSON.parse(payload) as { type?: string; delta?: string; errorText?: string };
  } catch {
    return null;
  }
}

/**
 * Incrementally parse Vercel AI SDK UI stream (`data: {...}`) and legacy `0:` text lines.
 * Calls `onToken` with the accumulated assistant text after each delta.
 */
export async function streamChatResponse(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
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

  let fullText = '';

  const appendDelta = (delta: string) => {
    fullText += delta;
    callbacks.onToken(fullText);
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        provider: providerId,
        model: settings.aiModel,
        providerConfigs,
        context: { module: 'chat' },
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

    const handleLine = (rawLine: string) => {
      const line = rawLine.replace(/\r$/, '');
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        const chunk = parseDataLinePayload(payload);
        if (!chunk) return;
        if (chunk.type === 'error' && chunk.errorText) {
          throw new Error(chunk.errorText);
        }
        if (chunk.type === 'text-delta' && typeof chunk.delta === 'string' && chunk.delta.length > 0) {
          appendDelta(chunk.delta);
        }
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

    if (fullText.length > 0) {
      callbacks.onDone(fullText);
    } else {
      callbacks.onError(new Error('No response received from AI provider'));
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
