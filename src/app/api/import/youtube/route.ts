import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { extractYouTubeVideoId, fetchYouTubeTranscriptFromSources } from '@/lib/youtube-transcript';

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

    const directTranscript = await fetchYouTubeTranscriptFromSources(videoId, 'en').catch(() => null);
    let segments =
      directTranscript?.segments.map((segment) => ({
        text: segment.text,
        offset: Math.round(segment.start * 1000),
        duration: Math.round(segment.duration * 1000),
      })) ?? [];

    let transcript = null;
    if (!segments || segments.length === 0) {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
      }).catch(() => null);
    }

    // Fall back to default language if English not available
    if ((!segments || segments.length === 0) && (!transcript || transcript.length === 0)) {
      transcript = await YoutubeTranscript.fetchTranscript(videoId).catch(() => null);
    }

    if ((!segments || segments.length === 0) && (!transcript || transcript.length === 0)) {
      return NextResponse.json({ error: 'No transcript available for this video' }, { status: 404 });
    }

    if (segments.length === 0 && transcript) {
      segments = transcript.map((seg) => ({
        text: seg.text,
        offset: Math.round(seg.offset),
        duration: Math.round(seg.duration),
      }));
    }

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
