# Vercel YouTube Fallback Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase Vercel YouTube import success rate by adding multi-candidate audio fallback, structured extraction metadata, provider failover, and degraded-success UI messaging.

**Architecture:** Keep the existing `/api/tools/extract` Vercel path, but split it into focused helpers. The route should attempt captions first, then alternate audio candidates, then transcription provider fallback, and finally return structured success or failure metadata that the import UI can render clearly.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, existing transcription/provider resolver utilities, existing i18n JSON dictionaries.

---

## File Structure

- Modify: `src/app/api/tools/extract/route.ts`
  Keep as orchestration only. Add structured response builders, audio candidate retry loop, and provider fallback.
- Modify: `src/lib/youtube-transcript.ts`
  Expand from single best audio URL extraction to ordered audio candidate extraction.
- Modify: `src/components/import/media-import.tsx`
  Render degraded-success and partial-success warnings while preserving save flow.
- Modify: `src/lib/i18n/messages/library/en.json`
  Add new English copy for degraded and partial import banners.
- Modify: `src/lib/i18n/messages/library/zh.json`
  Add matching Chinese copy.
- Modify: `src/app/api/tools/extract/route.test.ts`
  Add regression coverage for transcript success, second-candidate recovery, provider fallback, and structured failures.
- Create: `src/lib/youtube-transcript.test.ts`
  Add deterministic tests for candidate ordering and filtering.
- Create: `src/components/import/media-import.test.tsx`
  Add rendering coverage for degraded and partial success states.

### Task 1: Lock The API Contract With Failing Tests

**Files:**
- Modify: `src/app/api/tools/extract/route.test.ts`
- Create: `src/lib/youtube-transcript.test.ts`
- Create: `src/components/import/media-import.test.tsx`
- Test: `src/app/api/tools/extract/route.test.ts`
- Test: `src/lib/youtube-transcript.test.ts`
- Test: `src/components/import/media-import.test.tsx`

- [ ] **Step 1: Extend route tests with the next failing scenarios**

```ts
it('returns captions metadata when transcript extraction succeeds before audio fallback', async () => {
  extractYouTubeVideoIdMock.mockReturnValue('captions-ok');
  fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Captions Win' });
  fetchTranscriptMock.mockResolvedValue([{ text: 'Hello world', offset: 0, duration: 1200 }]);

  const { NextRequest } = await import('next/server');
  const { POST } = await import('./route');

  const response = await POST(
    new NextRequest('http://localhost/api/tools/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=captions-ok' }),
    }),
  );

  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.extractionMeta).toEqual({
    mode: 'captions',
    transcriptSource: 'npm-en',
    degraded: false,
    partial: false,
    warnings: [],
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('retries a second audio candidate after the first one fails', async () => {
  extractYouTubeVideoIdMock.mockReturnValue('audio-candidates');
  fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Candidate Retry' });
  fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
  fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
  extractYouTubeAudioCandidatesMock.mockResolvedValue([
    { url: 'https://cdn.example.com/first.m4a', mimeType: 'audio/mp4', bitrate: 128000, contentLength: 3 },
    { url: 'https://cdn.example.com/second.m4a', mimeType: 'audio/mp4', bitrate: 96000, contentLength: 3 },
  ]);

  fetchMock
    .mockResolvedValueOnce(new Response('gone', { status: 403 }))
    .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'audio/mp4' } }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ text: 'Recovered from second candidate.', language: 'en', segments: [{ start: 0, end: 2, text: 'Recovered from second candidate.' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

  const { NextRequest } = await import('next/server');
  const { POST } = await import('./route');
  const response = await POST(new NextRequest('http://localhost/api/tools/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=audio-candidates' }) }));
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.text).toBe('Recovered from second candidate.');
  expect(data.extractionMeta.mode).toBe('audio-transcription');
  expect(data.extractionMeta.degraded).toBe(true);
});
```

- [ ] **Step 2: Run route tests and verify they fail for the new contract**

Run: `pnpm test src/app/api/tools/extract/route.test.ts`
Expected: FAIL because `extractYouTubeAudioCandidates` and `extractionMeta` do not exist yet.

- [ ] **Step 3: Add failing library tests for audio candidate ordering**

```ts
import { describe, expect, it } from 'vitest';
import { sortAudioCandidates } from './youtube-transcript';

describe('sortAudioCandidates', () => {
  it('orders valid audio candidates by bitrate and filters missing URLs', () => {
    const result = sortAudioCandidates([
      { url: '', mimeType: 'audio/mp4', bitrate: 192000 },
      { url: 'https://cdn.example.com/low.m4a', mimeType: 'audio/mp4', bitrate: 64000 },
      { url: 'https://cdn.example.com/high.m4a', mimeType: 'audio/mp4', bitrate: 128000 },
    ]);

    expect(result.map((candidate) => candidate.url)).toEqual([
      'https://cdn.example.com/high.m4a',
      'https://cdn.example.com/low.m4a',
    ]);
  });
});
```

