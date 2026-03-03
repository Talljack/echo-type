/**
 * YouTube Transcript API client (no API key required)
 *
 * This is a fallback for Vercel deployment where yt-dlp is not available.
 * Uses the same API that YouTube's web player uses to fetch captions.
 */

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResponse {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.slice(1).split('?')[0];
      if (videoId) return videoId;
    }

    // youtube.com/embed/VIDEO_ID
    if (urlObj.pathname.includes('/embed/')) {
      const videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0];
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch YouTube video transcript using the public API
 * No authentication required - uses the same endpoint as the YouTube web player
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResponse> {
  // Step 1: Fetch video page to get initial data
  const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageResponse = await fetch(videoPageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch video page: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();

  // Step 2: Extract caption tracks from page data
  const captionTracksMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionTracksMatch) {
    throw new Error('No captions available for this video');
  }

  let captionTracks: Array<{ baseUrl: string; languageCode: string; name: { simpleText: string } }>;
  try {
    captionTracks = JSON.parse(captionTracksMatch[1]);
  } catch {
    throw new Error('Failed to parse caption tracks');
  }

  // Step 3: Find English caption track (prefer manual over auto-generated)
  const englishTrack =
    captionTracks.find((track) => track.languageCode === 'en' && !track.name.simpleText.includes('auto-generated')) ||
    captionTracks.find((track) => track.languageCode === 'en');

  if (!englishTrack) {
    throw new Error('No English captions available');
  }

  // Step 4: Fetch caption data
  const captionUrl = englishTrack.baseUrl;
  const captionResponse = await fetch(captionUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
  }

  const captionXml = await captionResponse.text();

  // Step 5: Parse XML captions
  const segments = parseYouTubeCaptionXml(captionXml);
  const text = segments.map((s) => s.text).join(' ');

  return {
    text,
    segments,
    language: englishTrack.languageCode,
  };
}

/**
 * Parse YouTube caption XML format
 */
function parseYouTubeCaptionXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Match <text> tags with start and dur attributes
  const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

  // Use Array.from with matchAll to avoid assignment in expression
  const matches = Array.from(xml.matchAll(textRegex));

  for (const match of matches) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    let text = match[3];

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Fetch YouTube video metadata using oEmbed API (no auth required)
 */
export async function fetchYouTubeMetadata(url: string): Promise<{
  title: string;
  author_name?: string;
  thumbnail_url?: string;
}> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video metadata: ${response.status}`);
  }

  return response.json();
}
