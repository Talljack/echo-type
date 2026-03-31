import type { InterfaceLanguage } from '@/stores/language-store';
import { analyticsMessages } from './messages/analytics';
import { assessmentMessages } from './messages/assessment';
import { commonMessages } from './messages/common';
import { dashboardMessages } from './messages/dashboard';
import { libraryMessages } from './messages/library';
import { ollamaWarningMessages } from './messages/ollama-warning';
import { settingsMessages } from './messages/settings';
import { sidebarMessages } from './messages/sidebar';
import { tagManagementMessages } from './messages/tag-management';
import { wordbooksMessages } from './messages/wordbooks';

export const messages = {
  assessment: assessmentMessages,
  analytics: analyticsMessages,
  common: commonMessages,
  sidebar: sidebarMessages,
  dashboard: dashboardMessages,
  settings: settingsMessages,
  library: libraryMessages,
  tagManagement: tagManagementMessages,
  ollamaWarning: ollamaWarningMessages,
  wordbooks: wordbooksMessages,
} as const;

export type Namespace = keyof typeof messages;
type CanonicalNamespaces = {
  [K in Namespace]: (typeof messages)[K]['en'];
};

export type MessageKey<N extends Namespace> = keyof CanonicalNamespaces[N];

function formatMessage(template: string, values?: Record<string, string | number>) {
  if (!values) return template;

  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export function getMessage<N extends Namespace, K extends MessageKey<N>>(
  language: InterfaceLanguage,
  namespace: N,
  key: K,
): CanonicalNamespaces[N][K] {
  const localized = messages[namespace][language] as CanonicalNamespaces[N];
  const english = messages[namespace].en as CanonicalNamespaces[N];
  return (localized[key] ?? english[key]) as CanonicalNamespaces[N][K];
}

export function translate<N extends Namespace, K extends MessageKey<N>>(
  language: InterfaceLanguage,
  namespace: N,
  key: K,
  values?: Record<string, string | number>,
) {
  const message = getMessage(language, namespace, key);

  if (typeof message === 'string') {
    return formatMessage(message, values);
  }

  return message;
}

export type DictionaryShape = {
  [K in Namespace]: CanonicalNamespaces[K];
};

export function getLanguageMessages(language: InterfaceLanguage): DictionaryShape {
  return Object.fromEntries(
    Object.entries(messages).map(([namespace, localized]) => [namespace, localized[language] ?? localized.en]),
  ) as DictionaryShape;
}
