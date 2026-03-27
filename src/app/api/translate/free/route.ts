import { NextRequest, NextResponse } from 'next/server';

/**
 * Free translation endpoint using Google Translate (unofficial, no API key needed).
 * Used as the default/fallback for selection translation.
 */
export async function POST(req: NextRequest) {
  try {
    const body: { text?: string; sentences?: string[]; targetLang?: string } = await req.json();
    const { text, sentences, targetLang = 'zh-CN' } = body;

    if ((!text && (!sentences || sentences.length === 0)) || !targetLang) {
      return NextResponse.json({ error: 'Missing text/sentences or targetLang' }, { status: 400 });
    }

    const normalizedTargetLang = targetLang.replace('-', '_').split('_')[0]!;

    async function translateChunk(chunk: string): Promise<string> {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'en',
        tl: normalizedTargetLang,
        dt: 't',
        dj: '1',
        q: chunk,
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
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }

      if (!res) {
        throw new Error('Google Translate unreachable after retries');
      }

      if (!res.ok) {
        throw new Error(`Google Translate error: ${res.status}`);
      }

      const data = await res.json();
      const chunkSentences = data.sentences as { trans?: string; orig?: string }[] | undefined;
      return (
        chunkSentences
          ?.map((s) => s.trans)
          .filter(Boolean)
          .join('') || ''
      );
    }

    if (Array.isArray(sentences) && sentences.length > 0) {
      const translations = await Promise.all(sentences.map((sentence) => translateChunk(sentence)));

      return NextResponse.json({
        translations,
        engine: 'google-free',
      });
    }

    const translation = await translateChunk(text ?? '');

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
