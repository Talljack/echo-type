import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Only YouTube URLs support direct transcript fetching. For other platforms (Bilibili, etc.), use Local Upload to import media files.' },
        { status: 400 }
      );
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    });

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No English transcript available for this video' },
        { status: 404 }
      );
    }

    const segments = transcript.map((seg) => ({
      text: seg.text,
      offset: Math.round(seg.offset),
      duration: Math.round(seg.duration),
    }));

    const fullText = segments.map((s) => s.text).join(' ');

    return NextResponse.json({
      videoId,
      segments,
      fullText,
      segmentCount: segments.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transcript';
    console.error('YouTube transcript error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
