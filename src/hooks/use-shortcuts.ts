import { useEffect, useRef } from 'react';

import type { ShortcutScope } from '@/lib/shortcut-definitions';
import { SHORTCUT_DEFINITIONS } from '@/lib/shortcut-definitions';
import { matchesShortcutEvent, parseShortcutCombo } from '@/lib/shortcut-utils';
import { isMac } from '@/lib/utils';
import { useShortcutStore } from '@/stores/shortcut-store';

/** Map of shortcut id → handler callback */
export type ShortcutHandlers = Record<string, () => void>;

/**
 * Returns true if the active element is a text input where bare keys should not fire.
 */
function isTextInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return ['text', 'search', 'email', 'password', 'url', 'tel', 'number'].includes(type);
  }
  if (tag === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Core keyboard shortcuts hook.
 *
 * @param scope - The scope this hook instance manages ('global', 'listen', 'speak', 'read')
 * @param handlers - Map of shortcut id → callback. Only IDs matching the scope will fire.
 *
 * Usage:
 * ```
 * useShortcuts('listen', {
 *   'listen:play-pause': () => togglePlay(),
 *   'listen:speed-up': () => speedUp(),
 * });
 * ```
 */
export function useShortcuts(scope: ShortcutScope, handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const scopeDefs = SHORTCUT_DEFINITIONS.filter((d) => d.scope === scope);

    function onKeyDown(e: KeyboardEvent) {
      if (useShortcutStore.getState().isPaused) return;

      const inTextInput = isTextInput(e.target);

      for (const def of scopeDefs) {
        // Get effective key (user override or default)
        const effectiveKey = useShortcutStore.getState().getKey(def.id);
        if (!effectiveKey) continue;

        const combo = parseShortcutCombo(effectiveKey);

        // If focused on a text input, only fire modifier-required shortcuts
        if (inTextInput && !combo.mod) continue;

        if (matchesShortcutEvent(e, effectiveKey)) {
          const handler = handlersRef.current[def.id];
          if (handler) {
            e.preventDefault();
            e.stopPropagation();
            handler();
            return;
          }
        }
      }
    }

    const shortcutWindow = window as Window & {
      __echotypeShortcutListeners?: Partial<Record<ShortcutScope, (event: KeyboardEvent) => void>>;
    };

    shortcutWindow.__echotypeShortcutListeners ??= {};

    const existingListener = shortcutWindow.__echotypeShortcutListeners[scope];
    if (existingListener) {
      window.removeEventListener('keydown', existingListener);
    }

    shortcutWindow.__echotypeShortcutListeners[scope] = onKeyDown;
    window.addEventListener('keydown', onKeyDown);

    return () => {
      const registeredListener = shortcutWindow.__echotypeShortcutListeners?.[scope];
      if (registeredListener === onKeyDown) {
        delete shortcutWindow.__echotypeShortcutListeners?.[scope];
      }
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [scope]);
}

/**
 * Format a key combo for display.
 * e.g. "mod+k" → "⌘K" (Mac) or "Ctrl+K" (Windows)
 */
export function formatKeyCombo(combo: string): string {
  const mac = isMac();
  const parts = combo.toLowerCase().split('+');
  return parts
    .map((part) => {
      switch (part) {
        case 'mod':
          return mac ? '⌘' : 'Ctrl';
        case 'shift':
          return mac ? '⇧' : 'Shift';
        case 'alt':
          return mac ? '⌥' : 'Alt';
        case 'space':
          return 'Space';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'escape':
          return 'Esc';
        case 'enter':
          return '↵';
        case ',':
          return ',';
        default:
          return part.toUpperCase();
      }
    })
    .join(mac ? '' : '+');
}
