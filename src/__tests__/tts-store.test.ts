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
  googleApiKey: '',
  googleVoiceName: 'en-US-Wavenet-F',
  googleVoiceLabel: 'Wavenet F',
  googleLanguageCode: 'en-US',
  openaiTtsApiKey: '',
  openaiTtsBaseUrl: 'https://api.openai.com/v1',
  openaiTtsModel: 'gpt-4o-mini-tts',
  openaiTtsVoice: 'marin',
  openaiTtsVoiceLabel: 'Marin',
  kokoroServerUrl: '',
  kokoroApiKey: '',
  kokoroVoiceId: '',
  kokoroVoiceName: '',
  edgeVoiceId: 'en-US-JennyNeural',
  edgeVoiceName: 'Jenny',
  targetLang: 'zh-CN',
  recommendationsEnabled: true,
  recommendationsCount: 5,
  groqApiKey: '',
  openaiKey: '',
  anthropicKey: '',
  deepseekKey: '',
};

describe('tts-store', () => {
  beforeEach(() => {
    storage.clear();
    useTTSStore.setState({ ...DEFAULT_STATE, hydrated: false });
  });

  it('starts with local browser voice defaults and a Google fallback voice', () => {
    const state = useTTSStore.getState();

    expect(state.voiceSource).toBe('browser');
    expect(state.fishModel).toBe('s2-pro');
    expect(state.fishVoiceId).toBe('');
    expect(state.googleApiKey).toBe('');
    expect(state.googleVoiceName).toBe('en-US-Wavenet-F');
    expect(state.googleVoiceLabel).toBe('Wavenet F');
    expect(state.googleLanguageCode).toBe('en-US');
    expect(state.openaiTtsBaseUrl).toBe('https://api.openai.com/v1');
    expect(state.openaiTtsModel).toBe('gpt-4o-mini-tts');
    expect(state.openaiTtsVoice).toBe('marin');
    expect(state.edgeVoiceId).toBe('en-US-JennyNeural');
    expect(state.edgeVoiceName).toBe('Jenny');
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

  it('migrates persisted Kokoro selection to Edge defaults', () => {
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
    expect(state.voiceSource).toBe('edge');
    expect(state.edgeVoiceId).toBe('en-US-JennyNeural');
    expect(state.edgeVoiceName).toBe('Jenny');
    expect(state.kokoroServerUrl).toBe('http://localhost:8880');
    expect(state.kokoroApiKey).toBe('persisted-kokoro-key');
    expect(state.kokoroVoiceId).toBe('bm_daniel');
    expect(state.kokoroVoiceName).toBe('Daniel');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('edge');
    expect(saved.edgeVoiceId).toBe('en-US-JennyNeural');
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

  it('persists Google Cloud TTS settings to localStorage', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('google');
    store.setGoogleApiKey('google-test-key');
    store.setGoogleVoice('en-US-Neural2-F', 'Neural2 F', 'en-US');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('google');
    expect(saved.googleApiKey).toBe('google-test-key');
    expect(saved.googleVoiceName).toBe('en-US-Neural2-F');
    expect(saved.googleVoiceLabel).toBe('Neural2 F');
    expect(saved.googleLanguageCode).toBe('en-US');
  });

  it('persists OpenAI TTS settings to localStorage', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('openai');
    store.setOpenAITtsApiKey('openai-test-key');
    store.setOpenAITtsBaseUrl('https://gateway.example/v1');
    store.setOpenAITtsModel('tts-1-hd');
    store.setOpenAITtsVoice('cedar', 'Cedar');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('openai');
    expect(saved.openaiTtsApiKey).toBe('openai-test-key');
    expect(saved.openaiTtsBaseUrl).toBe('https://gateway.example/v1');
    expect(saved.openaiTtsModel).toBe('tts-1-hd');
    expect(saved.openaiTtsVoice).toBe('cedar');
    expect(saved.openaiTtsVoiceLabel).toBe('Cedar');
  });

  it('retains defaults when hydrating from empty localStorage', () => {
    useTTSStore.getState().hydrate();

    const state = useTTSStore.getState();
    expect(state.voiceSource).toBe('browser');
    expect(state.fishApiKey).toBe('');
    expect(state.fishModel).toBe('s2-pro');
    expect(state.googleVoiceName).toBe('en-US-Wavenet-F');
    expect(state.openaiTtsVoice).toBe('marin');
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

  it('toggles voice source between available providers', () => {
    const store = useTTSStore.getState();

    store.setVoiceSource('fish');
    expect(useTTSStore.getState().voiceSource).toBe('fish');

    store.setVoiceSource('google');
    expect(useTTSStore.getState().voiceSource).toBe('google');

    store.setVoiceSource('openai');
    expect(useTTSStore.getState().voiceSource).toBe('openai');

    store.setVoiceSource('edge');
    expect(useTTSStore.getState().voiceSource).toBe('edge');

    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(saved.voiceSource).toBe('edge');
  });

  it('persists selected Edge voice metadata', () => {
    useTTSStore.getState().setEdgeVoice('en-US-AvaNeural', 'Ava');

    const state = useTTSStore.getState();
    const saved = JSON.parse(storage.get('echotype_tts_settings') ?? '{}');
    expect(state.edgeVoiceId).toBe('en-US-AvaNeural');
    expect(state.edgeVoiceName).toBe('Ava');
    expect(saved.edgeVoiceId).toBe('en-US-AvaNeural');
    expect(saved.edgeVoiceName).toBe('Ava');
  });

  it('persists full configuration roundtrip', () => {
    const store = useTTSStore.getState();
    store.setVoiceSource('fish');
    store.setFishApiKey('roundtrip-key');
    store.setFishModel('s1-mini');
    store.setFishVoice('voice-rt', 'RoundTrip Voice');

    // Reset store state to defaults
    useTTSStore.setState({ ...DEFAULT_STATE, hydrated: false });

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
