'use client';

import { useLanguageStore } from '@/stores/language-store';
import type { DictionaryShape, MessageKey, Namespace } from './dictionary';
import { getLanguageMessages, translate } from './dictionary';

export function useI18n<N extends Namespace>(namespace: N) {
  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);
  const currentMessages: DictionaryShape[N] = getLanguageMessages(interfaceLanguage)[namespace];

  return {
    interfaceLanguage,
    messages: currentMessages,
    t: <K extends MessageKey<N>>(key: K, values?: Record<string, string | number>) =>
      translate(interfaceLanguage, namespace, key, values),
  };
}
