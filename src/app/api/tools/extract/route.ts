import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { resolveApiKey } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import {
  buildUpstreamTranscriptionFormData,
  getTranscriptionEndpoint,
  getTranscriptionRetryDelayMs,
  MAX_TRANSCRIPTION_FILE_SIZE,
  parseUpstreamTranscriptionPayload,
  resolveTranscriptionProvider,
  shouldRetryTranscriptionStatus,
  validateTranscriptionFile,
} from '@/lib/transcription';
import {
  extractYouTubeAudioCandidates,
  extractYouTubeAudioUrl,
  extractYouTubeVideoId,
  fetchYouTubeMetadata,
  fetchYouTubeTranscript,
  type YouTubeAudioCandidate,
} from '@/lib/youtube-transcript';

const execFileAsync = promisify(execFile);

// Detect if running on Vercel
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

type TranscriptSource = 'npm-en' | 'npm-auto' | 'scraper' | 'stt-groq';

interface ExtractionMeta {
  mode: 'captions' | 'audio-transcription';
  transcriptSource: TranscriptSource;
  degraded: boolean;
  partial: boolean;
  warnings: string[];
}

interface TranscriptResult {
  text: string;
  language: string;
  duration?: number;
  transcriptSource: TranscriptSource;
}

function buildExtractionSuccessMeta(input: ExtractionMeta): ExtractionMeta {
  return input;
}

const supportedPlatforms: Record<string, string> = {
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'bilibili.com': 'Bilibili',
  'b23.tv': 'Bilibili',
  'tiktok.com': 'TikTok',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
};

function detectPlatform(url: string): [string, string] | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const entry = Object.entries(supportedPlatforms).find(([domain]) => hostname.includes(domain));
    return entry ? [entry[0], entry[1]] : null;
  } catch {
    return null;
  }
}

function isYouTubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

/** Resolve the yt-dlp binary path, checking common install locations */
async function resolveYtDlpPath(): Promise<string | null> {
  // Check PATH first
  try {
    const { stdout } = await execFileAsync('which', ['yt-dlp']);
    return stdout.trim();
  } catch {
    /* not in PATH */
  }

  // Check common install locations
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Library/Python/3.10/bin/yt-dlp'),
    path.join(home, 'Library/Python/3.11/bin/yt-dlp'),
    path.join(home, 'Library/Python/3.12/bin/yt-dlp'),
    path.join(home, 'Library/Python/3.13/bin/yt-dlp'),
    path.join(home, '.local/bin/yt-dlp'),
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      /* not found */
    }
  }

  return null;
}

let cachedYtDlpPath: string | null | undefined;

async function getYtDlpPath(): Promise<string | null> {
  if (cachedYtDlpPath !== undefined) return cachedYtDlpPath;
  cachedYtDlpPath = await resolveYtDlpPath();
  return cachedYtDlpPath;
}

/**
 * Resolve yt-dlp cookie args for YouTube authentication.
 * Checks: YT_COOKIES_PATH env → YT_COOKIES_BROWSER env → ~/.config/yt-dlp/cookies.txt
 */
async function getYtDlpCookieArgs(): Promise<string[]> {
  const cookiePath = process.env.YT_COOKIES_PATH;
  if (cookiePath) {
    try {
      await fs.access(cookiePath);
      return ['--cookies', cookiePath];
    } catch {
      /* file not found */
    }
  }

  const cookieBrowser = process.env.YT_COOKIES_BROWSER;
  if (cookieBrowser) {
    return ['--cookies-from-browser', cookieBrowser];
  }

  // Check default location
  const defaultPath = path.join(os.homedir(), '.config', 'yt-dlp', 'cookies.txt');
  try {
    await fs.access(defaultPath);
    return ['--cookies', defaultPath];
  } catch {
    return [];
  }
}

async function ytDlp(args: string[], timeout = 120_000) {
  const bin = await getYtDlpPath();
  if (!bin) throw new Error('yt-dlp not found');
  const cookieArgs = await getYtDlpCookieArgs();
  return execFileAsync(bin, [...cookieArgs, ...args], { timeout });
}

async function getVideoMetadata(url: string) {
  const { stdout } = await ytDlp(['--dump-json', '--no-playlist', url]);
  return JSON.parse(stdout);
}

async function downloadAudio(url: string, outputPath: string) {
  await ytDlp(['-x', '--audio-format', 'mp3', '--max-filesize', '50m', '--no-playlist', '-o', outputPath, url]);
}

