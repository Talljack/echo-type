import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

const execFileAsync = promisify(execFile);

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

async function ytDlp(args: string[], timeout = 120_000) {
  const bin = await getYtDlpPath();
  if (!bin) throw new Error('yt-dlp not found');
  return execFileAsync(bin, args, { timeout });
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
    const transcript = await getSubtitles(url, mediaDir);

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
      text: transcript || `Content imported from ${platform[1]}. No subtitles available.`,
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
