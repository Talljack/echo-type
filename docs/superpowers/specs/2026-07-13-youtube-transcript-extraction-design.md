# YouTube Transcript Extraction Design

## Goal

Make EchoType's server-side YouTube import recover the same caption content as the CaptionDesk browser extension whenever YouTube exposes manual or automatic captions, while preserving the existing API response consumed by the import UI and chat tool.

## Scope

- Support `watch`, `shorts`, `live`, `embed`, and `youtu.be` video URLs.
- Prefer the requested language, then English, then manual captions, then any available automatic caption.
- Try YouTube mobile player clients, caption tracks embedded in the watch page, and the timed-text track list.
- Parse JSON3 captions into the existing segment and full-text response shape.
- Keep the installed `youtube-transcript` package as the final compatibility fallback.
- Return stable client errors for invalid URLs and videos without captions.

Copy/download controls and AI summarization from CaptionDesk are outside this feature.

## Architecture

Keep the route thin. Extend `src/lib/youtube-transcript.ts` with pure URL, track-ordering, and JSON3 parsing helpers plus one server-side extraction function. The function owns the fallback sequence and accepts an injectable fetch implementation so each network branch can be tested without adding dependencies.

The route validates the request, calls the shared extractor, and maps its result to the current `{ videoId, segments, fullText, segmentCount }` contract. Existing consumers require no changes.

## Data Flow

1. Parse and validate the video ID from the submitted URL.
2. Request YouTube player metadata with the iOS client, then Android client.
3. For each response, order caption tracks by language and manual-caption preference and request each track as JSON3.
4. If mobile metadata has no usable transcript, inspect caption tracks from the watch page.
5. If still empty, request `/api/timedtext?type=list`, build track URLs, and try those tracks.
6. If the direct extraction chain fails, call the existing `youtube-transcript` package in English and then its default language.
7. Normalize successful events into millisecond offsets and durations, preserving line text without duplicate whitespace.

Each network attempt is bounded by the existing request timeout style. A failed branch advances to the next branch; an abort or final exhaustion produces a stable error rather than exposing upstream response contents.

## Error Handling

- Missing URL: HTTP 400.
- Unsupported or malformed URL: HTTP 400 with the existing import guidance.
- Valid video with no usable caption text after all fallbacks: HTTP 404.
- Unexpected request or parsing failure: HTTP 500 with a generic message; details remain server-side.

Blank JSON3 events and HTTP failures are treated as an unavailable branch, not a successful empty transcript.

## Testing

Use Vitest with test-first red/green cycles for:

- all supported URL forms and rejection of lookalike hosts;
- caption-track ordering across preferred language, English, manual, and ASR tracks;
- JSON3 text, offsets, durations, and blank-event handling;
- fallback from mobile clients to page tracks and timed-text tracks;
- route response compatibility and 400/404 behavior.

After unit tests, run the focused tests, project typecheck/lint gates available in `package.json`, and a production build. Finally, call the route or extraction helper against at least one real public captioned video and report any network or YouTube bot-protection limitation explicitly.
