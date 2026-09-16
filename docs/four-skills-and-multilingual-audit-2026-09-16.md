# Same-material four-skills and multilingual acceptance

## Environment and scope

Production app at 127.0.0.1:3011, isolated Chromium context, existing local whisper.cpp small model on 127.0.0.1:8178. No changes to product configuration or user learning data.

Actual pasted import source:

> Our team fixed a slow application. The response time improved after adding an index.

## Four skills: passed within stated boundaries

The same material was imported through the dialog, reviewed, published, and opened in its first lesson. The `Listen · Read aloud · Speak · Type` workspace was used, not the separate five-stage text workshop.

| Mode | Actual verification | Boundary |
| --- | --- | --- |
| Listen | Real browser SpeechSynthesis completed; Continue unlocked and learning progress saved | No synthetic end event in the passing run. No human check of speaker sound/quality; other TTS providers not tested |
| Read aloud | Real browser MediaRecorder captured Chromium's WAV-backed test microphone; actual local Whisper recognized the speech; progress saved | Native SpeechRecognition disabled to select recording fallback. Not a physical microphone or live interim recognition test |
| Speak | Same real capture/transcription path completed and progress saved | This is the course's Speak pronunciation/repetition practice, not a multi-turn AI scenario conversation |
| Type | Original material entered through the actual typing input, submitted and completed | Tests full-string input and completion; does not exhaust individual-key/error/reset/punctuation cases |

Final UI showed `4 / 4 exercises completed`; after reload and reopening the four-skills workspace, `4 / 4` persisted. Read-aloud and Speak transcripts included the expected source; a repeated opening sentence resulted from the test microphone looping its short fixture.

Script: `scripts/verify-import-four-skills.mjs`. This test redirects the actual recorded `/api/stt` payload to local Whisper; it bypasses production STT provider authentication/routing. Normal users do not gain a local provider from this test. The optional `SIMULATE_TTS=1` switch was NOT used in the passing run.

## Chinese and mixed speech

Synthetic speech was generated using the installed macOS Tingting voice and converted to 16 kHz mono WAV. Both samples were sent to real Whisper with `language=auto` and `language=zh` (four successful HTTP 200 responses with timestamps).

Chinese source:

> 我们的团队修复了一个运行缓慢的应用程序。添加索引后，响应时间得到了改善。

Both language settings returned:

> 我們的團隊修復了一個運行緩慢的應用程序,添加所引後,想應時間得到了改善。

**Not an exact-accuracy pass:** traditional characters were returned and “索引/响应” were misrecognized as “所引/想应”. Auto vs explicit Chinese did not fix these errors. The model was Whisper small, not large-v3.

Mixed source:

> 今天我们修复了一个 slow application。添加 index 以后，response time 得到了改善。

Both settings retained the Chinese content and all three English expressions, with punctuation/spacing differences. This is one clear synthetic sample, not proof of general accent/noise performance.

Script: `scripts/verify-local-whisper-languages.mjs`. This checks the local ASR service, NOT the entire Chinese import→AI organization→learning flow. The application's organization prompt still requires English learning sentences.

## Still not verified

- Physical microphone permissions, speaker audibility, real accent/noise quality, native live speech recognition, pronunciation scoring accuracy.
- Multi-turn AI conversation and audio replies; third-party TTS providers.
- Windows/iOS native four-skills flow, Safari/WebKit real recording upload.
- Chinese-source import and AI transformation end to end; arbitrary codecs/long recordings.

No production feature change, commit, or release is part of this acceptance run.

## Follow-up: Chinese correction and online availability

`scripts/verify-chinese-audio-review.mjs` passed a real local Chinese transcription → manual correction of 索引/响应 and simplified characters → immediate reload/resume → corrected text sent to the real AI organization route → English sentences published → learning workspace opened. The original 248,008-byte audio and original mistaken transcript remained in the import job. The corrected draft survived reload. This verifies correction usability, not error-free automatic Chinese ASR.

The first original-file assertion incorrectly used Blob.size on raw IndexedDB data. The existing storage middleware actually encodes the source as ArrayBuffer; checking byteLength resolved the test error. No source-data loss was found.

One `openrouter/free` organization retry returned HTTP 422 (incomplete structured material). This failure is retained here; free routing is not uniformly reliable. The successful repeat used the fixed free model `nvidia/nemotron-3-super-120b-a12b:free`. No user default settings were changed.

The actual production `/api/import/transcribe` route was retested with the existing online credentials and Chinese WAV: Groq still returned 403; OpenRouter still returned 402 insufficient audio balance. **Online success acceptance remains blocked** pending a credential/account with working audio access and quota. Local results do not replace this requirement. Do not send additional secrets in chat.
