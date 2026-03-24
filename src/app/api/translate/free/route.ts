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

    let res: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        // Brief pause before retry
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }

    if (!res) {
      return NextResponse.json({ error: 'Google Translate unreachable after retries' }, { status: 502 });
    }

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
