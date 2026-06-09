import { NextRequest } from 'next/server';
import { synthesizeGoogleSpeech } from '@/lib/google-tts';

export async function POST(req: NextRequest) {
  const {
    apiKey: requestApiKey,
    text,
    voiceName,
    languageCode,
    speed,
    pitch,
  }: {
    apiKey?: string;
    text?: string;
    voiceName?: string;
    languageCode?: string;
    speed?: number;
    pitch?: number;
  } = await req.json();
  const apiKey = requestApiKey?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return Response.json({ error: 'Google Cloud API key is required.' }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!voiceName) {
    return Response.json({ error: 'A Google Cloud TTS voice is required.' }, { status: 400 });
  }

  try {
    const { audioBuffer, contentType } = await synthesizeGoogleSpeech({
      apiKey,
      text,
      voiceName,
      languageCode,
      speed,
      pitch,
    });

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Cloud TTS synthesis failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
