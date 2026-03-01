import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.m4a', '.ogg', '.flac',
  '.mp4', '.webm', '.avi',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — Whisper API limit

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        error: `Unsupported format "${ext}". Supported: MP3, WAV, M4A, OGG, FLAC, MP4, WebM, AVI`,
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large. Maximum 25MB.',
      }, { status: 400 });
    }

    const mediaDir = path.join(process.cwd(), 'public', 'media');
    await fs.mkdir(mediaDir, { recursive: true });

    // nanoid filename prevents path traversal attacks
    const fileId = nanoid();
    const filename = `${fileId}${ext}`;
    const filePath = path.join(mediaDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      audioUrl: `/media/${filename}`,
      filename: file.name,
      mimeType: file.type || `audio/${ext.slice(1)}`,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'File upload failed. Please try again.',
    }, { status: 500 });
  }
}
