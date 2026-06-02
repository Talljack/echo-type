import { describe, expect, it } from 'vitest';
import { getChatDockClasses, isLibraryRoute } from './chat-dock-layout';

describe('chat dock layout', () => {
  it('keeps the chat dock on the viewport right edge for library detail pages', () => {
    expect(isLibraryRoute('/library/collections/asking-directions')).toBe(true);
    expect(getChatDockClasses('/library/collections/asking-directions')).toEqual({
      fab: 'right-6',
      panel: 'right-6',
    });
  });
});
