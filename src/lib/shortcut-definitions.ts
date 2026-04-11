import enShortcutMessages from '@/lib/i18n/messages/shortcuts/en.json';
import zhShortcutMessages from '@/lib/i18n/messages/shortcuts/zh.json';

export type ShortcutScope = 'global' | 'listen' | 'speak' | 'read' | 'write';
export type ShortcutLocale = 'en' | 'zh';

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  scope: ShortcutScope;
  defaultKey: string;
  requiresMod: boolean;
}

interface ShortcutDefinitionBase extends Omit<ShortcutDefinition, 'label' | 'description'> {}

type LocalizedShortcutText = Pick<ShortcutDefinition, 'label' | 'description'>;
type RawShortcutLocaleMessages = typeof enShortcutMessages;

export type ShortcutLocaleMessages = {
  scopeLabels: Record<ShortcutScope, string>;
  scopeAvailabilityDescriptions: Record<ShortcutScope, string>;
  ui: {
    summary: {
      title: string;
      description: (defaultSearchKeyLabel: string) => string;
      configureButton: string;
      search: string;
      editing: string;
      editAnyRow: string;
      resetAll: string;
    };
    availability: {
      available: string;
      unavailable: string;
    };
    row: {
      editing: string;
      custom: string;
      default: string;
      saved: string;
      capturingTitle: string;
      pressKeys: string;
      current: string;
      cancelEditing: string;
      editShortcut: string;
      resetToDefault: string;
      requiresModifier: (modifierLabel: string) => string;
      conflict: string;
      capturingHint: string;
    };
    banner: {
      prompt: string;
      requiresModifier: (modifierLabel: string) => string;
      cancelHint: string;
      currentBinding: string;
      cancel: string;
      conflictWith: (shortcutLabel: string, scopeLabel: string) => string;
    };
    modal: {
      title: string;
      description: (defaultSearchKeyLabel: string, currentBinding: string) => string;
    };
    footerNote: string;
  };
  definitions: Record<string, LocalizedShortcutText>;
};

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

const SHORTCUT_TEXT = {
  en: enShortcutMessages,
  zh: zhShortcutMessages,
} as const satisfies Record<ShortcutLocale, RawShortcutLocaleMessages>;

const SHORTCUT_BASE_DEFINITIONS: ShortcutDefinitionBase[] = [
  { id: 'global:command-palette', scope: 'global', defaultKey: 'mod+k', requiresMod: true },
  { id: 'global:open-settings', scope: 'global', defaultKey: 'mod+,', requiresMod: true },
  { id: 'global:toggle-chat', scope: 'global', defaultKey: 'mod+j', requiresMod: true },
  { id: 'global:nav-listen', scope: 'global', defaultKey: 'mod+1', requiresMod: true },
  { id: 'global:nav-speak', scope: 'global', defaultKey: 'mod+2', requiresMod: true },
  { id: 'global:nav-read', scope: 'global', defaultKey: 'mod+3', requiresMod: true },
  { id: 'global:nav-write', scope: 'global', defaultKey: 'mod+4', requiresMod: true },
  { id: 'global:speed-down', scope: 'global', defaultKey: 'mod+arrowdown', requiresMod: true },
  { id: 'global:speed-up', scope: 'global', defaultKey: 'mod+arrowup', requiresMod: true },
  { id: 'global:pitch-down', scope: 'global', defaultKey: 'mod+shift+arrowdown', requiresMod: true },
  { id: 'global:pitch-up', scope: 'global', defaultKey: 'mod+shift+arrowup', requiresMod: true },
  { id: 'global:volume-down', scope: 'global', defaultKey: 'mod+alt+arrowdown', requiresMod: true },
  { id: 'global:volume-up', scope: 'global', defaultKey: 'mod+alt+arrowup', requiresMod: true },
  { id: 'global:stop-tts', scope: 'global', defaultKey: 'mod+.', requiresMod: true },
  { id: 'global:nav-favorites', scope: 'global', defaultKey: '', requiresMod: true },
  { id: 'global:toggle-selection-translate', scope: 'global', defaultKey: '', requiresMod: true },
  { id: 'listen:play-pause', scope: 'listen', defaultKey: 'space', requiresMod: false },
  { id: 'listen:speed-down', scope: 'listen', defaultKey: 'arrowleft', requiresMod: false },
  { id: 'listen:speed-up', scope: 'listen', defaultKey: 'arrowright', requiresMod: false },
  { id: 'listen:restart', scope: 'listen', defaultKey: 'r', requiresMod: false },
  { id: 'listen:toggle-translation', scope: 'listen', defaultKey: 't', requiresMod: false },
  { id: 'listen:toggle-immersive', scope: 'listen', defaultKey: 'f', requiresMod: false },
  { id: 'speak:toggle-recording', scope: 'speak', defaultKey: 'space', requiresMod: false },
  { id: 'speak:toggle-translation', scope: 'speak', defaultKey: 't', requiresMod: false },
  { id: 'speak:replay-last-assistant', scope: 'speak', defaultKey: 'l', requiresMod: false },
  { id: 'speak:reset-conversation', scope: 'speak', defaultKey: 'r', requiresMod: false },
  { id: 'read:toggle-recording', scope: 'read', defaultKey: 'space', requiresMod: false },
  { id: 'read:toggle-translation', scope: 'read', defaultKey: 't', requiresMod: false },
  { id: 'read:listen', scope: 'read', defaultKey: 'l', requiresMod: false },
  { id: 'read:toggle-immersive', scope: 'read', defaultKey: 'f', requiresMod: false },
  { id: 'read:reset', scope: 'read', defaultKey: 'r', requiresMod: false },
  { id: 'write:toggle-translation', scope: 'write', defaultKey: 'mod+shift+t', requiresMod: true },
  { id: 'write:reset', scope: 'write', defaultKey: 'mod+shift+e', requiresMod: true },
  { id: 'global:shadow-next-module', scope: 'global', defaultKey: 'mod+shift+]', requiresMod: true },
  { id: 'global:shadow-end-session', scope: 'global', defaultKey: 'mod+shift+x', requiresMod: true },
];

