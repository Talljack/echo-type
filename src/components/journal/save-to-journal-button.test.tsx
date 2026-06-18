import { describe, expect, it } from 'vitest';
import type { ConversationMessage } from '@/types/scenario';
import { canSaveConversationToJournal } from './save-to-journal-button';

function message(overrides: Partial<ConversationMessage>): ConversationMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('canSaveConversationToJournal', () => {
  it('returns false for an opening message without any user reply', () => {
    expect(
      canSaveConversationToJournal([
        message({
          role: 'assistant',
          content: 'Hey there! Welcome to Sunrise Coffee. What can I get started for you today?',
        }),
      ]),
    ).toBe(false);
  });

  it('returns true once the user has sent a real message', () => {
    expect(
      canSaveConversationToJournal([
        message({
          role: 'assistant',
          content: 'Hey there! Welcome to Sunrise Coffee. What can I get started for you today?',
        }),
        message({
          id: 'msg-2',
          role: 'user',
          content: 'I would like a latte, please.',
        }),
      ]),
    ).toBe(true);
  });
});
