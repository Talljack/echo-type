import { NextRequest, NextResponse } from 'next/server';
import { describeImportError } from '@/lib/import-error';
import { fetchWebPageContent } from '@/lib/web-page';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url }: { url: string } = await req.json();

    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await fetchWebPageContent(url.trim());

    return NextResponse.json({
      title: result.title,
      text: result.text,
      url: result.url,
      wordCount: result.text.split(/\s+/).filter(Boolean).length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch URL';
    const upstream = Number(msg.match(/Failed to fetch page \((\d{3})\)/)?.[1]);
    const denied = upstream === 401 || upstream === 403;
    const status = denied ? 403 : upstream === 429 ? 429 : 502;
    return NextResponse.json(
      {
        error: describeImportError(error),
        retryExhausted: msg.startsWith('URL automatic retries exhausted'),
        code: denied ? 'source_forbidden' : upstream === 429 ? 'source_rate_limited' : 'source_unreachable',
      },
      { status },
    );
  }
}
