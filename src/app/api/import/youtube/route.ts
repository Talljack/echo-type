import { NextResponse } from 'next/server';
import { extractYouTubeVideoId, fetchYouTubeTranscriptFromSources, YouTubeSourceError } from '@/lib/youtube-transcript';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            'Only YouTube URLs support direct transcript fetching. For other platforms (Bilibili, etc.), use Local Upload to import media files.',
        },
        { status: 400 },
      );
    }

    const directTranscript = await fetchYouTubeTranscriptFromSources(videoId, 'en');
    const segments =
      directTranscript?.segments.map((segment) => ({
        text: segment.text,
        offset: Math.round(segment.start * 1000),
        duration: Math.round(segment.duration * 1000),
      })) ?? [];

    // The bounded extractor already covers player, watch-page and timed-text sources.
    // Do not repeat them through a package that hides status codes and has no deadline.
    if (segments.length === 0) {
      return NextResponse.json(
        {
          code: 'no_transcript',
          error: 'No transcript available for this video',
          hint: 'No readable captions were returned. Open the video to check its transcript, then use Paste text or upload SRT / VTT; this can also happen when the source temporarily blocks extraction.',
        },
        { status: 404 },
      );
    }

    const fullText = segments.map((s) => s.text).join(' ');

    return NextResponse.json({
      videoId,
      segments,
      fullText,
      segmentCount: segments.length,
      timeUnit: 'milliseconds',
    });
  } catch (error: unknown) {
    if (error instanceof YouTubeSourceError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    const message = error instanceof Error ? error.message : 'Failed to fetch transcript';
    console.error('YouTube transcript error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
