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

/** Parse AI SDK v6 UI message SSE stream (`data: {...}` lines) plus optional legacy `0:` text lines. */
function extractAssistantTextFromStreamBody(body: string): string {
  let fullText = '';

  const appendLegacyLine = (line: string) => {
    const t = line.trim();
    if (!t.startsWith('0:')) return;
    try {
      const token = JSON.parse(t.slice(2)) as unknown;
      if (typeof token === 'string') {
        fullText += token;
      }
    } catch {
      // Skip unparseable lines
    }
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      let chunk: { type?: string; delta?: string; errorText?: string };
      try {
        chunk = JSON.parse(payload) as { type?: string; delta?: string; errorText?: string };
      } catch {
        continue;
      }
      if (chunk.type === 'error' && chunk.errorText) {
        throw new Error(chunk.errorText);
      }
      if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
        fullText += chunk.delta;
      }
      continue;
    }

    appendLegacyLine(line);
  }

  if (!fullText) {
    for (const rawLine of body.split('\n')) {
      appendLegacyLine(rawLine);
    }
  }

  return fullText;
}

export async function streamChatResponse(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
  const { settings } = useSettingsStore.getState();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  if (!settings.aiProvider || !settings.aiApiKey) {
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

  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        provider: providerId,
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

    const text = await response.text();
    const fullText = extractAssistantTextFromStreamBody(text);

    if (fullText) {
      callbacks.onToken(fullText);
      callbacks.onDone(fullText);
    } else {
      callbacks.onError(new Error('No response received from AI provider'));
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
