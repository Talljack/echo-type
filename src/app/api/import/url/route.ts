import { NextRequest, NextResponse } from 'next/server';
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
    console.error('URL import error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch URL';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
