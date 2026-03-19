import { NextRequest } from 'next/server';
import { synthesizeKokoroSpeech } from '@/lib/kokoro';

export async function POST(req: NextRequest) {
  const {
    serverUrl,
    apiKey,
    text,
    voice,
    speed,
  }: {
    serverUrl?: string;
    apiKey?: string;
    text?: string;
    voice?: string;
    speed?: number;
  } = await req.json();

  if (!serverUrl?.trim()) {
    return Response.json({ error: 'Kokoro server URL is required.' }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!voice) {
    return Response.json({ error: 'A Kokoro voice is required.' }, { status: 400 });
  }

  try {
    const { audioBuffer, contentType } = await synthesizeKokoroSpeech({
      serverUrl,
      apiKey: apiKey || undefined,
      text,
      voice,
      speed,
    });

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kokoro speech synthesis failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