export function getShortcutLocaleMessages(locale: ShortcutLocale): ShortcutLocaleMessages {
  const raw = SHORTCUT_TEXT[locale] ?? SHORTCUT_TEXT.en;

  return {
    scopeLabels: raw.scopeLabels,
    scopeAvailabilityDescriptions: raw.scopeAvailabilityDescriptions,
    ui: {
      summary: {
        ...raw.ui.summary,
        description: (defaultSearchKeyLabel: string) =>
          interpolate(raw.ui.summary.description, { defaultSearchKeyLabel }),
      },
      availability: raw.ui.availability,
      row: {
        ...raw.ui.row,
        requiresModifier: (modifierLabel: string) => interpolate(raw.ui.row.requiresModifier, { modifierLabel }),
      },
      banner: {
        ...raw.ui.banner,
        requiresModifier: (modifierLabel: string) => interpolate(raw.ui.banner.requiresModifier, { modifierLabel }),
        conflictWith: (shortcutLabel: string, scopeLabel: string) =>
          interpolate(raw.ui.banner.conflictWith, { shortcutLabel, scopeLabel }),
      },
      modal: {
        ...raw.ui.modal,
        description: (defaultSearchKeyLabel: string, currentBinding: string) =>
          interpolate(raw.ui.modal.description, { defaultSearchKeyLabel, currentBinding }),
      },
      footerNote: raw.ui.footerNote,
    },
    definitions: raw.definitions as Record<string, LocalizedShortcutText>,
  };
}

export function getLocalizedShortcutDefinitions(locale: ShortcutLocale): ShortcutDefinition[] {
  const messages = getShortcutLocaleMessages(locale);

  return SHORTCUT_BASE_DEFINITIONS.map((definition) => ({
    ...definition,
    ...(messages.definitions[definition.id] ?? {
      label: definition.id,
      description: definition.id,
    }),
  }));
}

export function getLocalizedShortcutDefinition(locale: ShortcutLocale, id: string): ShortcutDefinition | undefined {
  return getLocalizedShortcutDefinitions(locale).find((definition) => definition.id === id);
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = getLocalizedShortcutDefinitions('en');
export const SHORTCUT_MAP = new Map(SHORTCUT_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getShortcutsByScope(scope: ShortcutScope, locale: ShortcutLocale = 'en'): ShortcutDefinition[] {
  return getLocalizedShortcutDefinitions(locale).filter((definition) => definition.scope === scope);
}

export const SCOPE_LABELS: Record<ShortcutScope, string> = SHORTCUT_TEXT.en.scopeLabels;

export function getScopeLabel(scope: ShortcutScope, locale: ShortcutLocale = 'en'): string {
  return getShortcutLocaleMessages(locale).scopeLabels[scope];
}

export function getActiveShortcutScopes(pathname: string): ShortcutScope[] {
  const scopes: ShortcutScope[] = ['global'];

  if (/^\/listen\/[^/]+$/.test(pathname)) scopes.push('listen');
  if (/^\/speak\/[^/]+$/.test(pathname)) scopes.push('speak');
  if (/^\/read\/[^/]+$/.test(pathname)) scopes.push('read');
  if (/^\/write\/[^/]+$/.test(pathname)) scopes.push('write');

  return scopes;
}

export function getScopeAvailabilityDescription(scope: ShortcutScope, locale: ShortcutLocale = 'en'): string {
  return getShortcutLocaleMessages(locale).scopeAvailabilityDescriptions[scope];
}