- [ ] **Step 4: Run the library test and verify it fails**

Run: `pnpm test src/lib/youtube-transcript.test.ts`
Expected: FAIL because `sortAudioCandidates` and the test file do not exist yet.

- [ ] **Step 5: Add failing UI tests for degraded and partial success banners**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n/use-i18n', () => ({
  useI18n: () => ({
    messages: {
      mediaImport: {
        degradedImportWarning: 'Imported via AI transcription because captions were unavailable.',
        partialTranscriptWarning: 'Partial transcript recovered. Review and edit before saving.',
      },
    },
  }),
}));

describe('MediaImport degraded banners', () => {
  it('renders degraded and partial warnings when extractionMeta requests them', () => {
    const markup = renderToStaticMarkup(
      <ExtractionWarnings
        extractionMeta={{
          mode: 'audio-transcription',
          transcriptSource: 'stt-groq',
          degraded: true,
          partial: true,
          warnings: [],
        }}
      />,
    );

    expect(markup).toContain('Imported via AI transcription because captions were unavailable.');
    expect(markup).toContain('Partial transcript recovered. Review and edit before saving.');
  });
});
```

- [ ] **Step 6: Run the UI test and verify it fails**

Run: `pnpm test src/components/import/media-import.test.tsx`
Expected: FAIL because the warning renderer and message keys do not exist yet.

- [ ] **Step 7: Commit the red-state tests**

```bash
git add src/app/api/tools/extract/route.test.ts src/lib/youtube-transcript.test.ts src/components/import/media-import.test.tsx
git commit -m "test: lock vercel youtube fallback expansion contract"
```

### Task 2: Add Multi-Candidate Audio Extraction And Metadata Builders

**Files:**
- Modify: `src/lib/youtube-transcript.ts`
- Modify: `src/app/api/tools/extract/route.ts`
- Test: `src/lib/youtube-transcript.test.ts`
- Test: `src/app/api/tools/extract/route.test.ts`

- [ ] **Step 1: Implement candidate types and sorting helpers in `src/lib/youtube-transcript.ts`**

```ts
export interface YouTubeAudioCandidate {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
  durationMs?: number;
}

export function sortAudioCandidates(candidates: YouTubeAudioCandidate[]): YouTubeAudioCandidate[] {
  return candidates
    .filter((candidate) => Boolean(candidate.url))
    .sort((a, b) => b.bitrate - a.bitrate);
}

export async function extractYouTubeAudioCandidates(videoId: string): Promise<YouTubeAudioCandidate[]> {
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!pageResponse.ok) return [];
  const html = await pageResponse.text();
  const formats = extractJsonByMarker(html, '"adaptiveFormats":') as AdaptiveFormat[] | null;
  if (!formats) return [];

  return sortAudioCandidates(
    formats
      .filter((format) => format.mimeType.startsWith('audio/') && format.url && !format.signatureCipher)
      .map((format) => ({
        url: format.url!,
        mimeType: format.mimeType,
        bitrate: format.bitrate,
        contentLength: format.contentLength ? parseInt(format.contentLength, 10) : undefined,
        durationMs: format.approxDurationMs ? parseInt(format.approxDurationMs, 10) : undefined,
      })),
  );
}

export async function extractYouTubeAudioUrl(videoId: string) {
  const candidates = await extractYouTubeAudioCandidates(videoId);
  const best = candidates[0];
  return best ? { url: best.url, contentLength: best.contentLength, durationMs: best.durationMs } : null;
}
```

- [ ] **Step 2: Update the extract route to use structured success metadata**

```ts
interface ExtractionMeta {
  mode: 'captions' | 'audio-transcription';
  transcriptSource?: 'npm-en' | 'npm-auto' | 'scraper' | 'stt-groq' | 'stt-openai';
  degraded: boolean;
  partial: boolean;
  warnings: string[];
}

