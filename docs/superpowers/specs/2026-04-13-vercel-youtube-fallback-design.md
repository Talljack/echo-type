# Vercel YouTube Import Fallback Expansion

**Date:** 2026-04-13
**Status:** Draft
**Scope:** `src/app/api/tools/extract/route.ts`, `src/lib/youtube-transcript.ts`, `src/components/import/media-import.tsx`

## Problem

EchoType's cloud deployment on Vercel cannot rely on `yt-dlp`, so YouTube import currently depends on transcript availability plus a lightweight audio-transcription fallback. This improved the previous behavior, but the success rate is still capped by three recurring failure modes:

1. Caption extraction is unavailable or blocked.
2. The first discovered audio stream is unusable, too large, or transiently unavailable.
3. The first STT provider fails, rate-limits, or returns empty output.

The current API also collapses too many states into a single failure string. That makes debugging hard and prevents the UI from distinguishing between a total failure and a degraded but still usable import.

## Goal

Maximize real-world YouTube import success rate on Vercel without adding new infrastructure.

Success means:

- Prefer any recoverable transcript over a hard failure.
- Allow partial-but-usable imports when full recovery is not possible.
- Return structured metadata so the UI can explain what happened.
- Keep the implementation serverless-friendly. No `yt-dlp`, no external worker, no long-running queue.

## Non-Goals

- No dedicated media-processing backend.
- No `yt-dlp` packaging inside Vercel functions.
- No full asynchronous job system.
- No support expansion for non-YouTube platforms on Vercel in this phase.

## Recommended Approach

Use a layered fallback chain inside the existing Vercel path:

1. Try transcript extraction first.
2. If transcripts fail, try direct audio-stream transcription.
3. If the first audio stream fails, try alternate audio-stream candidates.
4. If the first transcription provider fails, fall back to the next available provider.
5. If only part of the content can be recovered, return a degraded success instead of a hard failure.

This keeps the deployment model simple while improving the conversion rate from "import failed" to "import completed with warnings".

## Architecture

### Request Flow

```text
YouTube URL
  -> extract video id
  -> fetch metadata
  -> transcript pipeline
       -> npm-en
       -> npm-auto
       -> caption scraper
  -> if transcript succeeds: return captions result
  -> else audio pipeline
       -> extract candidate audio streams
       -> try stream #1
       -> if download/validation fails: try next stream
       -> transcribe with provider fallback
            -> Groq
            -> OpenAI-compatible fallback when configured
  -> if transcription succeeds: return degraded success
  -> if only partial transcript succeeds: return partial degraded success
  -> else return structured failure
```

### Why This Wins

- Caption-based extraction stays the cheapest and fastest path.
- Audio-stream retries cover videos where the first parsed stream is stale or unsuitable.
- Provider fallback covers rate limits and intermittent upstream failures.
- Structured degraded success lets the user keep moving instead of retrying blindly.

## Module Boundaries

### `src/app/api/tools/extract/route.ts`

This file remains the orchestration layer but should be split into smaller helpers with one job each.

Planned helpers:

- `fetchTranscriptWithFallback(videoId)`
  Returns transcript text or throws a structured captions failure.
- `transcribeYouTubeFromAudio(videoId, headers)`
  Runs audio-stream extraction plus transcription fallback.
- `transcribeWithProviderFallback(file, headers)`
  Encapsulates provider selection, retries, and provider failover.
- `buildExtractionSuccess(...)`
  Normalizes successful API payloads.
- `buildExtractionFailure(...)`
  Normalizes failures and user-facing hints.

The route should only coordinate the decision tree and serialize the response.

### `src/lib/youtube-transcript.ts`

This module should expand from "give me the best audio stream" to "give me usable audio candidates".

New responsibility:

- Return multiple audio-only stream candidates sorted by quality and expected usefulness.
- Include enough metadata to filter streams that are obviously too large or unsuitable before downloading.

Suggested shape:

```ts
interface YouTubeAudioCandidate {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
  durationMs?: number;
}
```

Primary export:

```ts
async function extractYouTubeAudioCandidates(videoId: string): Promise<YouTubeAudioCandidate[]>
```

The existing single-best helper can remain as a compatibility wrapper if needed.

### `src/components/import/media-import.tsx`

The import UI should treat degraded success as success, not failure.

It will read `extractionMeta` from the response and:

- Show a warning banner when import succeeded through audio transcription.
- Show a stronger warning when the transcript is partial.
- Still allow editing and saving as long as `text` is present.

## API Response Design

### Success Payload

```ts
interface ExtractSuccessPayload {
  title: string;
  text: string;
  platform: 'youtube';
  sourceUrl: string;
  audioUrl?: string;
  videoDuration?: number;
  extractionMeta: {
    mode: 'captions' | 'audio-transcription';
    transcriptSource?: 'npm-en' | 'npm-auto' | 'scraper' | 'stt-groq' | 'stt-openai';
    degraded: boolean;
    partial: boolean;
    warnings: string[];
  };
}
```

