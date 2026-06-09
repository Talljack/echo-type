import { NextRequest, NextResponse } from 'next/server';
import { listGoogleVoices } from '@/lib/google-tts';

export async function POST(req: NextRequest) {
  const { apiKey: requestApiKey }: { apiKey?: string } = await req.json();
  const apiKey = requestApiKey?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Cloud API key is required.' }, { status: 400 });
  }

  try {
    const voices = await listGoogleVoices(apiKey);
    return NextResponse.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Google Cloud TTS voices.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
