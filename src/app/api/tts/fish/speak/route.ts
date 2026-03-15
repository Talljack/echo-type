import { NextRequest } from 'next/server';
import { synthesizeFishSpeech } from '@/lib/fish-audio';

export async function POST(req: NextRequest) {
  const {
    apiKey,
    text,
    voiceId,
    model,
    speed,
  }: {
    apiKey?: string;
    text?: string;
    voiceId?: string;
    model?: 'speech-1.5' | 'speech-1.6' | 'agent-x0' | 's1' | 's1-mini';
    speed?: number;
  } = await req.json();

  if (!apiKey) {
    return Response.json({ error: 'Fish Audio API key is required.' }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!voiceId) {
    return Response.json({ error: 'A Fish Audio voice is required.' }, { status: 400 });
  }

  try {
    const { audioBuffer, contentType } = await synthesizeFishSpeech({
      apiKey,
      text,
      voiceId,
      model: model ?? 'speech-1.6',
      speed,
    });

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fish Audio synthesis failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
