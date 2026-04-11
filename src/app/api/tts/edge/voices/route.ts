import { NextResponse } from 'next/server';
import { listEdgeVoices } from '@/lib/edge-tts';

export async function GET() {
  try {
    const voices = await listEdgeVoices();
    return NextResponse.json({ voices });
  } catch {
    return NextResponse.json({ voices: [], error: 'Failed to fetch Edge TTS voices.' }, { status: 500 });
  }
}