### Failure Payload

```ts
interface ExtractFailurePayload {
  error: string;
  hint?: string;
  extractionMeta?: {
    code:
      | 'captions_unavailable'
      | 'audio_stream_unavailable'
      | 'audio_too_large'
      | 'transcription_rate_limited'
      | 'transcription_upstream_failed';
    warnings: string[];
  };
}
```

This preserves the existing top-level `error` and `hint` behavior while adding structured failure codes.

## Fallback Details

### 1. Transcript Pipeline

Keep the current order:

- `youtube-transcript` with `lang: 'en'`
- `youtube-transcript` default language
- custom caption scraper

Enhancement:

- Preserve the exact failure reason for each step.
- Return the winning source in `extractionMeta.transcriptSource`.

### 2. Audio Candidate Pipeline

If transcript extraction fails:

- Parse all usable audio-only candidates from the page.
- Filter out streams with missing URLs.
- Sort by bitrate descending, but skip candidates that exceed known upload limits when `contentLength` is already available.
- Try candidates in order until one downloads and validates.

This covers cases where the first candidate is technically present but unusable.

### 3. Provider Fallback

Transcription should no longer assume a single provider.

Fallback order:

1. Requested cloud-default provider, currently Groq.
2. Next configured provider that supports transcription and has credentials available.

Failover triggers:

- `429`
- `5xx`
- network timeout
- empty transcript payload

Do not fail over on clear credential errors like `401` or `403` unless another provider is already configured and explicitly allowed.

### 4. Partial Success

If the system recovers only a subset of the transcript but has meaningful text, return success with:

- `degraded: true`
- `partial: true`
- a warning telling the user the transcript may be incomplete

This is better than discarding usable text and returning a hard error.

Phase 1 partial success can be simple:

- If one audio candidate yields text but duration coverage is clearly incomplete, keep the text and warn.
- Do not introduce server-side media slicing in this phase.

This avoids pretending we have robust chunking before we actually do.

## Error Taxonomy

Use stable failure codes so logs, tests, and UI can reason about outcomes.

- `captions_unavailable`
  All transcript methods failed.
- `audio_stream_unavailable`
  No downloadable audio candidate was usable.
- `audio_too_large`
  All viable streams exceed the transcription limit.
- `transcription_rate_limited`
  STT provider refused due to rate limits.
- `transcription_upstream_failed`
  STT providers failed due to upstream or empty-output issues.
- `partial_transcript_only`
  Not a top-level failure. Represent as `partial: true` in success metadata.

## UI Behavior

`src/components/import/media-import.tsx` should add two user-facing states:

### Degraded Success Banner

Shown when `extractionMeta.degraded === true`.

Copy example:

- "Imported via AI transcription because captions were unavailable."

### Partial Transcript Banner

Shown when `extractionMeta.partial === true`.

Copy example:

- "Partial transcript recovered. Review and edit before saving."

The existing edit-before-save path already fits this model well. The key change is surfacing the warning instead of treating the result as an invisible backend detail.

## Testing Strategy

Add targeted tests for the real failure ladder.

### Route Tests

- transcript success should not call audio transcription
- captions fail, first audio candidate succeeds
- captions fail, first audio candidate fails, second candidate succeeds
- Groq transcription fails, fallback provider succeeds
- all providers fail with structured error code
- partial transcript returns success with `partial: true`

### Library Tests

- audio candidate extraction returns candidates sorted in deterministic order
- oversized candidates are filtered or rejected correctly
- candidate parsing tolerates missing optional fields

### UI Tests

- degraded success warning renders
- partial transcript warning renders
- save flow remains enabled when degraded success returns text

## Rollout Plan

1. Introduce structured `extractionMeta` in the API.
2. Expand audio extraction from one candidate to multiple candidates.
3. Add transcription provider fallback.
4. Update import UI to surface degraded and partial states.
5. Add regression tests for each fallback level.

## Risks

- More fallback logic means more branches, so tests must stay tight.
- Alternate audio candidates may still be unstable if YouTube changes page data shape.
- Provider fallback increases success rate but may produce slightly different transcript quality across providers.

These are acceptable trade-offs. The user outcome is still better than a hard failure.

## Open Decisions Resolved

- **No `yt-dlp` on Vercel:** confirmed.
- **No separate backend:** confirmed.
- **Prioritize overall success rate:** confirmed.
- **Treat degraded results as success:** confirmed.
- **Do not add true server-side chunked media processing in this phase:** confirmed.

## Implementation Summary

Build a layered Vercel-safe fallback that keeps trying the next cheap, realistic recovery path before giving up:

- captions first
- multiple audio candidates second
- provider fallback third
- partial success instead of hard failure when usable text exists

That is the highest-success path available without changing the deployment model.
