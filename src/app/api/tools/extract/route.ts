import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';

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

async function checkYtDlp(): Promise<boolean> {
  try {
    await execFileAsync('which', ['yt-dlp']);
    return true;
  } catch {
    return false;
  }
}

async function getVideoMetadata(url: string) {
  const { stdout } = await execFileAsync('yt-dlp', ['--dump-json', '--no-playlist', url], { timeout: 120_000 });
  return JSON.parse(stdout);
}

async function downloadAudio(url: string, outputPath: string) {
  await execFileAsync('yt-dlp', [
    '-x', '--audio-format', 'mp3',
    '--max-filesize', '50m',
    '--no-playlist',
    '-o', outputPath,
    url,
  ], { timeout: 120_000 });
}

async function getSubtitles(url: string): Promise<string> {
  // For YouTube, try youtube auto-subs via yt-dlp
  try {
    const tmpDir = path.join(process.cwd(), 'public', 'media');
    const subId = nanoid(8);
    const subPath = path.join(tmpDir, `sub_${subId}`);
    await execFileAsync('yt-dlp', [
      '--write-auto-sub', '--sub-lang', 'en',
      '--skip-download', '--sub-format', 'vtt',
      '--no-playlist',
      '-o', subPath,
      url,
    ], { timeout: 60_000 });

    // Find the generated subtitle file
    const files = await fs.readdir(tmpDir);
    const subFile = files.find((f) => f.startsWith(`sub_${subId}`) && (f.endsWith('.vtt') || f.endsWith('.srt')));
    if (subFile) {
      const raw = await fs.readFile(path.join(tmpDir, subFile), 'utf-8');
      // Clean up subtitle file after reading
      await fs.unlink(path.join(tmpDir, subFile)).catch(() => {});
      // Strip VTT/SRT formatting, extract text lines
      const lines = raw.split('\n')
        .filter((l) => l.trim() && !l.includes('-->') && !l.match(/^\d+$/) && !l.startsWith('WEBVTT') && !l.startsWith('Kind:') && !l.startsWith('Language:'))
        .map((l) => l.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      // Deduplicate consecutive identical lines
      const deduped: string[] = [];
      for (const line of lines) {
        if (deduped[deduped.length - 1] !== line) deduped.push(line);
      }
      return deduped.join(' ');
    }
  } catch {
    // Subtitle extraction failed, not critical
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json({
        error: `Unsupported platform. Supported: YouTube, Bilibili, TikTok, Twitter/X, Facebook, Instagram`,
      }, { status: 400 });
    }

    const hasYtDlp = await checkYtDlp();
    if (!hasYtDlp) {
      return NextResponse.json({
        error: 'yt-dlp is not installed. Please install it: brew install yt-dlp',
      }, { status: 500 });
    }

    // Ensure media directory exists
    const mediaDir = path.join(process.cwd(), 'public', 'media');
    await fs.mkdir(mediaDir, { recursive: true });

    // Get video metadata
    let metadata: { title?: string; duration?: number; thumbnail?: string } = {};
    try {
      const raw = await getVideoMetadata(url);
      metadata = { title: raw.title, duration: raw.duration, thumbnail: raw.thumbnail };
    } catch {
      metadata = { title: `${platform[1]} Import` };
    }

    // Download audio
    const audioId = nanoid();
    const audioFilename = `${audioId}.mp3`;
    const audioPath = path.join(mediaDir, audioFilename);
    try {
      await downloadAudio(url, audioPath);
    } catch (err) {
      console.error('Audio download error:', err);
      // Continue without audio — still extract subtitles
    }

    // Check if audio file was created
    let audioUrl: string | undefined;
    try {
      await fs.access(audioPath);
      audioUrl = `/media/${audioFilename}`;
    } catch {
      // Audio file not created
    }

    // Get subtitles/transcript
    const transcript = await getSubtitles(url);

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

