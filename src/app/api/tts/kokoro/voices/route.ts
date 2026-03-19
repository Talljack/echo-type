import { NextRequest, NextResponse } from 'next/server';
import { listKokoroVoices } from '@/lib/kokoro';

export async function POST(req: NextRequest) {
  const { serverUrl, apiKey }: { serverUrl?: string; apiKey?: string } = await req.json();

  if (!serverUrl?.trim()) {
    return NextResponse.json({ error: 'Kokoro server URL is required.' }, { status: 400 });
  }

  try {
    const voices = await listKokoroVoices(serverUrl, apiKey || undefined);
    return NextResponse.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Kokoro voices.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
