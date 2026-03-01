import JSZip from 'jszip';
import mammoth from 'mammoth';
import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const FORMAT_HANDLERS: Record<string, (buffer: Buffer) => Promise<ExtractResult>> = {
  '.pdf': extractPdf,
  '.docx': extractDocx,
  '.epub': extractEpub,
  '.txt': extractPlainText,
  '.md': extractPlainText,
  '.text': extractPlainText,
};

interface ExtractResult {
  text: string;
  metadata: {
    title: string | null;
    author: string | null;
    pageCount: number | null;
    format: string;
  };
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();
  await parser.destroy();

  return {
    text: textResult.text,
    metadata: {
      title: infoResult.info?.Title || infoResult.info?.title || null,
      author: infoResult.info?.Author || infoResult.info?.author || null,
      pageCount: textResult.total,
      format: 'pdf',
    },
  };
}

async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    metadata: {
      title: null,
      author: null,
      pageCount: null,
      format: 'docx',
    },
  };
}

async function extractEpub(buffer: Buffer): Promise<ExtractResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Parse container.xml to find the .opf file
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Invalid EPUB: missing container.xml');
  }

  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!opfPathMatch) {
    throw new Error('Invalid EPUB: cannot find content.opf path');
  }

  const opfPath = opfPathMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error('Invalid EPUB: cannot read content.opf');
  }

  // Extract metadata
  const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
  const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);

  // Extract spine item IDs in reading order
  const spineMatches = [...opfContent.matchAll(/<itemref\s+idref="([^"]+)"/g)];
  const spineIds = spineMatches.map((m) => m[1]);

  // Build manifest map: id → href
  const manifestMatches = [...opfContent.matchAll(/<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*/g)];
  const manifest = new Map<string, string>();
  for (const m of manifestMatches) {
    manifest.set(m[1], m[2]);
  }

  // Extract text from each chapter in spine order
  const textParts: string[] = [];
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;

    const filePath = opfDir + decodeURIComponent(href);
    const content = await zip.file(filePath)?.async('text');
    if (!content) continue;

    // Strip HTML tags to get plain text
    const plainText = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText) textParts.push(plainText);
  }

  return {
    text: textParts.join('\n\n'),
    metadata: {
      title: titleMatch?.[1] || null,
      author: authorMatch?.[1] || null,
      pageCount: spineIds.length,
      format: 'epub',
    },
  };
}

async function extractPlainText(buffer: Buffer): Promise<ExtractResult> {
  return {
    text: buffer.toString('utf-8'),
    metadata: {
      title: null,
      author: null,
      pageCount: null,
      format: 'text',
    },
  };
}

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
