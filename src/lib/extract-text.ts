import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ExtractResult {
  text: string;
  chapters?: { title: string; text: string }[];
  metadata: {
    title: string | null;
    author: string | null;
    pageCount: number | null;
    format: string;
  };
}

export const FORMAT_HANDLERS: Record<string, (buffer: Buffer) => Promise<ExtractResult>> = {
  '.pdf': extractPdf,
  '.docx': extractDocx,
  '.epub': extractEpub,
  '.txt': extractPlainText,
  '.md': extractPlainText,
  '.text': extractPlainText,
};

export function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

export async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();
  await parser.destroy();

  const chapters = splitTextIntoChapters(textResult.text);

  return {
    text: textResult.text,
    chapters: chapters.length > 1 ? chapters : undefined,
    metadata: {
      title: infoResult.info?.Title || infoResult.info?.title || null,
      author: infoResult.info?.Author || infoResult.info?.author || null,
      pageCount: chapters.length > 1 ? chapters.length : textResult.total,
      format: 'pdf',
    },
  };
}

export async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
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

export async function extractEpub(buffer: Buffer): Promise<ExtractResult> {
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

  // Build manifest map: id → href (attribute order varies across EPUBs)
  const itemMatches = [...opfContent.matchAll(/<item\s+[^>]*\/?\s*>/g)];
  const manifest = new Map<string, string>();
  for (const m of itemMatches) {
    const tag = m[0];
    const idMatch = tag.match(/\bid="([^"]+)"/);
    const hrefMatch = tag.match(/\bhref="([^"]+)"/);
    if (idMatch && hrefMatch) {
      manifest.set(idMatch[1], hrefMatch[1]);
    }
  }

  // Extract text from each chapter in spine order
  const chapters: { title: string; text: string }[] = [];
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;

    const filePath = opfDir + decodeURIComponent(href);
    const content = await zip.file(filePath)?.async('text');
    if (!content) continue;

    // Try to extract chapter title from first heading
    const titleMatch = content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const chapterTitle = titleMatch?.[1]?.trim() || `Chapter ${chapters.length + 1}`;

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

    if (plainText && plainText.split(/\s+/).length > 5) {
      chapters.push({ title: chapterTitle, text: plainText });
    }
  }

  return {
    text: chapters.map((ch) => ch.text).join('\n\n'),
    chapters,
    metadata: {
      title: titleMatch?.[1] || null,
      author: authorMatch?.[1] || null,
      pageCount: chapters.length,
      format: 'epub',
    },
  };
}

export async function extractPlainText(buffer: Buffer): Promise<ExtractResult> {
  const text = buffer.toString('utf-8');
  const chapters = splitTextIntoChapters(text);

  return {
    text,
    chapters: chapters.length > 1 ? chapters : undefined,
    metadata: {
      title: null,
      author: null,
      pageCount: chapters.length > 1 ? chapters.length : null,
      format: 'text',
    },
  };
}

export function splitTextIntoChapters(text: string): { title: string; text: string }[] {
  // Try splitting by common chapter patterns
  const chapterPattern = /^(Chapter\s+\d+[ \t:.-]*.*|CHAPTER\s+\d+[ \t:.-]*.*|第\s*\d+\s*章[ \t:.-]*.*)$/gm;
  const matches = [...text.matchAll(chapterPattern)];

  if (matches.length >= 2) {
    const chapters = extractSections(text, matches);
    if (chapters.length >= 2) return chapters;
  }

  // Try numbered section headings (e.g. "1. Introduction", "2 Related Work", "3.1 Methods")
  const sectionPattern = /^(\d+(?:\.\d+)?\.?\s+[A-Z][A-Za-z\s,&:'-]{2,60})$/gm;
  const sectionMatches = [...text.matchAll(sectionPattern)];

  if (sectionMatches.length >= 3) {
    const chapters = extractSections(text, sectionMatches);
    if (chapters.length >= 3) return chapters;
  }

  // Fallback: split by triple newlines (section breaks)
  const sections = text.split(/\n{3,}/).filter((s) => s.trim().split(/\s+/).length > 20);
  if (sections.length >= 2 && sections.length <= 100) {
    return sections.map((s, i) => {
      const lines = s.trim().split('\n');
      const firstLine = lines[0].trim();
      const isTitle = firstLine.length < 80 && lines.length > 1;
      return {
        title: isTitle ? firstLine : `Section ${i + 1}`,
        text: isTitle ? lines.slice(1).join('\n').trim() : s.trim(),
      };
    });
  }

  return [{ title: 'Full Text', text: text.trim() }];
}

function extractSections(text: string, matches: RegExpMatchArray[]): { title: string; text: string }[] {
  const chapters: { title: string; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const chapterText = text.slice(start, end).trim();
    const title = matches[i][0].trim();
    const body = chapterText.slice(title.length).trim();
    if (body.split(/\s+/).length > 10) {
      chapters.push({ title, text: body });
    }
  }
  return chapters;
}
