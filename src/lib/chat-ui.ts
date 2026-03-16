import type { ChatMessage, ChatUIMessage } from '@/types/chat';

export function getUIMessageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is Extract<ChatUIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function getToolResultText(message: ChatUIMessage): string {
  return message.parts
    .flatMap((part) => {
      if (part.type !== 'dynamic-tool' && !part.type.startsWith('tool-')) {
        return [];
      }

      if (!('state' in part)) {
        return [];
      }

      if (part.state === 'output-error' && 'errorText' in part) {
        return [part.errorText];
      }

      if (part.state === 'output-available' && 'output' in part) {
        if (typeof part.output === 'string') {
          return [part.output];
        }

        if (
          part.output &&
          typeof part.output === 'object' &&
          'message' in part.output &&
          typeof part.output.message === 'string'
        ) {
          const summary = summarizeToolData('data' in part.output ? part.output.data : undefined);
          return summary ? [part.output.message, summary] : [part.output.message];
        }
      }

      return [];
    })
    .join('\n')
    .trim();
}

function summarizeToolData(data: unknown): string {
  if (!data || typeof data !== 'object') return '';

  if ('results' in data && Array.isArray(data.results)) {
    return data.results
      .slice(0, 3)
      .map((result) => {
        if (!result || typeof result !== 'object') return '';
        if ('title' in result && typeof result.title === 'string') return result.title;
        if ('name' in result && typeof result.name === 'string') {
          const nameEn = 'nameEn' in result && typeof result.nameEn === 'string' ? ` (${result.nameEn})` : '';
          return `${result.name}${nameEn}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if ('sessions' in data && Array.isArray(data.sessions)) {
    return data.sessions
      .slice(0, 3)
      .map((session) => {
        if (!session || typeof session !== 'object') return '';
        if (
          'title' in session &&
          typeof session.title === 'string' &&
          'module' in session &&
          typeof session.module === 'string'
        ) {
          return `${session.title} (${session.module})`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if ('items' in data && Array.isArray(data.items)) {
    return data.items
      .slice(0, 3)
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        if ('title' in item && typeof item.title === 'string') {
          const subtitle = 'subtitle' in item && typeof item.subtitle === 'string' ? ` — ${item.subtitle}` : '';
          return `${item.title}${subtitle}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if ('overview' in data && data.overview && typeof data.overview === 'object') {
    const overview = data.overview as Record<string, unknown>;
    const totalSessions = typeof overview.totalSessions === 'number' ? overview.totalSessions : 0;
    const totalWords = typeof overview.totalWords === 'number' ? overview.totalWords : 0;
    const avgAccuracy = typeof overview.avgAccuracy === 'number' ? overview.avgAccuracy : 0;
    return [`Sessions: ${totalSessions}`, `Words: ${totalWords}`, `Accuracy: ${avgAccuracy}%`].join('\n');
  }

  if ('sessions' in data && typeof data.sessions === 'number' && 'words' in data && typeof data.words === 'number') {
    const avgAccuracy = 'avgAccuracy' in data && typeof data.avgAccuracy === 'number' ? data.avgAccuracy : 0;
    return [`Today Sessions: ${data.sessions}`, `Words: ${data.words}`, `Accuracy: ${avgAccuracy}%`].join('\n');
  }

  return '';
}

export function getFirstUserMessageText(messages: ChatUIMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = getUIMessageText(message);
    if (text) return text;
  }
  return '';
}

export function getConversationTitle(messages: ChatUIMessage[]): string {
  const firstUserText = getFirstUserMessageText(messages).replace(/\s+/g, ' ').trim();
  if (!firstUserText) return 'New conversation';
  return firstUserText.length > 50 ? `${firstUserText.slice(0, 50)}...` : firstUserText;
}

export function toRenderableChatMessage(message: ChatUIMessage): ChatMessage | null {
  const content = getUIMessageText(message) || getToolResultText(message);

  if (message.role === 'assistant' && !content) {
    return null;
  }

  return {
    id: message.id,
    role: message.role,
    content,
    timestamp: Date.now(),
  };
}
