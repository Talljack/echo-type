import { NextResponse } from 'next/server';
import { FORMAT_HANDLERS, getExtension } from '@/lib/extract-text';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be under 20MB' }, { status: 400 });
    }

    const ext = getExtension(file.name);
    const handler = FORMAT_HANDLERS[ext];

    if (!handler) {
      const supported = Object.keys(FORMAT_HANDLERS).join(', ');
      return NextResponse.json({ error: `Unsupported format "${ext}". Supported: ${supported}` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await handler(buffer);

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      text: result.text,
      chapters: result.chapters,
      metadata: {
        ...result.metadata,
        sourceFilename: file.name,
      },
      wordCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract text';
    console.error('Text extraction error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
