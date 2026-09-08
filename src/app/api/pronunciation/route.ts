import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const signature = (value: string) => crypto.createHash('sha1').update(value).digest('hex');

/** SpeechSuper's documented multipart protocol. Never fill absent metrics with synthetic zeroes. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get('audio');
    const referenceText = form.get('referenceText');
    const appKey = form.get('appKey');
    const secretKey = form.get('secretKey');
    if (
      !(audio instanceof File) ||
      !audio.size ||
      typeof referenceText !== 'string' ||
      !referenceText.trim() ||
      typeof appKey !== 'string' ||
      !appKey ||
      typeof secretKey !== 'string' ||
      !secretKey
    ) {
      return Response.json(
        { error: 'Audio, reference text and SpeechSuper credentials are required.' },
        { status: 400 },
      );
    }
    if (audio.size > 10 * 1024 * 1024 || referenceText.length > 2000)
      return Response.json({ error: 'Assessment input is too large.' }, { status: 413 });
    const audioType = audio.type.includes('wav') ? 'wav' : audio.type.includes('webm') ? 'webm' : null;
    if (!audioType) return Response.json({ error: 'Unsupported recording format.' }, { status: 415 });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const userId = 'echotype-user';
    const coreType = referenceText.trim().split(/\s+/).length === 1 ? 'word.eval.promax' : 'sent.eval.promax';
    const params = {
      connect: {
        cmd: 'connect',
        param: {
          sdk: { version: 16777472, source: 9, protocol: 2 },
          app: { applicationId: appKey, timestamp, sig: signature(`${appKey}${timestamp}${secretKey}`) },
        },
      },
      start: {
        cmd: 'start',
        param: {
          app: {
            userId,
            applicationId: appKey,
            timestamp,
            sig: signature(`${appKey}${timestamp}${userId}${secretKey}`),
          },
          audio: { audioType, channel: 1, sampleBytes: 2, sampleRate: 16000 },
          request: {
            coreType,
            refText: referenceText.trim(),
            tokenId: crypto.randomUUID(),
            dict_type: 'IPA88',
            phoneme_output: 1,
          },
        },
      },
    };
    const body = new FormData();
    body.append('text', JSON.stringify(params));
    body.append('audio', audio, `recording.${audioType}`);
    const response = await fetch(`https://api.speechsuper.com/${coreType}`, {
      method: 'POST',
      headers: { 'Request-Index': '0' },
      body,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(40000)]),
    });
    if (!response.ok)
      return Response.json({ error: `SpeechSuper request failed (${response.status}).` }, { status: 502 });
    const data = await response.json();
    const result = data?.result;
    if (!result || typeof result !== 'object' || data.error)
      return Response.json(
        { error: 'SpeechSuper returned no assessment. Check your credentials and service access.' },
        { status: 502 },
      );
    return Response.json({
      status: 'success',
      result: {
        overall: result.overall,
        fluency: typeof result.fluency === 'object' ? result.fluency?.overall : result.fluency,
        integrity: result.integrity ?? result.completeness,
        words: Array.isArray(result.words)
          ? result.words
              .filter((word: unknown) => word && typeof word === 'object')
              .map(
                (word: {
                  word?: string;
                  scores?: { overall?: number };
                  quality_score?: number;
                  phonemes?: unknown[];
                }) => ({
                  word: word.word,
                  quality_score: word.scores?.overall ?? word.quality_score,
                  phonemes: Array.isArray(word.phonemes) ? word.phonemes : [],
                }),
              )
          : [],
      },
    });
  } catch {
    // Provider payloads can echo credentials. Keep upstream error bodies out of logs and responses.
    return Response.json({ error: 'SpeechSuper assessment failed or timed out.' }, { status: 502 });
  }
}
