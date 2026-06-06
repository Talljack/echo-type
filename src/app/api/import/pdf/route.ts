import { NextResponse } from 'next/server';
import { extractPdf } from '@/lib/extract-text';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractPdf(Buffer.from(arrayBuffer));

    return NextResponse.json({
      text: result.text,
      pageCount: result.metadata.pageCount,
      metadata: {
        title: result.metadata.title,
        author: result.metadata.author,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse PDF';
    console.error('PDF parse error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
