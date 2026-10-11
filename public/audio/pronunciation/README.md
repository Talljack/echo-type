# Pronunciation learning audio

All clips used by the learning page are **human recordings** from Wikimedia Commons, including Lingua Libre and the Shtooka project. No speech engine, API key, or external request is required during playback.

## Sources and attribution

The canonical manifest is `src/lib/pronunciation-audio-sources.json`. Every clip identifies its original file and page, creator, license, source SHA-256, and processed MP3 SHA-256. The app exposes these credits at `/pronunciation/sources`.

Each recording and its MP3 adaptation retain the license listed in that manifest (CC BY, CC BY-SA, CC0, or public domain). These audio licenses apply to the respective clips, independently of the app. Keep the manifest and credits when redistributing the audio. Wikimedia, the speakers, and the projects do not endorse EchoType.

- `sounds/`: 48 teaching entries: 20 vowels, 24 consonants, and 4 consonant clusters. Single vowels use general IPA human references; diphthongs use British recordings. Speaker accents and phonetic realizations vary.
- Consonants are human phonetic demonstrations, often with surrounding vowels (for example [ata]). That context is retained and explained in the UI. No consonant is fabricated by joining unrelated clips.
- `words/`: British-English human examples. Some recordings contain an article or infinitive marker, such as “a sheep”; the actual spoken phrase is shown. Examples without a suitable British human recording are omitted. The CURE example is the traditional /bʊə/ recording of “boor”; modern speakers may merge that vowel with /ɔː/.
- Only leading/trailing silence trimming, static gain normalization, and mono 48 kHz / 128 kbps MP3 encoding are applied. Upsampling does not restore detail absent from an original recording. No pitch shift, synthesized speech, or phonetic-content splice is used.

Regenerate with `python3 scripts/import-pronunciation-audio.py`. Requires FFmpeg and curl as development tools only. Original downloads are cached in the system temporary directory; hashes prevent silently accepting changed source recordings. Requests are sequential with a delay and bounded retry. The old eSpeak generator is retained for history but refuses to overwrite human assets.

Tests verify attribution and file hashes, decode all 48 sound files, and check playback in Chromium and WebKit. BBC teaching videos remain external links; their audio and video are not redistributed.

References:

- [Wikimedia IPA consonant audio](https://en.wikipedia.org/wiki/IPA_consonant_chart_with_audio)
- [British diphthong examples](https://en.wikipedia.org/wiki/Received_Pronunciation#Diphthongs_and_triphthongs)
- [Sheep: human recording and CC BY attribution](https://commons.wikimedia.org/wiki/File:En-uk-a_sheep.ogg)
