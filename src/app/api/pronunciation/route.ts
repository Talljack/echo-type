import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const SPEECHSUPER_API_URL = 'https://api.speechsuper.com/';

function generateSignature(appKey: string, secretKey: string, timestamp: string): string {
  const raw = `${appKey}${timestamp}${secretKey}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const referenceText = formData.get('referenceText') as string | null;
    const appKey = formData.get('appKey') as string | null;
    const secretKey = formData.get('secretKey') as string | null;

    if (!audioFile || !referenceText || !appKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: audio, referenceText, appKey, secretKey' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = generateSignature(appKey, secretKey, timestamp);

    // Build SpeechSuper API request
    const params = {
      connect: {
        cmd: 'start',
        param: {
          baseType: 'sent',
          coreType: 'sent.eval',
          res: 'en.sent.score',
          userId: 'echotype-user',
          refText: referenceText,
          audioFormat: 'webm',
          sampleRate: 16000,
        },
      },
      start: {
        cmd: 'start',
        param: {
          baseType: 'sent',
          coreType: 'sent.eval',
          res: 'en.sent.score',
          userId: 'echotype-user',
          refText: referenceText,
          audioFormat: 'webm',
          sampleRate: 16000,
        },
      },
    };

    const ssFormData = new FormData();
    ssFormData.append(
      'text',
      JSON.stringify({
        appkey: appKey,
        timestamp,
        sign: signature,
        paraArray: [JSON.stringify(params)],
      }),
    );

    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    ssFormData.append('audio', audioBlob, 'recording.webm');

    const ssResponse = await fetch(`${SPEECHSUPER_API_URL}`, {
      method: 'POST',
      body: ssFormData,
    });

    if (!ssResponse.ok) {
      const errText = await ssResponse.text().catch(() => 'Unknown error');
      return new Response(JSON.stringify({ error: `SpeechSuper API error: ${ssResponse.status} - ${errText}` }), {
        status: ssResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await ssResponse.json();

    // Normalize response to our expected format
    const result = data?.result;
    if (!result) {
      return Response.json({
        status: 'error',
        error: data?.error || 'No result from SpeechSuper',
      });
    }

    return Response.json({
      status: 'success',
      result: {
        overall: result.overall ?? 0,
        fluency: result.fluency?.overall ?? result.fluency ?? 0,
        integrity: result.integrity ?? result.completeness ?? 0,
        words: (result.words ?? []).map(
          (w: { word: string; scores?: { overall: number }; quality_score?: number; phonemes?: unknown[] }) => ({
            word: w.word,
            quality_score: w.scores?.overall ?? w.quality_score ?? 0,
            phonemes: w.phonemes ?? [],
          }),
        ),
      },
    });
  } catch (err) {
    console.error('[Pronunciation API] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
