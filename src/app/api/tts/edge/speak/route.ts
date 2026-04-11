import { synthesizeEdgeSpeech } from '@/lib/edge-tts';

export async function POST(req: Request) {
  const { text, voice, speed }: { text?: string; voice?: string; speed?: number } = await req.json();

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!voice) {
    return Response.json({ error: 'An Edge TTS voice is required.' }, { status: 400 });
  }

  try {
    const { audioBuffer, contentType } = await synthesizeEdgeSpeech({ text, voice, speed });

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Edge TTS synthesis failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
