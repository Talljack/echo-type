# YouTube Request Budget and Backoff Design

## Goal

Prevent one failed YouTube import from rapidly amplifying into many unauthenticated server requests while preserving the existing caption-source fallback chain.

## Behavior

Each direct extraction call owns one shared budget of six YouTube network requests. iOS player, Android player, watch-page tracks, caption payloads, and timed-text tracks all consume that same budget. When the budget is exhausted, direct extraction stops and the API route advances to its existing `youtube-transcript` compatibility fallback.

The extractor does not immediately retry the same endpoint. Before moving to another source after a retryable failure, it waits using a bounded `300ms`, `600ms`, then `1200ms` schedule. Retryable failures are network errors and HTTP `403`, `429`, or `5xx` responses. Other empty or unsuccessful responses advance without delay because waiting cannot make that response usable.

An aborted request stops extraction immediately. It must not wait or issue another request.

## Implementation

Keep the logic inside `fetchYouTubeTranscriptFromSources` in `src/lib/youtube-transcript.ts`. Add a small request-budget helper local to that function rather than introducing a new module or dependency. Accept an injectable delay function after the existing injectable fetch function so tests can record backoff without sleeping.

The budget wrapper checks for aborts, refuses calls after six attempts, records retryable failures, and applies the next bounded delay before the following source request. Caption-track loops use the same wrapper, so a video exposing many unusable tracks cannot bypass the limit.

## Testing

Add focused Vitest coverage proving:

- no more than six fetch calls occur across all sources and caption tracks;
- retryable failures produce `300`, `600`, and capped `1200` millisecond delays;
- ordinary empty responses do not add delay;
- an abort prevents later source requests;
- existing successful extraction and route compatibility tests remain green.

Run focused transcript and route tests, typecheck, lint, production build, and inspect the final diff. The unrelated existing daily-plan baseline failure remains outside this change.
