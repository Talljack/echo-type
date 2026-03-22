import { NextRequest, NextResponse } from 'next/server';

/**
 * Free translation endpoint using Google Translate (unofficial, no API key needed).
 * Used as the default/fallback for selection translation.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, targetLang = 'zh-CN' }: { text?: string; targetLang?: string } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Google Translate unofficial API
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: targetLang.replace('-', '_').split('_')[0]!, // zh-CN → zh
      dt: 't', // translation
      dj: '1', // JSON response
      q: text,
    });

    const url = `https://translate.googleapis.com/translate_a/single?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Google Translate error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // Extract translation from response
    // Response format: { sentences: [{ trans: "翻译", orig: "original" }, ...] }
    const sentences = data.sentences as { trans?: string; orig?: string }[] | undefined;
    const translation =
      sentences
        ?.map((s) => s.trans)
        .filter(Boolean)
        .join('') || '';

    return NextResponse.json({
      translation,
      engine: 'google-free',
    });
  } catch (error) {
    console.error('Free translate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Free translation failed' },
      { status: 500 },
    );
  }
}
