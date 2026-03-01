import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a',
  'audio/ogg', 'audio/flac',
  'video/mp4', 'video/webm', 'video/x-msvideo',
]);

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.m4a', '.ogg', '.flac',
  '.mp4', '.webm', '.avi',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — Whisper API hard limit

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        error: `Unsupported format "${ext}". Supported: MP3, WAV, M4A, OGG, FLAC, MP4, WebM, AVI`,
      }, { status: 400 });
    }

    if (file.type && !SUPPORTED_MIME_TYPES.has(file.type) && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      return NextResponse.json({
        error: `Unsupported file type "${file.type}".`,
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large. Maximum 25MB. Try trimming the audio first.',
      }, { status: 400 });
    }

    const apiKey =
      req.headers.get('x-openai-key') ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      process.env.OPENAI_API_KEY ||
      '';

    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenAI API key required. Configure in Settings > AI Providers, or set OPENAI_API_KEY env var.',
      }, { status: 401 });
    }

    const openai = new OpenAI({ apiKey });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      ...(language ? { language } : {}),
    });

    const segments = (transcription as unknown as {
      segments?: Array<{ start: number; end: number; text: string }>;
    }).segments?.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })) ?? [];

    const duration = segments.length > 0
      ? segments[segments.length - 1].end
      : 0;

    return NextResponse.json({
      text: transcription.text,
      language: (transcription as unknown as { language?: string }).language || 'en',
      duration,
      segments,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({
          error: 'Invalid OpenAI API key. Check your key in Settings > AI Providers.',
        }, { status: 401 });
      }
      if (error.status === 413) {
        return NextResponse.json({
          error: 'File too large for Whisper API. Try a shorter file.',
        }, { status: 413 });
      }
      return NextResponse.json({
        error: `Whisper API error: ${error.message}`,
      }, { status: error.status || 500 });
    }

    return NextResponse.json({
      error: 'Transcription failed. Please try again.',
    }, { status: 500 });
  }
}
