# Local Whisper + OpenRouter free acceptance

This is an opt-in test arrangement, not a production provider integration.

## Setup

- Existing whisper.cpp `whisper-server`, existing `ggml-small.bin` (Whisper small, not large-v3-turbo), Apple M2 Max.
- Loopback service: `127.0.0.1:8178`, ffmpeg conversion enabled.
- Application production build: `127.0.0.1:3011`.
- OpenRouter model: `openrouter/free`, through the real `/api/import/organize` application route. The router may select different free models per request.
- Synthetic English speech only. No user recordings or personal learning data uploaded.
- Credentials supplied via process environment, not persisted in the script, browser settings, or this report.

## Verified

- Whisper returned the expected two-sentence transcript with real segment timestamps.
- WAV, MP3, M4A, OGG, FLAC, WebM, MP4, AVI fixtures: all eight returned HTTP 200 and the expected key phrase. These eight fixtures contain audio; a separate MP4 with both video and speech also passed.
- Chromium/WAV: sentences and scenario each completed import, real transcription, real AI organization, review/tag entry, publication, first lesson, understanding, output, correction, recall, application, and reload with `5 / 5 stages practiced` retained.
- Initial shorter Chromium run also verified saved understanding answers survived reload for both material types.
- Script syntax check and `git diff --check` passed.

## Not passed

- WebKit/MP3 live chain could not be verified using this test transport. Playwright's intercepted multipart body supplied a zero-byte file while the original fixture has 15,236 bytes; forwarding it made Whisper return HTTP 500 (`Invalid data found when processing input`). A size assertion now stops the test before forwarding incomplete data. The same original MP3 passed direct Whisper transcription. This is evidence of an interception limitation, not evidence that actual Safari uploads fail or pass. No synthetic replacement bytes were substituted to conceal the failure.

## Boundaries

- `scripts/verify-local-whisper-chain.mjs` redirects ONLY the browser transcription request to the real local Whisper server. It does not return canned text. It bypasses the production transcription API's provider resolution/authentication; that API has NOT gained local Whisper support.
- The real application AI organization route is exercised, with ephemeral OpenRouter configuration injected by the test transport. The user's saved provider settings remain unchanged.
- Delayed recall uses a two-day timestamp adjustment in an isolated test database, not a real two-day wait.
- Short synthetic samples do not establish long-recording accuracy, all codecs, corrupted-file behavior, or large-upload support.
- This test does not validate Windows/iOS native apps or physical microphones. WebKit is not an iOS device test.
- Normal user sessions do not automatically use this test-only routing arrangement.

## Re-run

Start a loopback whisper.cpp server with a local model and `--convert`, then run:

```sh
node scripts/verify-local-whisper-chain.mjs /absolute/path/to/synthetic.wav
```

Set `OPENROUTER_API_KEY` in the process environment beforehand. Set `TEST_BROWSER=webkit` to select WebKit. Do not put the key in a committed file. The test requires the application on port 3011 and Whisper on port 8178.
