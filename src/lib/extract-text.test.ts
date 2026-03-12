import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractEpub,
  extractPlainText,
  getExtension,
  splitTextIntoChapters,
} from './extract-text';

const EPUB_PATH = path.resolve(__dirname, '../../test-data/little-prince.epub');

describe('getExtension', () => {
  it('extracts file extension in lowercase', () => {
    expect(getExtension('file.EPUB')).toBe('.epub');
    expect(getExtension('doc.PDF')).toBe('.pdf');
    expect(getExtension('notes.txt')).toBe('.txt');
  });

  it('returns empty string for files without extension', () => {
    expect(getExtension('README')).toBe('');
  });

  it('handles dotfiles and multiple dots', () => {
    expect(getExtension('archive.tar.gz')).toBe('.gz');
    expect(getExtension('.hidden.txt')).toBe('.txt');
  });
});

describe('splitTextIntoChapters', () => {
  it('splits text by "Chapter N" pattern', () => {
    const text = [
      'Chapter 1 Introduction',
      'This is the first chapter with enough words to pass the threshold of ten words minimum requirement.',
      'Chapter 2 The Journey',
      'This is the second chapter with enough words to pass the threshold of ten words minimum requirement.',
    ].join('\n');

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('Chapter 1 Introduction');
    expect(chapters[1].title).toBe('Chapter 2 The Journey');
  });

  it('splits text by "CHAPTER N" pattern', () => {
    const text = [
      'CHAPTER 1',
      'First chapter body with enough words to pass the threshold of ten words minimum requirement.',
      'CHAPTER 2',
      'Second chapter body with enough words to pass the threshold of ten words minimum requirement.',
    ].join('\n');

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('CHAPTER 1');
  });

  it('splits Chinese chapter markers', () => {
    const text = [
      '第 1 章 开始',
      'This is the first chapter body with enough English words to pass the ten word minimum threshold requirement.',
      '第 2 章 继续',
      'This is the second chapter body with enough English words to pass the ten word minimum threshold requirement.',
    ].join('\n');

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toContain('第 1 章');
  });

  it('splits numbered section headings (academic papers)', () => {
    const text = [
      '1 Introduction',
      'This is the introduction section with enough words to pass the ten word minimum threshold for detection.',
      '2 Related Work',
      'This section covers related work with enough words to pass the ten word minimum threshold for detection.',
      '3 Methods',
      'This section covers the methodology with enough words to pass the ten word minimum threshold for detection.',
    ].join('\n');

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('1 Introduction');
    expect(chapters[1].title).toBe('2 Related Work');
    expect(chapters[2].title).toBe('3 Methods');
  });

  it('splits dotted section headings', () => {
    const text = [
      '1. Introduction',
      'This is the introduction section with enough words to pass the ten word minimum threshold for detection.',
      '2. Background',
      'This section covers background with enough words to pass the ten word minimum threshold for detection.',
      '3. Experimental Setup',
      'This section covers the experiments with enough words to pass the ten word minimum threshold for detection.',
    ].join('\n');

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('1. Introduction');
  });

  it('falls back to triple-newline section breaks', () => {
    const section = 'This is a section with more than twenty words to pass the filter. '.repeat(3);
    const text = `${section}\n\n\n${section}`;

    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(2);
  });

  it('returns single "Full Text" entry for undivided text', () => {
    const text = 'Short text without chapters.';
    const chapters = splitTextIntoChapters(text);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('Full Text');
  });
});

describe('extractPlainText', () => {
  it('extracts text and detects chapters', () => {
    const text = [
      'Chapter 1: The Beginning',
      'Once upon a time there was a story that had enough words to pass the ten word threshold for chapter detection.',
      'Chapter 2: The Middle',
      'The story continued with more words and events that were interesting enough to keep the reader engaged beyond ten.',
    ].join('\n');

    return extractPlainText(Buffer.from(text)).then((result) => {
      expect(result.text).toBe(text);
      expect(result.chapters).toHaveLength(2);
      expect(result.metadata.format).toBe('text');
      expect(result.metadata.pageCount).toBe(2);
    });
  });

  it('returns no chapters for simple text', () => {
    return extractPlainText(Buffer.from('Hello world')).then((result) => {
      expect(result.text).toBe('Hello world');
      expect(result.chapters).toBeUndefined();
      expect(result.metadata.pageCount).toBeNull();
    });
  });
});