function buildExtractionSuccess(input: {
  title: string;
  text: string;
  sourceUrl: string;
  videoDuration?: number;
  extractionMeta: ExtractionMeta;
}) {
  return {
    title: input.title,
    text: input.text,
    platform: 'youtube' as const,
    sourceUrl: input.sourceUrl,
    audioUrl: undefined,
    videoDuration: input.videoDuration,
    extractionMeta: input.extractionMeta,
  };
}
```

- [ ] **Step 3: Update transcript success paths to return `extractionMeta`**

```ts
return buildExtractionSuccess({
  title: metadata.title,
  text: transcript.text,
  sourceUrl: url,
  videoDuration: transcript.duration,
  extractionMeta: {
    mode: 'captions',
    transcriptSource: transcript.source,
    degraded: false,
    partial: false,
    warnings: [],
  },
});
```

- [ ] **Step 4: Run the targeted tests and verify the new metadata contract passes**

Run: `pnpm test src/lib/youtube-transcript.test.ts src/app/api/tools/extract/route.test.ts`
Expected: the captions-success and candidate-order tests pass, but provider fallback and structured failure tests still fail.

- [ ] **Step 5: Commit the candidate extraction layer**

```bash
git add src/lib/youtube-transcript.ts src/lib/youtube-transcript.test.ts src/app/api/tools/extract/route.ts src/app/api/tools/extract/route.test.ts
git commit -m "feat: add youtube audio candidate extraction metadata"
```

### Task 3: Add Provider Failover And Structured Failures

**Files:**
- Modify: `src/app/api/tools/extract/route.ts`
- Modify: `src/app/api/tools/extract/route.test.ts`
- Test: `src/app/api/tools/extract/route.test.ts`

- [ ] **Step 1: Implement provider failover for transcription**

```ts
const TRANSCRIPTION_PROVIDER_CHAIN: ProviderId[] = ['groq', 'openai'];

