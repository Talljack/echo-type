import { describe, expect, it } from 'vitest';
import {
  buildUpstreamTranscriptionFormData,
  getTranscriptionRetryDelayMs,
  getTranscriptionEndpoint,
  getTranscriptionModel,
  MAX_TRANSCRIPTION_FILE_SIZE,
  parseUpstreamTranscriptionPayload,
  shouldRetryTranscriptionStatus,
  validateTranscriptionFile,
} from './transcription';

describe('transcription helpers', () => {
  it('uses the Groq STT endpoint and model', () => {
    expect(getTranscriptionEndpoint('groq')).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(getTranscriptionModel('groq')).toBe('whisper-large-v3-turbo');
  });

  it('uses the OpenAI STT endpoint and model', () => {
    expect(getTranscriptionEndpoint('openai')).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(getTranscriptionModel('openai')).toBe('whisper-1');
  });

  it('rejects unsupported file types and oversize uploads', () => {
    const badType = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(validateTranscriptionFile(badType)).toMatchObject({ valid: false });

    const oversized = new File([new Uint8Array(MAX_TRANSCRIPTION_FILE_SIZE + 1)], 'audio.mp3', { type: 'audio/mpeg' });
    expect(validateTranscriptionFile(oversized)).toMatchObject({ valid: false });
  });

  it('marks transient upstream statuses as retryable', () => {
    expect(shouldRetryTranscriptionStatus(429)).toBe(true);
    expect(shouldRetryTranscriptionStatus(500)).toBe(true);
    expect(shouldRetryTranscriptionStatus(401)).toBe(false);
    expect(getTranscriptionRetryDelayMs(0)).toBe(300);
    expect(getTranscriptionRetryDelayMs(1)).toBe(600);
  });

  it('builds the upstream form for transcription requests', () => {
    const file = new File(['audio'], 'sample.wav', { type: 'audio/wav' });
    const formData = buildUpstreamTranscriptionFormData(file, 'groq', 'en');

    expect(formData.get('file')).toBe(file);
    expect(formData.get('model')).toBe('whisper-large-v3-turbo');
    expect(formData.get('response_format')).toBe('verbose_json');
    expect(formData.get('timestamp_granularities[]')).toBe('segment');
    expect(formData.get('language')).toBe('en');
  });

  it('falls back to plain-text upstream errors when JSON parsing fails', async () => {
    const response = new Response('upstream failed badly', { status: 500 });
    await expect(parseUpstreamTranscriptionPayload(response)).resolves.toEqual({
      error: { message: 'upstream failed badly' },
    });
  });
});
