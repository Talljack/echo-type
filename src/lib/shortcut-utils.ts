import { isMac } from '@/lib/utils';

const KEY_CODE_MAP: Record<string, string> = {
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
  Backquote: '`',
  Backslash: '\\',
  Backspace: 'backspace',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Enter: 'enter',
  Equal: '=',
  Escape: 'escape',
  Minus: '-',
  Period: '.',
  Quote: "'",
  Semicolon: ';',
  Slash: '/',
  Space: 'space',
  Tab: 'tab',
};

const KEY_VALUE_MAP: Record<string, string> = {
  ' ': 'space',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
  arrowup: 'arrowup',
  arrowdown: 'arrowdown',
  backspace: 'backspace',
  enter: 'enter',
  escape: 'escape',
  tab: 'tab',
};

export function parseShortcutCombo(combo: string) {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  return {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key,
  };
}

export function getNormalizedShortcutKey(event: Pick<KeyboardEvent, 'code' | 'key'>): string {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3).toLowerCase();
  }

  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.slice(5);
  }

  if (KEY_CODE_MAP[event.code]) {
    return KEY_CODE_MAP[event.code];
  }

  const eventKey = event.key.toLowerCase();
  return KEY_VALUE_MAP[eventKey] ?? eventKey;
}

export function matchesShortcutEvent(
  event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  combo: string,
): boolean {
  const parsed = parseShortcutCombo(combo);
  const modPressed = isMac() ? event.metaKey : event.ctrlKey;

  if (parsed.mod !== modPressed) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  return getNormalizedShortcutKey(event) === parsed.key;
}
