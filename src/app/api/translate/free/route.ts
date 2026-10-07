import { NextRequest, NextResponse } from 'next/server';

const TRANSLATION_CONCURRENCY = 4;
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { translation: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();
let rateLimitedUntil = 0;
let activeRequests = 0;
const waiting: Array<() => void> = [];

async function acquireSlot() {
  if (activeRequests < TRANSLATION_CONCURRENCY) activeRequests++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  return () => {
    const next = waiting.shift();
    if (next) next();
    else activeRequests--;
  };
}

function rateLimitError() {
  return new UpstreamTranslateError('Free translation is temporarily rate-limited.', 429);
}

class UpstreamTranslateError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'UpstreamTranslateError';
  }
}

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
      const key = JSON.stringify([chunk, normalizedTargetLang]);
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.translation;
      cache.delete(key);
      const existing = pending.get(key);
      if (existing) return existing;
      if (Date.now() < rateLimitedUntil) throw rateLimitError();

      const promise = (async () => {
        const release = await acquireSlot();
        try {
          if (Date.now() < rateLimitedUntil) throw rateLimitError();
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
            throw new UpstreamTranslateError('Google Translate unreachable after retries', 502);
          }

          if (res.status === 429) {
            const retryHeader = res.headers.get('Retry-After');
            const seconds =
              retryHeader && /^\d+$/.test(retryHeader)
                ? Number(retryHeader)
                : retryHeader
                  ? (Date.parse(retryHeader) - Date.now()) / 1000
                  : 60;
            const retrySeconds = Math.max(1, Number.isFinite(seconds) ? seconds : 60);
            rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + retrySeconds * 1000);
            throw rateLimitError();
          }
          if (!res.ok) {
            throw new UpstreamTranslateError(`Google Translate error: ${res.status}`, 502);
          }

          let data: unknown;
          try {
            data = await res.json();
          } catch {
            throw new UpstreamTranslateError('Google Translate returned invalid JSON', 502);
          }
          const chunkSentences = (data as { sentences?: { trans?: string; orig?: string }[] }).sentences;
          const translation =
            chunkSentences
              ?.map((s) => s.trans)
              .filter(Boolean)
              .join('') || '';
          if (!translation.trim()) throw new UpstreamTranslateError('Google Translate returned no translation', 502);
          cache.set(key, { translation, expiresAt: Date.now() + CACHE_TTL_MS });
          if (cache.size > 500) cache.delete(cache.keys().next().value!);
          return translation;
        } finally {
          release();
        }
      })();
      pending.set(key, promise);
      try {
        return await promise;
      } finally {
        pending.delete(key);
      }
    }

    if (Array.isArray(sentences) && sentences.length > 0) {
      const translations = new Array<string>(sentences.length);

      for (let start = 0; start < sentences.length; start += TRANSLATION_CONCURRENCY) {
        const chunk = sentences.slice(start, start + TRANSLATION_CONCURRENCY);
        const chunkTranslations = await Promise.all(
          chunk.map(async (sentence, offset) => ({
            index: start + offset,
            translation: await translateChunk(sentence),
          })),
        );

        for (const { index, translation } of chunkTranslations) {
          translations[index] = translation;
        }
      }

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
    if (error instanceof UpstreamTranslateError && error.status === 429) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
      return NextResponse.json(
        { error: error.message, code: 'translation_rate_limited' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }
    if (error instanceof UpstreamTranslateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Free translation failed' },
      { status: 500 },
    );
  }
}
