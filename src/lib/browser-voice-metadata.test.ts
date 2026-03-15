import { describe, expect, it } from 'vitest';
import {
  getBrowserVoiceAccent,
  getBrowserVoiceMetadata,
  getBrowserVoiceProvider,
  getBrowserVoiceType,
} from './browser-voice-metadata';

describe('browser voice metadata', () => {
  it('classifies known providers', () => {
    expect(getBrowserVoiceProvider('Google UK English Female', true)).toBe('google');
    expect(getBrowserVoiceProvider('Microsoft Sonia Online (Natural)', true)).toBe('microsoft');
    expect(getBrowserVoiceProvider('Apple Samantha', true)).toBe('apple');
    expect(getBrowserVoiceProvider('Daniel', true, 'com.apple.speech.synthesis.voice.daniel')).toBe('apple');
    expect(getBrowserVoiceProvider('Karen', true)).toBe('apple');
    expect(getBrowserVoiceProvider('Eddy', false)).toBe('google');
    expect(getBrowserVoiceProvider('UK English Female', false)).toBe('google');
    expect(getBrowserVoiceProvider('Acme Cloud Voice', false)).toBe('browser-cloud');
  });

  it('detects natural and novelty voice types', () => {
    expect(getBrowserVoiceType('Microsoft Libby Online (Natural)')).toBe('natural');
    expect(getBrowserVoiceType('Grandma')).toBe('novelty');
    expect(getBrowserVoiceType('Daniel')).toBe('standard');
  });

  it('maps English accents and non-English languages', () => {
    expect(getBrowserVoiceAccent('en-US')).toBe('us');
    expect(getBrowserVoiceAccent('en-GB')).toBe('uk');
    expect(getBrowserVoiceAccent('en-PH')).toBe('other-english');
    expect(getBrowserVoiceAccent('ja-JP')).toBe('non-english');
  });

  it('marks featured English voices while excluding novelty voices', () => {
    expect(
      getBrowserVoiceMetadata({
        name: 'Google UK English Female',
        lang: 'en-GB',
        localService: false,
        isPremium: true,
        voiceURI: 'Google UK English Female',
      }),
    ).toMatchObject({
      provider: 'google',
      voiceType: 'standard',
      accent: 'uk',
      isEnglish: true,
      isFeatured: true,
    });

    expect(
      getBrowserVoiceMetadata({
        name: 'Grandma',
        lang: 'en-US',
        localService: true,
        isPremium: true,
        voiceURI: 'Google Grandma',
      }),
    ).toMatchObject({
      provider: 'google',
      voiceType: 'novelty',
      isFeatured: false,
    });
  });
});
