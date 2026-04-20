jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn(),
}));

jest.mock('@/services/tts-api', () => ({
  getEdgeTTSVoices: jest.fn(),
}));

import * as Speech from 'expo-speech';
import { getEdgeTTSVoices } from '@/services/tts-api';
import {
  getVoiceSource,
  loadAllVoices,
  loadDeviceVoices,
  loadEdgeVoices,
  previewTextForLocale,
} from './voices';

const mockedGetAvailableVoicesAsync = Speech.getAvailableVoicesAsync as jest.Mock;
const mockedGetEdgeTTSVoices = getEdgeTTSVoices as jest.Mock;

describe('getVoiceSource', () => {
  it('treats *Neural as edge', () => {
    expect(getVoiceSource('en-US-JennyNeural')).toBe('edge');
    expect(getVoiceSource('zh-CN-XiaoxiaoNeural')).toBe('edge');
    expect(getVoiceSource('en-US-AvaMultilingualNeural')).toBe('edge');
  });

  it('treats anything else as device', () => {
    expect(getVoiceSource('com.apple.ttsbundle.Samantha-compact')).toBe('device');
    expect(getVoiceSource('Google us-x-iol-network')).toBe('device');
    expect(getVoiceSource('')).toBe('device');
  });
});

describe('previewTextForLocale', () => {
  it.each([
    ['en-US', 'Hello! This is how I sound.'],
    ['zh-CN', '你好！这是我的声音。'],
    ['ja-JP', 'こんにちは、これが私の声です。'],
    ['fr-FR', 'Bonjour, voici ma voix.'],
    ['de-DE', 'Hallo, so klinge ich.'],
  ])('%s → localized preview', (locale, expected) => {
    expect(previewTextForLocale(locale)).toBe(expected);
  });

  it('falls back to English for unknown locales', () => {
    expect(previewTextForLocale('xx-YY')).toBe('Hello! This is how I sound.');
  });
});

describe('loadEdgeVoices', () => {
  beforeEach(() => {
    mockedGetEdgeTTSVoices.mockReset();
  });

  it('normalizes server shape to UnifiedVoice', async () => {
    mockedGetEdgeTTSVoices.mockResolvedValue([
      {
        id: 'en-US-JennyNeural',
        name: 'Jenny',
        shortName: 'en-US-JennyNeural',
        locale: 'en-US',
        gender: 'Female',
        personalities: ['Friendly', 'Considerate'],
      },
    ]);

    const result = await loadEdgeVoices();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'en-US-JennyNeural',
      name: 'Jenny (en-US)',
      language: 'en-US',
      gender: 'female',
      source: 'edge',
      description: 'Friendly · Considerate',
      preview: 'Hello! This is how I sound.',
    });
  });

  it('handles voices without personalities', async () => {
    mockedGetEdgeTTSVoices.mockResolvedValue([
      {
        id: 'zh-CN-YunxiNeural',
        name: 'Yunxi',
        shortName: 'zh-CN-YunxiNeural',
        locale: 'zh-CN',
        gender: 'Male',
      },
    ]);

    const [v] = await loadEdgeVoices();
    expect(v.description).toBeUndefined();
    expect(v.preview).toBe('你好！这是我的声音。');
    expect(v.gender).toBe('male');
  });
});

describe('loadDeviceVoices', () => {
  beforeEach(() => {
    mockedGetAvailableVoicesAsync.mockReset();
  });

  it('normalizes, dedupes, and sorts by language then name', async () => {
    mockedGetAvailableVoicesAsync.mockResolvedValue([
      { identifier: 'voice.zb', language: 'zh_CN', name: 'Yunxi', quality: 'Enhanced' },
      { identifier: 'voice.us', language: 'en_US', name: 'Samantha', quality: 'Default' },
      { identifier: 'voice.zb', language: 'zh-CN', name: 'Yunxi (dup)' }, // duplicate id
      { identifier: 'voice.za', language: 'en-US', name: 'Alex' },
    ]);

    const result = await loadDeviceVoices();

    expect(result).toHaveLength(3);
    expect(result.map((v) => v.id)).toEqual(['voice.za', 'voice.us', 'voice.zb']);
    expect(result[0]).toMatchObject({
      id: 'voice.za',
      name: 'Alex',
      language: 'en-US',
      source: 'device',
    });
    expect(result[2].language).toBe('zh-CN');
    expect(result[0].description).toBeUndefined();
    expect(result[1].description).toBe('Default');
  });

  it('returns [] when expo-speech throws', async () => {
    mockedGetAvailableVoicesAsync.mockRejectedValue(new Error('permission denied'));
    await expect(loadDeviceVoices()).resolves.toEqual([]);
  });

  it('falls back to identifier when name missing', async () => {
    mockedGetAvailableVoicesAsync.mockResolvedValue([
      { identifier: 'raw.voice.id', language: 'en-US' },
    ]);
    const [v] = await loadDeviceVoices();
    expect(v.name).toBe('raw.voice.id');
  });
});

describe('loadAllVoices', () => {
  beforeEach(() => {
    mockedGetAvailableVoicesAsync.mockReset();
    mockedGetEdgeTTSVoices.mockReset();
  });

  it('returns both lists and no error on success', async () => {
    mockedGetEdgeTTSVoices.mockResolvedValue([
      { id: 'x', name: 'X', shortName: 'x', locale: 'en-US', gender: 'Female' },
    ]);
    mockedGetAvailableVoicesAsync.mockResolvedValue([{ identifier: 'd1', language: 'en-US', name: 'D1' }]);

    const result = await loadAllVoices();

    expect(result.edge).toHaveLength(1);
    expect(result.device).toHaveLength(1);
    expect(result.edgeError).toBeNull();
  });

  it('degrades gracefully when edge fails', async () => {
    mockedGetEdgeTTSVoices.mockRejectedValue(new Error('Network failure'));
    mockedGetAvailableVoicesAsync.mockResolvedValue([{ identifier: 'd1', language: 'en-US', name: 'D1' }]);

    const result = await loadAllVoices();

    expect(result.edge).toEqual([]);
    expect(result.device).toHaveLength(1);
    expect(result.edgeError).toMatch(/network failure/i);
  });

  it('still returns edge voices when device fails', async () => {
    mockedGetEdgeTTSVoices.mockResolvedValue([
      { id: 'x', name: 'X', shortName: 'x', locale: 'en-US', gender: 'Female' },
    ]);
    mockedGetAvailableVoicesAsync.mockRejectedValue(new Error('unavailable'));

    const result = await loadAllVoices();

    expect(result.edge).toHaveLength(1);
    expect(result.device).toEqual([]);
    expect(result.edgeError).toBeNull();
  });
});