describe('extractEpub — The Little Prince', () => {
  let epubBuffer: Buffer;

  // Skip all tests if the EPUB file doesn't exist
  const skipIfNoFile = fs.existsSync(EPUB_PATH) ? it : it.skip;

  try {
    if (fs.existsSync(EPUB_PATH)) {
      epubBuffer = fs.readFileSync(EPUB_PATH);
    }
  } catch {
    // Will skip tests below
  }

  skipIfNoFile('extracts text from EPUB', async () => {
    const result = await extractEpub(epubBuffer);

    expect(result.text.length).toBeGreaterThan(10000);
    expect(result.metadata.format).toBe('epub');
  });

  skipIfNoFile('detects chapters', async () => {
    const result = await extractEpub(epubBuffer);

    expect(result.chapters).toBeDefined();
    expect(result.chapters!.length).toBeGreaterThanOrEqual(27);
    expect(result.metadata.pageCount).toBe(result.chapters!.length);
  });

  skipIfNoFile('extracts word count > 10000', async () => {
    const result = await extractEpub(epubBuffer);
    const wordCount = result.text.split(/\s+/).filter(Boolean).length;

    expect(wordCount).toBeGreaterThan(10000);
  });

  skipIfNoFile('each chapter has a title and non-empty text', async () => {
    const result = await extractEpub(epubBuffer);

    for (const ch of result.chapters!) {
      expect(ch.title).toBeTruthy();
      expect(ch.text.length).toBeGreaterThan(0);
      expect(ch.text.split(/\s+/).length).toBeGreaterThan(5);
    }
  });

  skipIfNoFile('chapters are in reading order', async () => {
    const result = await extractEpub(epubBuffer);

    // The first chapter should be the notice/intro, not a later chapter
    const firstChapterText = result.chapters![0].text.toLowerCase();
    expect(
      firstChapterText.includes('notice') ||
      firstChapterText.includes('little prince') ||
      firstChapterText.includes('page 0') ||
      result.chapters![0].title.includes('Chapter')
    ).toBe(true);
  });

  skipIfNoFile('combined text equals joined chapters', async () => {
    const result = await extractEpub(epubBuffer);

    const joined = result.chapters!.map((ch) => ch.text).join('\n\n');
    expect(result.text).toBe(joined);
  });

  skipIfNoFile('handles href-before-id attribute order in manifest', async () => {
    // This was the bug: EPUBs with <item href="..." id="..."> instead of <item id="..." href="...">
    // should still extract correctly. The Little Prince EPUB has this attribute order.
    const result = await extractEpub(epubBuffer);

    expect(result.chapters!.length).toBeGreaterThan(0);
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe('extractEpub — synthetic EPUB', () => {
  async function createTestEpub(opts: {
    title?: string;
    author?: string;
    attrOrder?: 'id-first' | 'href-first';
    chapters: { id: string; href: string; html: string }[];
  }): Promise<Buffer> {
    const zip = new (await import('jszip')).default();
    zip.file('mimetype', 'application/epub+zip');
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile media-type="application/oebps-package+xml" full-path="OEBPS/content.opf"/>
  </rootfiles>
</container>`,
    );

    const titleXml = opts.title ? `<dc:title>${opts.title}</dc:title>` : '';
    const authorXml = opts.author ? `<dc:creator>${opts.author}</dc:creator>` : '';
    const manifestItems = opts.chapters
      .map((ch) => {
        if (opts.attrOrder === 'href-first') {
          return `<item href="${ch.href}" id="${ch.id}" media-type="application/xhtml+xml"/>`;
        }
        return `<item id="${ch.id}" href="${ch.href}" media-type="application/xhtml+xml"/>`;
      })
      .join('\n    ');
    const spineItems = opts.chapters.map((ch) => `<itemref idref="${ch.id}"/>`).join('\n    ');

    zip.file(
      'OEBPS/content.opf',
      `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${titleXml}
    ${authorXml}
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`,
    );

    for (const ch of opts.chapters) {
      zip.file(`OEBPS/${ch.href}`, ch.html);
    }

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    return buf;
  }

  it('extracts metadata (title and author)', async () => {
    const epub = await createTestEpub({
      title: 'Test Book',
      author: 'Test Author',
      chapters: [
        { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><h1>Intro</h1><p>Word one two three four five six.</p></body></html>' },
        { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><h1>Main</h1><p>Word one two three four five six.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.metadata.title).toBe('Test Book');
    expect(result.metadata.author).toBe('Test Author');
  });

  it('handles href-before-id attribute order', async () => {
    const epub = await createTestEpub({
      attrOrder: 'href-first',
      chapters: [
        { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><p>Chapter one text with enough words to pass threshold check.</p></body></html>' },
        { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><p>Chapter two text with enough words to pass threshold check.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.chapters).toHaveLength(2);
    expect(result.text).toContain('Chapter one');
    expect(result.text).toContain('Chapter two');
  });

  it('handles id-before-href attribute order', async () => {
    const epub = await createTestEpub({
      attrOrder: 'id-first',
      chapters: [
        { id: 'c1', href: 'c1.xhtml', html: '<html><body><p>First chapter content with more than five words needed.</p></body></html>' },
        { id: 'c2', href: 'c2.xhtml', html: '<html><body><p>Second chapter content with more than five words needed.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.chapters).toHaveLength(2);
  });

  it('extracts chapter titles from headings', async () => {
    const epub = await createTestEpub({
      chapters: [
        { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><h1>My First Chapter</h1><p>Some text with more than five words in it.</p></body></html>' },
        { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><h2>Second Part</h2><p>More text with more than five words in it.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.chapters![0].title).toBe('My First Chapter');
    expect(result.chapters![1].title).toBe('Second Part');
  });

  it('generates fallback titles when no headings exist', async () => {
    const epub = await createTestEpub({
      chapters: [
        { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><p>Just a paragraph with more than five words for testing.</p></body></html>' },
        { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><p>Another paragraph with more than five words for testing.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.chapters![0].title).toBe('Chapter 1');
    expect(result.chapters![1].title).toBe('Chapter 2');
  });

  it('strips HTML tags and decodes entities', async () => {
    const epub = await createTestEpub({
      chapters: [
        {
          id: 'ch1',
          href: 'ch1.xhtml',
          html: '<html><body><p>Tom &amp; Jerry said &quot;hello&quot; and 5 &gt; 3 &lt; 10</p></body></html>',
        },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.text).toContain('Tom & Jerry');
    expect(result.text).toContain('"hello"');
    expect(result.text).toContain('5 > 3 < 10');
  });

  it('strips style and script tags', async () => {
    const epub = await createTestEpub({
      chapters: [
        {
          id: 'ch1',
          href: 'ch1.xhtml',
          html: '<html><head><style>body{color:red}</style></head><body><script>alert("x")</script><p>Visible text only with more than five words here.</p></body></html>',
        },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.text).not.toContain('color:red');
    expect(result.text).not.toContain('alert');
    expect(result.text).toContain('Visible text only');
  });

  it('skips chapters with fewer than 5 words', async () => {
    const epub = await createTestEpub({
      chapters: [
        { id: 'ch1', href: 'ch1.xhtml', html: '<html><body><p>Too short</p></body></html>' },
        { id: 'ch2', href: 'ch2.xhtml', html: '<html><body><p>This chapter has enough words to pass the five word minimum.</p></body></html>' },
      ],
    });

    const result = await extractEpub(epub);
    expect(result.chapters).toHaveLength(1);
    expect(result.text).toContain('enough words');
  });

  it('throws on missing container.xml', async () => {
    const JSZipModule = await import('jszip');
    const zip = new JSZipModule.default();
    zip.file('mimetype', 'application/epub+zip');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(extractEpub(buf)).rejects.toThrow('Invalid EPUB: missing container.xml');
  });

  it('handles URL-encoded href values', async () => {
    const epub = await createTestEpub({
      chapters: [
        {
          id: 'ch1',
          href: 'chapter%201.xhtml',
          html: '<html><body><p>Content from a file with spaces in its name has more than five words.</p></body></html>',
        },
      ],
    });

    // The file is stored with the decoded name
    const JSZipModule = await import('jszip');
    const zip = await JSZipModule.default.loadAsync(epub);
    zip.remove('OEBPS/chapter%201.xhtml');
    zip.file('OEBPS/chapter 1.xhtml', '<html><body><p>Content from a file with spaces in its name has more than five words.</p></body></html>');
    const fixedBuf = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await extractEpub(fixedBuf);
    expect(result.chapters).toHaveLength(1);
    expect(result.text).toContain('spaces in its name');
  });
});
