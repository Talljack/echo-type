import { getMonthlyUsage } from '@/lib/pronunciation';
import { type AcousticAssessment, parseAcousticAssessment } from '@/lib/pronunciation-training';
import { usePronunciationStore } from '@/stores/pronunciation-store';
import { parseSpeechSuperResponse } from './speechsuper';
import { toAssessmentWav } from './studio-audio';
import type { PronunciationWord } from './types';

export type RecordedAcousticAssessment = AcousticAssessment & { words: PronunciationWord[] };
/** Explicit audio assessment. Never substitutes transcript-based AI feedback. */
export async function assessAcousticRecording(
  audio: Blob,
  referenceText: string,
  options: { signal?: AbortSignal } = {},
): Promise<RecordedAcousticAssessment> {
  options.signal?.throwIfAborted();
  const settings = usePronunciationStore.getState();
  if (!settings.speechSuperAppKey || !settings.speechSuperSecretKey)
    throw new Error(
      'Configure SpeechSuper in Settings before assessing pronunciation. / 请先在设置中配置 SpeechSuper。',
    );
  if (!audio.size || audio.size > 10 * 1024 * 1024)
    throw new Error('Audio is empty or exceeds the 10 MB assessment limit. / 录音为空或超过 10 MB。');
  if (!referenceText.trim() || referenceText.length > 2000)
    throw new Error('Choose a reference sentence of at most 2000 characters. / 请选择不超过 2000 字符的评估原文。');
  if (getMonthlyUsage().count >= settings.monthlyLimit)
    throw new Error('Monthly acoustic assessment limit reached. / 已达到每月声学评分上限。');
  const deadline = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, deadline.signal]) : deadline.signal;
  const timer = setTimeout(() => deadline.abort(), 45_000);
  try {
    const wav = await toAssessmentWav(audio);
    signal.throwIfAborted();
    if (!wav.size || wav.size > 10 * 1024 * 1024)
      throw new Error('Converted recording exceeds the 10 MB assessment limit. / 转换后的录音超过 10 MB。');
    const body = new FormData();
    body.append('audio', wav, 'recording.wav');
    body.append('referenceText', referenceText.trim());
    body.append('appKey', settings.speechSuperAppKey);
    body.append('secretKey', settings.speechSuperSecretKey);
    const response = await fetch('/api/pronunciation', { method: 'POST', body, signal });
    const payload = await response.json();
    signal.throwIfAborted();
    if (!response.ok)
      throw new Error(typeof payload.error === 'string' ? payload.error : 'SpeechSuper acoustic assessment failed.');
    const metrics = parseAcousticAssessment(payload);
    const words = parseSpeechSuperResponse(payload).words;
    try {
      const usage = getMonthlyUsage();
      localStorage.setItem('echotype_pronunciation_usage', JSON.stringify({ ...usage, count: usage.count + 1 }));
    } catch {
      /* Keep a valid result if local quota storage is unavailable. */
    }
    return { ...metrics, words };
  } finally {
    clearTimeout(timer);
  }
}
