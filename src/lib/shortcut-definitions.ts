export type ShortcutScope = 'global' | 'listen' | 'speak' | 'read' | 'write';

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  scope: ShortcutScope;
  /** Default key combo, e.g. "mod+k", "space", "arrowleft" */
  defaultKey: string;
  /** Whether this shortcut requires a modifier (Cmd/Ctrl) */
  requiresMod: boolean;
}

/**
 * Key format convention:
 * - "mod" = Cmd on Mac, Ctrl on Windows/Linux
 * - Keys are lowercase: "space", "arrowleft", "arrowright", "enter", "escape"
 * - Modifiers joined with "+": "mod+k", "mod+shift+1"
 * - Single keys: "space", "r", "t", "l"
 */
export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // ── Global (require mod) ──────────────────────────────────
  {
    id: 'global:command-palette',
    label: 'Command Palette',
    description: 'Open the command palette',
    scope: 'global',
    defaultKey: 'mod+k',
    requiresMod: true,
  },
  {
    id: 'global:open-settings',
    label: 'Open Settings',
    description: 'Navigate to settings page',
    scope: 'global',
    defaultKey: 'mod+,',
    requiresMod: true,
  },
  {
    id: 'global:toggle-chat',
    label: 'Toggle Chat',
    description: 'Open or close the chat panel',
    scope: 'global',
    defaultKey: 'mod+j',
    requiresMod: true,
  },
  {
    id: 'global:nav-listen',
    label: 'Go to Listen',
    description: 'Navigate to Listen module',
    scope: 'global',
    defaultKey: 'mod+1',
    requiresMod: true,
  },
  {
    id: 'global:nav-speak',
    label: 'Go to Speak',
    description: 'Navigate to Speak module',
    scope: 'global',
    defaultKey: 'mod+2',
    requiresMod: true,
  },
  {
    id: 'global:nav-read',
    label: 'Go to Read',
    description: 'Navigate to Read module',
    scope: 'global',
    defaultKey: 'mod+3',
    requiresMod: true,
  },
  {
    id: 'global:nav-write',
    label: 'Go to Write',
    description: 'Navigate to Write module',
    scope: 'global',
    defaultKey: 'mod+4',
    requiresMod: true,
  },
  {
    id: 'global:speed-down',
    label: 'Speed Down',
    description: 'Decrease TTS speed',
    scope: 'global',
    defaultKey: 'mod+alt+s',
    requiresMod: true,
  },
  {
    id: 'global:speed-up',
    label: 'Speed Up',
    description: 'Increase TTS speed',
    scope: 'global',
    defaultKey: 'mod+alt+shift+s',
    requiresMod: true,
  },
  {
    id: 'global:pitch-down',
    label: 'Pitch Down',
    description: 'Decrease TTS pitch',
    scope: 'global',
    defaultKey: 'mod+alt+p',
    requiresMod: true,
  },
  {
    id: 'global:pitch-up',
    label: 'Pitch Up',
    description: 'Increase TTS pitch',
    scope: 'global',
    defaultKey: 'mod+alt+shift+p',
    requiresMod: true,
  },
  {
    id: 'global:volume-down',
    label: 'Volume Down',
    description: 'Decrease TTS volume',
    scope: 'global',
    defaultKey: 'mod+alt+v',
    requiresMod: true,
  },
  {
    id: 'global:volume-up',
    label: 'Volume Up',
    description: 'Increase TTS volume',
    scope: 'global',
    defaultKey: 'mod+alt+shift+v',
    requiresMod: true,
  },
  {
    id: 'global:stop-tts',
    label: 'Stop TTS',
    description: 'Stop the current text-to-speech playback',
    scope: 'global',
    defaultKey: 'mod+.',
    requiresMod: true,
  },

  {
    id: 'global:nav-favorites',
    label: 'Go to Favorites',
    description: 'Navigate to Favorites page',
    scope: 'global',
    defaultKey: '',
    requiresMod: true,
  },
  {
    id: 'global:toggle-selection-translate',
    label: 'Toggle Selection Translate',
    description: 'Enable or disable selection translation popup',
    scope: 'global',
    defaultKey: '',
    requiresMod: true,
  },

  // ── Listen Mode ───────────────────────────────────────────
  {
    id: 'listen:play-pause',
    label: 'Play / Pause',
    description: 'Toggle TTS playback',
    scope: 'listen',
    defaultKey: 'space',
    requiresMod: false,
  },
  {
    id: 'listen:speed-down',
    label: 'Speed Down',
    description: 'Decrease playback speed',
    scope: 'listen',
    defaultKey: 'arrowleft',
    requiresMod: false,
  },
  {
    id: 'listen:speed-up',
    label: 'Speed Up',
    description: 'Increase playback speed',
    scope: 'listen',
    defaultKey: 'arrowright',
    requiresMod: false,
  },
  {
    id: 'listen:restart',
    label: 'Restart',
    description: 'Restart playback from beginning',
    scope: 'listen',
    defaultKey: 'r',
    requiresMod: false,
  },
  {
    id: 'listen:toggle-translation',
    label: 'Toggle Translation',
    description: 'Show or hide translation',
    scope: 'listen',
    defaultKey: 't',
    requiresMod: false,
  },

  // ── Speak Mode ────────────────────────────────────────────
  {
    id: 'speak:toggle-recording',
    label: 'Toggle Recording',
    description: 'Start or stop voice recording',
    scope: 'speak',
    defaultKey: 'space',
    requiresMod: false,
  },
  {
    id: 'speak:toggle-translation',
    label: 'Toggle Translation',
    description: 'Show or hide translation',
    scope: 'speak',
    defaultKey: 't',
    requiresMod: false,
  },
  {
    id: 'speak:replay-last-assistant',
    label: 'Replay Last Reply',
    description: 'Replay the latest assistant message',
    scope: 'speak',
    defaultKey: 'l',
    requiresMod: false,
  },
  {
    id: 'speak:reset-conversation',
    label: 'Reset Conversation',
    description: 'Reset the conversation to the opening prompt',
    scope: 'speak',
    defaultKey: 'r',
    requiresMod: false,
  },

  // ── Read Mode ─────────────────────────────────────────────
  {
    id: 'read:toggle-recording',
    label: 'Start / Stop Recording',
    description: 'Toggle speech recognition',
    scope: 'read',
    defaultKey: 'space',
    requiresMod: false,
  },
  {
    id: 'read:toggle-translation',
    label: 'Toggle Translation',
    description: 'Show or hide translation',
    scope: 'read',
    defaultKey: 't',
    requiresMod: false,
  },
  {
    id: 'read:listen',
    label: 'Listen to Text',
    description: 'Play reference text with TTS',
    scope: 'read',
    defaultKey: 'l',
    requiresMod: false,
  },
  {
    id: 'read:reset',
    label: 'Reset',
    description: 'Clear transcript and results',
    scope: 'read',
    defaultKey: 'r',
    requiresMod: false,
  },

  // ── Write Mode ────────────────────────────────────────────
  {
    id: 'write:toggle-translation',
    label: 'Toggle Translation',
    description: 'Show or hide translation',
    scope: 'write',
    defaultKey: 'mod+alt+t',
    requiresMod: true,
  },
  {
    id: 'write:reset',
    label: 'Reset',
    description: 'Restart the typing practice',
    scope: 'write',
    defaultKey: 'mod+alt+r',
    requiresMod: true,
  },
];

