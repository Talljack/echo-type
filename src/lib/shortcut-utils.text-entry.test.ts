import { afterEach, describe, expect, it, vi } from 'vitest';

import { isTextEntryTarget } from './shortcut-utils';

// The unit-test environment is Node, so stand in a minimal HTMLElement.
class FakeElement {
  constructor(
    public tagName: string,
    public type = '',
    public isContentEditable = false,
  ) {}
}

describe('isTextEntryTarget', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false when there is no DOM', () => {
    expect(isTextEntryTarget(null)).toBe(false);
  });

  it('treats text fields as text entry, so bare-key shortcuts (like "r" on /read) never fire there', () => {
    vi.stubGlobal('HTMLElement', FakeElement);
    expect(isTextEntryTarget(new FakeElement('INPUT', 'text') as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget(new FakeElement('INPUT', 'search') as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget(new FakeElement('TEXTAREA') as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget(new FakeElement('DIV', '', true) as unknown as EventTarget)).toBe(true);
  });

  it('does not block shortcuts on buttons, checkboxes or the page itself', () => {
    vi.stubGlobal('HTMLElement', FakeElement);
    expect(isTextEntryTarget(new FakeElement('BUTTON') as unknown as EventTarget)).toBe(false);
    expect(isTextEntryTarget(new FakeElement('INPUT', 'checkbox') as unknown as EventTarget)).toBe(false);
    expect(isTextEntryTarget(new FakeElement('BODY') as unknown as EventTarget)).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});