async function transcribeWithProviderFallback(file: File, headers: Headers) {
  const failures: string[] = [];

  for (const providerId of TRANSCRIPTION_PROVIDER_CHAIN) {
    try {
      const resolution = resolveTranscriptionProvider(providerId, {}, headers);
      const apiKey = resolveApiKey(resolution.providerId, headers);
      if (!apiKey) {
        failures.push(`${providerId}: not configured`);
        continue;
      }

      const response = await fetch(getTranscriptionEndpoint(resolution.providerId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: buildUpstreamTranscriptionFormData(file, resolution.providerId, 'en'),
      });

      const transcription = await parseUpstreamTranscriptionPayload(response);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          failures.push(`${providerId}: ${transcription.error?.message || response.status}`);
          continue;
        }
        throw new Error(transcription.error?.message || `Transcription failed with ${response.status}`);
      }

      if (!transcription.text?.trim()) {
        failures.push(`${providerId}: empty transcript`);
        continue;
      }

      return {
        text: transcription.text.trim(),
        language: transcription.language || 'en',
        duration: transcription.segments?.at(-1)?.end,
        transcriptSource: providerId === 'groq' ? 'stt-groq' : 'stt-openai',
      };
    } catch (error) {
      failures.push(`${providerId}: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  throw new Error(`transcription_upstream_failed:${failures.join('; ')}`);
}
```

- [ ] **Step 2: Implement candidate retry and structured failure mapping**

```ts
function buildExtractionFailure(code: 'captions_unavailable' | 'audio_stream_unavailable' | 'audio_too_large' | 'transcription_rate_limited' | 'transcription_upstream_failed', error: string, warnings: string[] = []) {
  return NextResponse.json(
    {
      error,
      hint: code === 'audio_stream_unavailable' ? 'Try another YouTube video or use Local Upload with a downloaded audio file.' : 'Try Local Upload with audio file for AI transcription.',
      extractionMeta: {
        code,
        warnings,
      },
    },
    { status: 500 },
  );
}

async function transcribeYouTubeFromAudio(videoId: string, headers: Headers) {
  const candidates = await extractYouTubeAudioCandidates(videoId);
  if (candidates.length === 0) {
    throw new Error('audio_stream_unavailable');
  }

  const warnings: string[] = [];
  for (const candidate of candidates) {
    try {
      const file = await downloadYouTubeAudioFile(candidate.url, videoId, candidate.contentLength);
      const transcript = await transcribeWithProviderFallback(file, headers);
      return {
        text: transcript.text,
        duration: transcript.duration ?? (candidate.durationMs ? candidate.durationMs / 1000 : undefined),
        extractionMeta: {
          mode: 'audio-transcription' as const,
          transcriptSource: transcript.transcriptSource,
          degraded: true,
          partial: false,
          warnings,
        },
      };
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'audio candidate failed');
    }
  }

  throw new Error(`transcription_upstream_failed:${warnings.join('; ')}`);
}
```

- [ ] **Step 3: Add route tests for provider fallback and structured failures**

```ts
it('falls back from groq to openai transcription when groq is rate limited', async () => {
  process.env.GROQ_API_KEY = 'gsk-platform';
  process.env.OPENAI_API_KEY = 'sk-platform';

  fetchMock
    .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'audio/mp4' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ text: 'Recovered via OpenAI', language: 'en', segments: [{ start: 0, end: 2.1, text: 'Recovered via OpenAI' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  const response = await POST(makeRequest('https://www.youtube.com/watch?v=provider-fallback'));
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.extractionMeta.transcriptSource).toBe('stt-openai');
});

it('returns structured extraction failure metadata when all audio candidates fail', async () => {
  extractYouTubeAudioCandidatesMock.mockResolvedValue([]);

  const response = await POST(makeRequest('https://www.youtube.com/watch?v=no-audio'));
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data.extractionMeta.code).toBe('audio_stream_unavailable');
});
```

- [ ] **Step 4: Run the route tests and verify all backend fallback cases pass**

Run: `pnpm test src/app/api/tools/extract/route.test.ts`
Expected: PASS for transcript success, second-candidate retry, provider fallback, and structured failure cases.

- [ ] **Step 5: Commit the provider fallback layer**

```bash
git add src/app/api/tools/extract/route.ts src/app/api/tools/extract/route.test.ts
git commit -m "feat: add provider fallback for vercel youtube import"
```

### Task 4: Surface Degraded Success In The Import UI

**Files:**
- Modify: `src/components/import/media-import.tsx`
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`
- Modify: `src/components/import/media-import.test.tsx`
- Test: `src/components/import/media-import.test.tsx`

- [ ] **Step 1: Add the new i18n keys**

```json
{
  "degradedImportWarning": "Imported via AI transcription because captions were unavailable.",
  "partialTranscriptWarning": "Partial transcript recovered. Review and edit before saving."
}
```

```json
{
  "degradedImportWarning": "由于字幕不可用，已通过 AI 转写完成导入。",
  "partialTranscriptWarning": "已恢复部分转录文本。保存前请先检查并编辑。"
}
```

- [ ] **Step 2: Add a focused warning renderer in `src/components/import/media-import.tsx`**

```tsx
type ExtractionMeta = {
  mode: 'captions' | 'audio-transcription';
  transcriptSource?: string;
  degraded: boolean;
  partial: boolean;
  warnings: string[];
};

export function ExtractionWarnings({
  extractionMeta,
  messages,
}: {
  extractionMeta?: ExtractionMeta;
  messages: {
    degradedImportWarning: string;
    partialTranscriptWarning: string;
  };
}) {
  if (!extractionMeta?.degraded && !extractionMeta?.partial) return null;

  return (
    <div className="space-y-2">
      {extractionMeta.degraded && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {messages.degradedImportWarning}
        </div>
      )}
      {extractionMeta.partial && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {messages.partialTranscriptWarning}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the warning component into the result card**

```tsx
<ExtractionWarnings
  extractionMeta={result.extractionMeta}
  messages={{
    degradedImportWarning: m.degradedImportWarning,
    partialTranscriptWarning: m.partialTranscriptWarning,
  }}
/>
```

- [ ] **Step 4: Run the UI test and verify degraded messaging passes**

Run: `pnpm test src/components/import/media-import.test.tsx`
Expected: PASS, and saving still remains available when `text` exists.

- [ ] **Step 5: Commit the UI messaging layer**

```bash
git add src/components/import/media-import.tsx src/components/import/media-import.test.tsx src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json
git commit -m "feat: surface degraded youtube import warnings"
```

### Task 5: Final Verification And Release Safety Check

**Files:**
- Modify: `docs/superpowers/plans/2026-04-13-vercel-youtube-fallback-expansion.md`
- Test: `src/app/api/tools/extract/route.test.ts`
- Test: `src/lib/youtube-transcript.test.ts`
- Test: `src/components/import/media-import.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run: `pnpm test src/app/api/tools/extract/route.test.ts src/lib/youtube-transcript.test.ts src/components/import/media-import.test.tsx`
Expected: PASS with all fallback-path regressions covered.

- [ ] **Step 2: Run the static verification commands**

Run: `pnpm typecheck`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Review the final backend response shape manually**

```ts
expect(successPayload).toMatchObject({
  title: expect.any(String),
  text: expect.any(String),
  extractionMeta: {
    mode: expect.stringMatching(/captions|audio-transcription/),
    degraded: expect.any(Boolean),
    partial: expect.any(Boolean),
    warnings: expect.any(Array),
  },
});
```

- [ ] **Step 4: Commit the verified plan implementation**

```bash
git add src/app/api/tools/extract/route.ts src/lib/youtube-transcript.ts src/components/import/media-import.tsx src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json src/app/api/tools/extract/route.test.ts src/lib/youtube-transcript.test.ts src/components/import/media-import.test.tsx
git commit -m "feat: expand vercel youtube import fallback chain"
```

## Self-Review

- Spec coverage checked: transcript metadata, multi-candidate audio retry, provider fallback, structured failures, degraded UI state, and tests each map to their own task.
- Placeholder scan checked: no `TODO`, `TBD`, or "write tests later" gaps remain.
- Type consistency checked: `extractionMeta`, `YouTubeAudioCandidate`, and provider fallback naming are consistent across all tasks.
