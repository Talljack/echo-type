import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

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
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });

    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    await parser.destroy();

    return NextResponse.json({
      text: textResult.text,
      pageCount: textResult.total,
      metadata: {
        title: infoResult.info?.Title || infoResult.info?.title || null,
        author: infoResult.info?.Author || infoResult.info?.author || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse PDF';
    console.error('PDF parse error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