function cleanVttText(raw: string): string {
  const lines = raw
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return (
        t &&
        !t.includes('-->') &&
        !/^\d+$/.test(t) &&
        !t.startsWith('WEBVTT') &&
        !t.startsWith('Kind:') &&
        !t.startsWith('Language:')
      );
    })
    .map((l) =>
      l
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim(),
    )
    .filter(Boolean);

  // Deduplicate consecutive identical lines
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line);
  }
  return deduped.join(' ');
}

async function getSubtitles(url: string, mediaDir: string): Promise<string> {
  try {
    const subId = nanoid(8);
    const subPath = path.join(mediaDir, `sub_${subId}`);
    // Use both --write-sub and --write-auto-sub to catch manual and auto-generated captions
    await ytDlp(
      [
        '--write-sub',
        '--write-auto-sub',
        '--sub-lang',
        'en',
        '--skip-download',
        '--sub-format',
        'vtt',
        '--no-playlist',
        '--ignore-no-formats-error',
        '-o',
        subPath,
        url,
      ],
      60_000,
    );

    const files = await fs.readdir(mediaDir);
    const subFile = files.find((f) => f.startsWith(`sub_${subId}`) && (f.endsWith('.vtt') || f.endsWith('.srt')));
    if (subFile) {
      const raw = await fs.readFile(path.join(mediaDir, subFile), 'utf-8');
      await fs.unlink(path.join(mediaDir, subFile)).catch(() => {});
      return cleanVttText(raw);
    }
  } catch {
    // Subtitle extraction failed, not critical
  }
  return '';
}

/** Fetch YouTube video title via oEmbed API (no auth required) */
async function getYouTubeTitle(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const data = await res.json();
      return data.title || null;
    }
  } catch {
    /* non-critical */
  }
  return null;
}

/**
 * Fetch YouTube transcript with multi-method fallback chain:
 * 1. youtube-transcript npm package (English)
 * 2. youtube-transcript npm package (default/any language)
 * 3. Custom HTML scraper (English preferred, falls back to any)
 */
