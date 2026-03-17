import { describe, expect, it } from 'vitest';
import { filterBrowserVoicesByTab, getBrowserVoicePickerGroups } from './voice-picker-filters';

const voices = [
  { name: 'Eddy', isEnglish: true, isPremium: true },
  { name: 'Daniel', isEnglish: true, isPremium: false },
  { name: 'Thomas', isEnglish: false, isPremium: false },
  { name: 'Amelie', isEnglish: false, isPremium: true },
];

describe('voice picker filters', () => {
  it('builds honest browser voice groups from the full voice list', () => {
    const groups = getBrowserVoicePickerGroups(voices);

    expect(groups.all.map((voice) => voice.name)).toEqual(['Eddy', 'Daniel', 'Thomas', 'Amelie']);
    expect(groups.english.map((voice) => voice.name)).toEqual(['Eddy', 'Daniel']);
    expect(groups.premium.map((voice) => voice.name)).toEqual(['Eddy', 'Amelie']);
    expect(groups.system.map((voice) => voice.name)).toEqual(['Daniel', 'Thomas']);
  });

  it('returns the right tab subset without forcing english-only mode', () => {
    expect(filterBrowserVoicesByTab(voices, 'all')).toHaveLength(4);
    expect(filterBrowserVoicesByTab(voices, 'english')).toHaveLength(2);
    expect(filterBrowserVoicesByTab(voices, 'premium')).toHaveLength(2);
    expect(filterBrowserVoicesByTab(voices, 'system')).toHaveLength(2);
  });
});
