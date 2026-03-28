import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', globalThis);

const { useTTSStore } = await import('@/stores/tts-store');

const DEFAULT_STATE = {
  voiceSource: 'browser' as const,
  voiceURI: '',
  speed: 1,
  pitch: 1,
  volume: 1,
  fishApiKey: '',
  fishVoiceId: '',
  fishVoiceName: '',
  fishModel: 's2-pro',
  kokoroServerUrl: 'http://54.166.253.41:8880',
  kokoroApiKey: '',
  kokoroVoiceId: 'af_heart',
  kokoroVoiceName: 'Heart',
  targetLang: 'zh-CN',
  recommendationsEnabled: true,
  recommendationsCount: 5,
  openaiKey: '',
  anthropicKey: '',
  deepseekKey: '',
  shadowReadingEnabled: false,
};

describe('tts-store', () => {
  beforeEach(() => {
    storage.clear();
    useTTSStore.setState(DEFAULT_STATE);
  });

  it('starts with browser TTS defaults', () => {
    const state = useTTSStore.getState();

    expect(state.voiceSource).toBe('browser');
    expect(state.fishModel).toBe('s2-pro');
    expect(state.fishVoiceId).toBe('');
    expect(state.kokoroServerUrl).toBe('http://54.166.253.41:8880');
    expect(state.kokoroVoiceId).toBe('af_heart');
  });

  it('persists Fish settings to localStorage', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('fish');
    store.setFishApiKey('fish_test_key');
    store.setFishModel('s2');
    store.setFishVoice('voice-123', 'Narrator');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('fish');
    expect(saved.fishApiKey).toBe('fish_test_key');
    expect(saved.fishModel).toBe('s2');
    expect(saved.fishVoiceId).toBe('voice-123');
    expect(saved.fishVoiceName).toBe('Narrator');
  });

  it('hydrates persisted Fish settings', () => {
    storage.set(
      'echotype_tts_settings',
      JSON.stringify({
        voiceSource: 'fish',
        fishApiKey: 'persisted-key',
        fishVoiceId: 'voice-abc',
        fishVoiceName: 'Tutor Voice',
        fishModel: 's1',
      }),
    );

    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('fish');
    expect(state.fishApiKey).toBe('persisted-key');
    expect(state.fishVoiceId).toBe('voice-abc');
    expect(state.fishVoiceName).toBe('Tutor Voice');
    expect(state.fishModel).toBe('s1');
  });

  it('persists Kokoro settings to localStorage', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('kokoro');
    store.setKokoroServerUrl('http://localhost:8880');
    store.setKokoroApiKey('kokoro-secret');
    store.setKokoroVoice('bf_emma', 'Emma');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('kokoro');
    expect(saved.kokoroServerUrl).toBe('http://localhost:8880');
    expect(saved.kokoroApiKey).toBe('kokoro-secret');
    expect(saved.kokoroVoiceId).toBe('bf_emma');
    expect(saved.kokoroVoiceName).toBe('Emma');
  });

  it('hydrates persisted Kokoro settings', () => {
    storage.set(
      'echotype_tts_settings',
      JSON.stringify({
        voiceSource: 'kokoro',
        kokoroServerUrl: 'http://localhost:8880',
        kokoroApiKey: 'persisted-kokoro-key',
        kokoroVoiceId: 'bm_daniel',
        kokoroVoiceName: 'Daniel',
      }),
    );

    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('kokoro');
    expect(state.kokoroServerUrl).toBe('http://localhost:8880');
    expect(state.kokoroApiKey).toBe('persisted-kokoro-key');
    expect(state.kokoroVoiceId).toBe('bm_daniel');
    expect(state.kokoroVoiceName).toBe('Daniel');
  });

  it('auto-saves Fish API key on change', () => {
    useTTSStore.getState().setFishApiKey('69901652a73242b6a20286ec91ad212e');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.fishApiKey).toBe('69901652a73242b6a20286ec91ad212e');
    expect(useTTSStore.getState().fishApiKey).toBe('69901652a73242b6a20286ec91ad212e');
  });

  it('auto-saves Fish voice selection on change', () => {
    useTTSStore.getState().setFishVoice('voice-xyz', 'Sarah');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.fishVoiceId).toBe('voice-xyz');
    expect(saved.fishVoiceName).toBe('Sarah');
  });

  it('defaults fishVoiceName to empty string when not provided', () => {
    useTTSStore.getState().setFishVoice('voice-xyz');

    const state = useTTSStore.getState();
    expect(state.fishVoiceId).toBe('voice-xyz');
    expect(state.fishVoiceName).toBe('');
  });

  it('auto-saves Fish model on change', () => {
    useTTSStore.getState().setFishModel('s2');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.fishModel).toBe('s2');
    expect(useTTSStore.getState().fishModel).toBe('s2');
  });

  it('retains defaults when hydrating from empty localStorage', () => {
    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('browser');
    expect(state.fishApiKey).toBe('');
    expect(state.fishModel).toBe('s2-pro');
  });

  it('retains defaults when hydrating from invalid JSON', () => {
    storage.set('echotype_tts_settings', 'not-json');

    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('browser');
    expect(state.fishApiKey).toBe('');
  });

  it('merges partial data on hydrate without overwriting unset fields', () => {
    storage.set('echotype_tts_settings', JSON.stringify({ fishApiKey: 'partial-key' }));

    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.fishApiKey).toBe('partial-key');
    expect(state.voiceSource).toBe('browser');
    expect(state.fishModel).toBe('s2-pro');
  });

  it('toggles voice source between browser and fish', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('fish');
    expect(useTTSStore.getState().voiceSource).toBe('fish');

    store.setVoiceSource('browser');
    expect(useTTSStore.getState().voiceSource).toBe('browser');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('browser');
  });

  it('switches voice source to kokoro and persists it', () => {
    useTTSStore.getState().setVoiceSource('kokoro');

    expect(useTTSStore.getState().voiceSource).toBe('kokoro');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('kokoro');
  });

  it('persists full configuration roundtrip', () => {
    const store = useTTSStore.getState();
    store.setVoiceSource('fish');
    store.setFishApiKey('roundtrip-key');
    store.setFishModel('s1-mini');
    store.setFishVoice('voice-rt', 'RoundTrip Voice');

    // Reset store state to defaults
    useTTSStore.setState(DEFAULT_STATE);

    // Hydrate from storage
    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('fish');
    expect(state.fishApiKey).toBe('roundtrip-key');
    expect(state.fishModel).toBe('s1-mini');
    expect(state.fishVoiceId).toBe('voice-rt');
    expect(state.fishVoiceName).toBe('RoundTrip Voice');
  });
});