async function fetchTranscriptWithFallback(videoId: string): Promise<TranscriptResult> {
  const errors: string[] = [];

  // Method 1: npm package with English
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (transcript && transcript.length > 0) {
      const text = transcript.map((s) => s.text).join(' ');
      const last = transcript[transcript.length - 1];
      return {
        text,
        language: 'en',
        duration: (last.offset + last.duration) / 1000,
        transcriptSource: 'npm-en',
      };
    }
  } catch (e) {
    errors.push(`npm-en: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Method 2: npm package with default language
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcript && transcript.length > 0) {
      const text = transcript.map((s) => s.text).join(' ');
      const last = transcript[transcript.length - 1];
      return {
        text,
        language: 'auto',
        duration: (last.offset + last.duration) / 1000,
        transcriptSource: 'npm-auto',
      };
    }
  } catch (e) {
    errors.push(`npm-auto: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  // Method 3: Custom scraper (English preferred, falls back to any language)
  try {
    const result = await fetchYouTubeTranscript(videoId);
    const last = result.segments.length > 0 ? result.segments[result.segments.length - 1] : null;
    return {
      text: result.text,
      language: result.language,
      duration: last ? last.start + last.duration : undefined,
      transcriptSource: 'scraper',
    };
  } catch (e) {
    errors.push(`scraper: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  throw new Error(`Could not extract transcript. Tried 3 methods:\n${errors.join('\n')}`);
}

function getTranscriptionExtension(contentType: string | null): string {
  if (!contentType) return 'mp3';
  if (contentType.includes('audio/webm')) return 'webm';
  if (contentType.includes('audio/mpeg')) return 'mp3';
  if (contentType.includes('audio/wav')) return 'wav';
  if (contentType.includes('audio/ogg')) return 'ogg';
  if (contentType.includes('audio/flac')) return 'flac';
  if (contentType.includes('audio/mp4')) return 'm4a';
  return 'mp3';
}

async function downloadYouTubeAudioFile(
  audioUrl: string,
  videoId: string,
  expectedContentLength?: number,
): Promise<File> {
  if (expectedContentLength && expectedContentLength > MAX_TRANSCRIPTION_FILE_SIZE) {
    throw new Error('YouTube audio is too large for AI transcription. Try a shorter clip or local upload.');
  }

  const response = await fetch(audioUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube audio: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  const contentLength = Number(response.headers.get('content-length') || expectedContentLength || 0);
  if (contentLength && contentLength > MAX_TRANSCRIPTION_FILE_SIZE) {
    throw new Error('YouTube audio is too large for AI transcription. Try a shorter clip or local upload.');
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength > MAX_TRANSCRIPTION_FILE_SIZE) {
    throw new Error('YouTube audio is too large for AI transcription. Try a shorter clip or local upload.');
  }

  const extension = getTranscriptionExtension(contentType);
  const file = new File([audioBuffer], `youtube-${videoId}.${extension}`, {
    type: contentType || 'audio/mpeg',
  });

  const validation = validateTranscriptionFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return file;
}

async function transcribeYouTubeAudioFile(
  file: File,
  headers: Headers,
): Promise<{
  text: string;
  language: string;
  duration?: number;
}> {
  const resolution = resolveTranscriptionProvider('groq', {}, headers);
  const apiKey = resolveApiKey(resolution.providerId, headers);

  if (!apiKey) {
    throw new Error('AI transcription is not configured on this deployment.');
  }

  const rateLimit = await enforcePlatformRateLimit({
    headers,
    capability: 'transcribe',
    resolution,
  });
  if (!rateLimit.ok) {
    throw new Error(rateLimit.message);
  }

  let upstreamResponse: Response | null = null;
  let transcription: Awaited<ReturnType<typeof parseUpstreamTranscriptionPayload>> | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    upstreamResponse = await fetch(getTranscriptionEndpoint(resolution.providerId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: buildUpstreamTranscriptionFormData(file, resolution.providerId, 'en'),
    });

    transcription = await parseUpstreamTranscriptionPayload(upstreamResponse);

    if (upstreamResponse.ok) {
      break;
    }

    if (!shouldRetryTranscriptionStatus(upstreamResponse.status) || attempt === 1) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, getTranscriptionRetryDelayMs(attempt)));
  }

  if (!upstreamResponse || !transcription) {
    throw new Error('AI transcription did not produce a response.');
  }

  if (!upstreamResponse.ok) {
    throw new Error(transcription.error?.message || 'AI transcription failed.');
  }

  const segments = transcription.segments ?? [];
  const duration = segments.length > 0 ? segments[segments.length - 1]?.end : undefined;
  const text = transcription.text?.trim();

  if (!text) {
    throw new Error('AI transcription returned empty text.');
  }

  return {
    text,
    language: transcription.language || 'en',
    duration,
  };
}

async function resolveYouTubeAudioCandidates(videoId: string): Promise<YouTubeAudioCandidate[]> {
  let candidates: YouTubeAudioCandidate[] | null = null;
  try {
    const result = await extractYouTubeAudioCandidates(videoId);
    candidates = Array.isArray(result) ? result : null;
  } catch {
    candidates = null;
  }
  if (Array.isArray(candidates) && candidates.length > 0) {
    return candidates;
  }

  if (candidates !== null) {
    return [];
  }

  let audio: { url: string; contentLength?: number; durationMs?: number } | null = null;
  try {
    const result = await extractYouTubeAudioUrl(videoId);
    audio = result && typeof result.url === 'string' ? result : null;
  } catch {
    audio = null;
  }
  if (!audio?.url) {
    return [];
  }

  return [
    {
      url: audio.url,
      mimeType: 'audio/mpeg',
      bitrate: 0,
      contentLength: audio.contentLength,
      durationMs: audio.durationMs,
    },
  ];
}

async function transcribeYouTubeAudioFallback(videoId: string, headers: Headers) {
  const audioCandidates = await resolveYouTubeAudioCandidates(videoId);
  if (audioCandidates.length === 0) {
    throw new Error('No downloadable audio stream available for this video');
  }

  let lastError: unknown = null;

  for (const audio of audioCandidates) {
    try {
      const file = await downloadYouTubeAudioFile(audio.url, videoId, audio.contentLength);
      const transcript = await transcribeYouTubeAudioFile(file, headers);

      return {
        ...transcript,
        duration: transcript.duration ?? (audio.durationMs ? audio.durationMs / 1000 : undefined),
        extractionMeta: buildExtractionSuccessMeta({
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: false,
          warnings: [],
        }),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Audio transcription fallback failed.');
}

/**
 * Extract YouTube content using the public transcript API (Vercel-compatible)
 * No yt-dlp required, no API key required
 */
async function extractYouTubeWithTranscriptAPI(url: string, headers: Headers) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const metadata = await fetchYouTubeMetadata(url).catch(() => ({ title: 'YouTube Import' }));

  try {
    const transcript = await fetchTranscriptWithFallback(videoId);
    return {
      title: metadata.title,
      text: transcript.text,
      platform: 'youtube',
      sourceUrl: url,
      audioUrl: undefined,
      videoDuration: transcript.duration,
      extractionMeta: buildExtractionSuccessMeta({
        mode: 'captions',
        transcriptSource: transcript.transcriptSource,
        degraded: false,
        partial: false,
        warnings: [],
      }),
    };
  } catch (transcriptError) {
    try {
      const result = await transcribeYouTubeAudioFallback(videoId, headers);
      return {
        title: metadata.title,
        text: result.text,
        platform: 'youtube',
        sourceUrl: url,
        audioUrl: undefined,
        videoDuration: result.duration,
        extractionMeta: result.extractionMeta,
      };
    } catch (audioFallbackError) {
      const transcriptMessage =
        transcriptError instanceof Error ? transcriptError.message : 'Transcript extraction failed';
      const fallbackMessage =
        audioFallbackError instanceof Error ? audioFallbackError.message : 'Audio transcription fallback failed';
      throw new Error(`${transcriptMessage}\n\nAudio fallback failed: ${fallbackMessage}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        {
          error: `Unsupported platform. Supported: YouTube, Bilibili, TikTok, Twitter/X, Facebook, Instagram`,
        },
        { status: 400 },
      );
    }

    // --- Vercel environment: Use YouTube Transcript API (YouTube only) ---
    if (IS_VERCEL) {
      if (isYouTubeUrl(url)) {
        try {
          const result = await extractYouTubeWithTranscriptAPI(url, req.headers);
          return NextResponse.json(result);
        } catch (error) {
          console.error('YouTube transcript API error:', error);
          return NextResponse.json(
            {
              error: error instanceof Error ? error.message : 'Failed to extract YouTube content',
              hint: 'This video may not have captions available. Try using Local Upload with audio file for AI transcription.',
            },
            { status: 500 },
          );
        }
      } else {
        // Non-YouTube platforms not supported on Vercel
        return NextResponse.json(
          {
            error: `${platform[1]} extraction is not available in the cloud version. Only YouTube is supported.`,
            hint: 'For local development, install yt-dlp to enable all platforms.',
          },
          { status: 501 },
        );
      }
    }

    // --- Local environment: Use yt-dlp (all platforms) ---
    const ytDlpPath = await getYtDlpPath();

    if (!ytDlpPath) {
      // No yt-dlp available at all — try oEmbed title for YouTube as minimal fallback
      if (isYouTubeUrl(url)) {
        const title = await getYouTubeTitle(url);
        return NextResponse.json(
          {
            error: `yt-dlp is not installed. Please install it: pip3 install yt-dlp`,
            title: title || 'YouTube Import',
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error: 'yt-dlp is not installed. Please install it: pip3 install yt-dlp',
        },
        { status: 500 },
      );
    }

    // --- yt-dlp available ---

    const mediaDir = path.join(process.cwd(), 'public', 'media');
    await fs.mkdir(mediaDir, { recursive: true });

    // Get subtitles (works for YouTube and other platforms)
    let transcript = await getSubtitles(url, mediaDir);

    // If yt-dlp subtitles are empty and it's YouTube, fall back to transcript API
    if (!transcript && isYouTubeUrl(url)) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        try {
          const result = await fetchTranscriptWithFallback(videoId);
          transcript = result.text;
        } catch {
          // Continue without transcript
        }
      }
    }

    // Get video metadata
    let metadata: { title?: string; duration?: number; thumbnail?: string } = {};
    try {
      const raw = await getVideoMetadata(url);
      metadata = { title: raw.title, duration: raw.duration, thumbnail: raw.thumbnail };
    } catch {
      // For YouTube, try oEmbed as fallback for title
      if (isYouTubeUrl(url)) {
        const title = await getYouTubeTitle(url);
        metadata = { title: title || `${platform[1]} Import` };
      } else {
        metadata = { title: `${platform[1]} Import` };
      }
    }

    // Download audio
    const audioId = nanoid();
    const audioFilename = `${audioId}.mp3`;
    const audioPath = path.join(mediaDir, audioFilename);
    let audioUrl: string | undefined;
    try {
      await downloadAudio(url, audioPath);
      await fs.access(audioPath);
      audioUrl = `/media/${audioFilename}`;
    } catch (err) {
      console.error('Audio download error:', err);
      // Continue without audio
    }

    return NextResponse.json({
      title: metadata.title || `${platform[1]} Import`,
      text:
        transcript ||
        `Content imported from ${platform[1]}. No subtitles were extracted — try Local Upload with the audio file for AI transcription.`,
      platform: platform[1].toLowerCase(),
      sourceUrl: url,
      audioUrl,
      videoDuration: metadata.duration,
    });
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
