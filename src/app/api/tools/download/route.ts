import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

const execFileAsync = promisify(execFile);

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

async function getVideoTitle(url: string): Promise<string> {
  try {
    const { stdout } = await ytDlp(['--get-title', '--no-playlist', url], 30_000);
    return stdout.trim();
  } catch {
    return 'download';
  }
}

async function downloadMedia(url: string, format: 'audio' | 'video', outputPath: string) {
  if (format === 'audio') {
    await ytDlp(
      ['-x', '--audio-format', 'mp3', '--max-filesize', '50m', '--no-playlist', '-o', outputPath, url],
      120_000,
    );
  } else {
    await ytDlp(
      ['-f', 'best[ext=mp4]/best', '--max-filesize', '100m', '--no-playlist', '-o', outputPath, url],
      300_000,
    );
  }
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  let format: 'audio' | 'video' = 'audio';

  try {
    const body = await req.json();
    const { url } = body;
    format = body.format;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }

    if (format !== 'audio' && format !== 'video') {
      return NextResponse.json({ error: 'Invalid format. Must be "audio" or "video"' }, { status: 400 });
    }

    const ytDlpPath = await getYtDlpPath();
    if (!ytDlpPath) {
      return NextResponse.json(
        {
          error: 'yt-dlp is not installed. Please install it: pip3 install yt-dlp',
        },
        { status: 500 },
      );
    }

    // Get video title for filename
    const title = await getVideoTitle(url);
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 50) || 'download';

    // Create temp file path
    const tempDir = os.tmpdir();
    const fileId = nanoid();
    const extension = format === 'audio' ? 'mp3' : 'mp4';
    tempFilePath = path.join(tempDir, `${fileId}.${extension}`);

    // Download media
    await downloadMedia(url, format, tempFilePath);

    // Verify file exists
    await fs.access(tempFilePath);
    const stats = await fs.stat(tempFilePath);

    // Stream file to client
    const fileStream = createReadStream(tempFilePath);
    const contentType = format === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const filename = `${sanitizedTitle}.${extension}`;

    return new NextResponse(fileStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Download error:', error);

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {
        /* ignore cleanup errors */
      }
    }

    // Parse error messages
    const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
    if (errorMessage.includes('File is larger than max-filesize')) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${format === 'audio' ? '50MB' : '100MB'}`,
        },
        { status: 400 },
      );
    }
    if (errorMessage.includes('Private video') || errorMessage.includes('members-only')) {
      return NextResponse.json({ error: 'Video is private or restricted' }, { status: 400 });
    }
    if (errorMessage.includes('not available')) {
      return NextResponse.json({ error: 'Content not available in your region' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Download failed. Please try again.' }, { status: 500 });
  } finally {
    // Clean up temp file after streaming
    if (tempFilePath) {
      setTimeout(async () => {
        try {
          await fs.unlink(tempFilePath!);
        } catch {
          /* ignore cleanup errors */
        }
      }, 5000); // Wait 5s to ensure streaming completes
    }
  }
}
