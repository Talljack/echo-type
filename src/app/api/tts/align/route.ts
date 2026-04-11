import { NextRequest } from 'next/server';
import { matchTimestampsToText } from '@/lib/word-alignment';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'whisper-large-v3-turbo';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  const text = formData.get('text') as string | null;
  const groqApiKey = (formData.get('groqApiKey') as string) || process.env.GROQ_API_KEY;

  if (!audioFile) {
    return Response.json({ error: 'Audio file is required.' }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (!groqApiKey?.trim()) {
    return Response.json({ error: 'Groq API key is not configured.' }, { status: 400 });
  }

  try {
    const groqForm = new FormData();
    groqForm.append('file', audioFile, audioFile.name || 'audio.mp3');
    groqForm.append('model', GROQ_MODEL);
    groqForm.append('response_format', 'verbose_json');
    groqForm.append('timestamp_granularities[]', 'word');
    groqForm.append('language', 'en');
    groqForm.append('temperature', '0');

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: groqForm,
    });

    if (!groqResponse.ok) {
      const errorData = (await groqResponse.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = errorData.error?.message || `Groq API error: ${groqResponse.status}`;
      return Response.json({ error: message }, { status: groqResponse.status });
    }

    const groqData = (await groqResponse.json()) as {
      duration?: number;
      words?: Array<{ word: string; start: number; end: number }>;
    };

    const whisperWords = groqData.words ?? [];
    const duration = groqData.duration ?? 0;

    const alignedWords = matchTimestampsToText(whisperWords, text);

    return Response.json({ words: alignedWords, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Word alignment failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
