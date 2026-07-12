/**
 * YouTube Transcript API client (no API key required)
 *
 * This is a fallback for Vercel deployment where yt-dlp is not available.
 * Uses the same API that YouTube's web player uses to fetch captions.
 */

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name?: { simpleText?: string };
  kind?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const isYouTube = hostname === 'youtube.com' || hostname.endsWith('.youtube.com');

    if (isYouTube) {
      if (urlObj.pathname === '/watch') return urlObj.searchParams.get('v') || null;
      const [type, videoId] = urlObj.pathname.split('/').filter(Boolean);
      if (['shorts', 'live', 'embed'].includes(type) && videoId) return videoId;
      return null;
    }

    if (hostname === 'youtu.be') return urlObj.pathname.split('/').filter(Boolean)[0] || null;

    return null;
  } catch {
    return null;
  }
}

const baseLanguage = (language = '') => language.toLowerCase().split('-')[0];

export function orderYouTubeCaptionTracks(tracks: CaptionTrack[], preferredLang = 'en'): CaptionTrack[] {
  const preferred = baseLanguage(preferredLang);
  const score = (track: CaptionTrack) => {
    const language = baseLanguage(track.languageCode);
    const automatic = track.kind === 'asr';
    if (preferred && language === preferred) return automatic ? 1 : 0;
    if (language === 'en') return automatic ? 3 : 2;
    return automatic ? 5 : 4;
  };

  return tracks
    .filter((track) => Boolean(track.baseUrl))
    .map((track, index) => ({ track, index }))
    .sort((a, b) => score(a.track) - score(b.track) || a.index - b.index)
    .map(({ track }) => track);
}

interface Json3Payload {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string }>;
  }>;
}

export function parseYouTubeJson3(payload: unknown): TranscriptSegment[] {
  const events = (payload as Json3Payload | null)?.events;
  if (!Array.isArray(events)) return [];

  return events.flatMap((event) => {
    const text = (event.segs ?? [])
      .map((segment) => segment.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? [{ text, start: Number(event.tStartMs) || 0, duration: Number(event.dDurationMs) || 0 }] : [];
  });
}

const readCaptionTracks = (player: unknown): CaptionTrack[] => {
  const tracks = (
    player as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
    } | null
  )?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return Array.isArray(tracks) ? tracks : [];
};

const decodeXml = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const parseTimedTextTracks = (xml: string, videoId: string): CaptionTrack[] =>
  Array.from(xml.matchAll(/<track\b([^>]*)>/g)).map((match) => {
    const attrs = Object.fromEntries(
      Array.from(match[1].matchAll(/\s([\w:-]+)="([^"]*)"/g), (attribute) => [attribute[1], decodeXml(attribute[2])]),
    );
    const url = new URL('https://www.youtube.com/api/timedtext');
    url.searchParams.set('v', videoId);
    url.searchParams.set('lang', attrs.lang_code ?? '');
    if (attrs.name) url.searchParams.set('name', attrs.name);
    if (attrs.kind) url.searchParams.set('kind', attrs.kind);
    return {
      baseUrl: url.toString(),
      languageCode: attrs.lang_code ?? '',
      kind: attrs.kind,
      name: { simpleText: attrs.name },
    };
  });

