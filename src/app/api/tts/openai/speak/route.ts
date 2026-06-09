import { NextRequest } from 'next/server';
import { synthesizeOpenAISpeech } from '@/lib/openai-tts';

export async function POST(req: NextRequest) {
  const {
    apiKey,
    baseUrl,
    text,
    model,
    voice,
    speed,
    instructions,
  }: {
    apiKey?: string;
    baseUrl?: string;
    text?: string;
    model?: string;
    voice?: string;
    speed?: number;
    instructions?: string;
  } = await req.json();

  if (!apiKey?.trim()) {
    return Response.json({ error: 'OpenAI API key is required.' }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!voice?.trim()) {
    return Response.json({ error: 'An OpenAI TTS voice is required.' }, { status: 400 });
  }

  try {
    const { audioBuffer, contentType } = await synthesizeOpenAISpeech({
      apiKey,
      baseUrl,
      text,
      model,
      voice,
      speed,
      instructions,
    });

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenAI TTS synthesis failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
