export type BrowserVoicePickerTab = 'all' | 'english' | 'premium' | 'system';

export interface BrowserVoicePickerItem {
  isEnglish?: boolean;
  isPremium?: boolean;
}

export interface BrowserVoicePickerGroups<T> {
  all: T[];
  english: T[];
  premium: T[];
  system: T[];
}

export function getBrowserVoicePickerGroups<T extends BrowserVoicePickerItem>(
  voices: T[],
): BrowserVoicePickerGroups<T> {
  return {
    all: voices,
    english: voices.filter((voice) => voice.isEnglish),
    premium: voices.filter((voice) => voice.isPremium),
    system: voices.filter((voice) => !voice.isPremium),
  };
}

export function filterBrowserVoicesByTab<T extends BrowserVoicePickerItem>(
  voices: T[],
  tab: BrowserVoicePickerTab,
): T[] {
  const groups = getBrowserVoicePickerGroups(voices);
  return groups[tab];
}