export async function fetchYouTubeTranscriptFromSources(
  videoId: string,
  preferredLang = 'en',
  fetchImpl: typeof fetch = fetch,
): Promise<TranscriptResponse | null> {
  const fetchTracks = async (tracks: CaptionTrack[]) => {
    for (const track of orderYouTubeCaptionTracks(tracks, preferredLang)) {
      try {
        const url = new URL(track.baseUrl.replace(/\\u0026/g, '&'));
        url.searchParams.set('fmt', 'json3');
        const response = await fetchImpl(url);
        if (!response.ok) continue;
        const segments = parseYouTubeJson3(await response.json());
        if (segments.length)
          return { text: segments.map((segment) => segment.text).join(' '), segments, language: track.languageCode };
      } catch {
        // Try the next track or source.
      }
    }
    return null;
  };

  const clients = [
    {
      clientName: 'IOS',
      clientVersion: '20.10.4',
      deviceMake: 'Apple',
      deviceModel: 'iPhone16,2',
      osName: 'iOS',
      osVersion: '18.3.2',
      hl: 'en',
      gl: 'US',
    },
    {
      clientName: 'ANDROID',
      clientVersion: '20.10.38',
      androidSdkVersion: 35,
      deviceMake: 'Google',
      deviceModel: 'Pixel 9 Pro',
      osName: 'Android',
      osVersion: '15',
      hl: 'en',
      gl: 'US',
    },
  ];

  for (const client of clients) {
    try {
      const response = await fetchImpl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: { client }, videoId, contentCheckOk: true, racyCheckOk: true }),
      });
      if (response.ok) {
        const result = await fetchTracks(readCaptionTracks(await response.json()));
        if (result) return result;
      }
    } catch {
      // Try the next client.
    }
  }

  try {
    const response = await fetchImpl(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
    if (response.ok) {
      const result = await fetchTracks(extractCaptionTracks(await response.text()) ?? []);
      if (result) return result;
    }
  } catch {
    // Try timed text.
  }

  try {
    const response = await fetchImpl(
      `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
    );
    if (response.ok) return await fetchTracks(parseTimedTextTracks(await response.text(), videoId));
  } catch {
    // All sources exhausted.
  }
  return null;
}

/**
 * Extract captionTracks JSON from YouTube page HTML using bracket-counting.
 * More robust than regex for nested JSON structures.
 */
function extractCaptionTracks(html: string): CaptionTrack[] | null {
  return extractJsonByMarker(html, '"captionTracks":') as CaptionTrack[] | null;
}

/**
 * Select the best caption track based on language preference.
 * Priority: preferred lang manual > preferred lang auto > any manual > first available
 */
function selectCaptionTrack(tracks: CaptionTrack[], preferredLang = 'en'): CaptionTrack | null {
  if (tracks.length === 0) return null;

  const isAutoGenerated = (track: CaptionTrack) =>
    track.kind === 'asr' || (track.name?.simpleText?.includes('auto-generated') ?? false);

  return (
    tracks.find((t) => t.languageCode === preferredLang && !isAutoGenerated(t)) ||
    tracks.find((t) => t.languageCode === preferredLang) ||
    tracks.find((t) => !isAutoGenerated(t)) ||
    tracks[0]
  );
}

/**
 * Fetch YouTube video transcript using the public API.
 * No authentication required - uses the same endpoint as the YouTube web player.
 * Supports multi-language with English preference.
 */
export async function fetchYouTubeTranscript(videoId: string, preferredLang = 'en'): Promise<TranscriptResponse> {
  const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageResponse = await fetch(videoPageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch video page: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();

  const captionTracks = extractCaptionTracks(html);
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions available for this video');
  }

  const track = selectCaptionTrack(captionTracks, preferredLang);
  if (!track) {
    throw new Error('No suitable caption track found');
  }

  const captionResponse = await fetch(track.baseUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
  }

  const captionXml = await captionResponse.text();
  const segments = parseYouTubeCaptionXml(captionXml);
  const text = segments.map((s) => s.text).join(' ');

  return {
    text,
    segments,
    language: track.languageCode,
  };
}

/**
 * Parse YouTube caption XML format
 */
function parseYouTubeCaptionXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  const matches = Array.from(xml.matchAll(textRegex));

  for (const match of matches) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    let text = match[3];

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

interface AdaptiveFormat {
  mimeType: string;
  url?: string;
  signatureCipher?: string;
  bitrate: number;
  contentLength?: string;
  approxDurationMs?: string;
}

export interface YouTubeAudioCandidate {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
  durationMs?: number;
}

/**
 * Extract JSON object from YouTube page HTML by marker string using bracket-counting.
 */
function extractJsonByMarker(html: string, marker: string): unknown | null {
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  let pos = startIdx + marker.length;
  while (pos < html.length && (html[pos] === ' ' || html[pos] === '\n')) pos++;

  const openChar = html[pos];
  const closeChar = openChar === '{' ? '}' : openChar === '[' ? ']' : null;
  if (!closeChar) return null;

  let depth = 0;
  for (let i = pos; i < html.length; i++) {
    if (html[i] === openChar) depth++;
    else if (html[i] === closeChar) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(pos, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Extract an audio-only stream URL from YouTube page HTML.
 * Uses the adaptiveFormats from ytInitialPlayerResponse.streamingData.
 * Returns the URL of the best audio-only stream (highest bitrate), or null.
 */
export function sortAudioCandidates(candidates: YouTubeAudioCandidate[]): YouTubeAudioCandidate[] {
  return candidates.filter((candidate) => Boolean(candidate.url)).sort((a, b) => b.bitrate - a.bitrate);
}

export async function extractYouTubeAudioCandidates(videoId: string): Promise<YouTubeAudioCandidate[]> {
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!pageResponse.ok) return [];
  const html = await pageResponse.text();

  const formats = extractJsonByMarker(html, '"adaptiveFormats":') as AdaptiveFormat[] | null;
  if (!formats || formats.length === 0) return [];

  const audioFormats = sortAudioCandidates(
    formats
      .filter((format) => format.mimeType.startsWith('audio/') && format.url && !format.signatureCipher)
      .map((format) => ({
        url: format.url!,
        mimeType: format.mimeType,
        bitrate: format.bitrate,
        contentLength: format.contentLength ? parseInt(format.contentLength, 10) : undefined,
        durationMs: format.approxDurationMs ? parseInt(format.approxDurationMs, 10) : undefined,
      })),
  );

  return audioFormats;
}

export async function extractYouTubeAudioUrl(
  videoId: string,
): Promise<{ url: string; contentLength?: number; durationMs?: number } | null> {
  const audioFormats = await extractYouTubeAudioCandidates(videoId);
  const best = audioFormats[0];
  if (!best) return null;
  return {
    url: best.url,
    contentLength: best.contentLength,
    durationMs: best.durationMs,
  };
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
