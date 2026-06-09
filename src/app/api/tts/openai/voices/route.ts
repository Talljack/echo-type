import { NextResponse } from 'next/server';
import { OPENAI_TTS_MODELS, OPENAI_TTS_VOICES } from '@/lib/openai-tts';

export async function GET() {
  return NextResponse.json({
    voices: OPENAI_TTS_VOICES,
    models: OPENAI_TTS_MODELS,
  });
}
