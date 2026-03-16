import { NextRequest } from 'next/server';
import { synthesizeFishSpeech } from '@/lib/fish-audio';
import type { FishAudioModelId } from '@/lib/fish-audio-shared';

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
    model?: FishAudioModelId;
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
      model: model ?? 's2-pro',
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
