# Pronunciation learning audio

These are bundled synthetic British-English teaching samples, generated with eSpeak NG 1.52.0 (`en-gb` / `gmw/en`), then encoded to mono MP3 with FFmpeg. They are not recordings of a human teacher, and no speech service is required during playback.

- `sounds/`: 48 teaching entries: 20 vowels, 24 consonants, and 4 consonant clusters.
- `words/`: 124 example words, with conventional British IPA labels in `src/lib/pronunciation-word-ipa.json`.
- `src/lib/pronunciation-phoneme-notation.json` maps teaching entries to eSpeak phoneme notation. Displayed phonemic symbols and synthetic phonetic realization can vary with the voice.
- Short voiced consonants and clusters are synthesized in a schwa context, then clipped at the phoneme-event boundary **before** schwa. The resulting consonant burst is repeated three times with a short silent gap. This avoids silent final-stop output without teaching an added vowel.

Regenerate with `python3 scripts/generate-pronunciation-audio.py`. The generator requires the eSpeak NG executable and shared library, plus FFmpeg; these are development dependencies only. It checks that contextual consonants are non-silent. Browser tests decode all 48 sound files and verify non-zero audio.

Human teaching videos are linked externally from BBC Learning English, including the lesson for /ɪə/ in near, hear and weary. No YouTube video is copied into these assets.

References:

- [eSpeak NG phoneme documentation](https://github.com/espeak-ng/espeak-ng/blob/master/docs/phonemes.md)
- [BBC /ɪə/ lesson](https://www.youtube.com/watch?v=vC0h4S0YPJc)