/** Quick lookup by id */
export const SHORTCUT_MAP = new Map(SHORTCUT_DEFINITIONS.map((d) => [d.id, d]));

/** Get shortcuts for a specific scope */
export function getShortcutsByScope(scope: ShortcutScope): ShortcutDefinition[] {
  return SHORTCUT_DEFINITIONS.filter((d) => d.scope === scope);
}

/** Scope labels for display */
export const SCOPE_LABELS: Record<ShortcutScope, string> = {
  global: 'Global',
  listen: 'Listen Mode',
  speak: 'Speak Mode',
  read: 'Read Mode',
  write: 'Write Mode',
};

export function getActiveShortcutScopes(pathname: string): ShortcutScope[] {
  const scopes: ShortcutScope[] = ['global'];

  if (/^\/listen\/[^/]+$/.test(pathname)) scopes.push('listen');
  if (/^\/speak\/[^/]+$/.test(pathname)) scopes.push('speak');
  if (/^\/read\/[^/]+$/.test(pathname)) scopes.push('read');
  if (/^\/write\/[^/]+$/.test(pathname)) scopes.push('write');

  return scopes;
}

export function getScopeAvailabilityDescription(scope: ShortcutScope): string {
  switch (scope) {
    case 'global':
      return 'Available on every app page, including search.';
    case 'listen':
      return 'Available only while viewing a specific Listen practice page.';
    case 'speak':
      return 'Available only while viewing a specific Speak practice page.';
    case 'read':
      return 'Available only while viewing a specific Read practice page.';
    case 'write':
      return 'Available only while viewing a specific Write practice page.';
  }
}
