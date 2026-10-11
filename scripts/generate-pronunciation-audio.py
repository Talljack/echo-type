#!/usr/bin/env python3
"""Generate bundled British synthetic examples; requires espeak-ng and ffmpeg.

IPA labels use the conventional British teaching chart. The samples are synthetic,
not recordings of a teacher. No speech engine or API is required at runtime.
"""
import concurrent.futures
import ctypes
import ctypes.util
import wave
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/audio/pronunciation'
PHONEMES = json.loads((ROOT / 'src/lib/pronunciation-phoneme-notation.json').read_text())
WORDS = json.loads((ROOT / 'src/lib/pronunciation-word-ipa.json').read_text())
CONTEXT_SOUNDS = {"b", "d", "g", "j", "tr", "dr", "ts", "dz"}
MAPPING = {
    'iː': 'i:', 'ɑː': 'A:', 'ɔː': 'O:', 'ɜː': '3:', 'uː': 'u:',
    'ɪə': 'i@3', 'eə': 'e@', 'ʊə': 'U@', 'eɪ': 'eI', 'aɪ': 'aI',
    'ɔɪ': 'OI', 'əʊ': 'oU', 'aʊ': 'aU', 'tʃ': 'tS', 'dʒ': 'dZ',
    'i': 'i', 'ɪ': 'I', 'e': 'E', 'æ': 'a', 'ɒ': '0', 'ʊ': 'U', 'ʌ': 'V', 'ə': '@',
    'ʃ': 'S', 'ʒ': 'Z', 'θ': 'T', 'ð': 'D', 'ŋ': 'N', 'ɡ': 'g', 'ˈ': "'",
}


def phonemes_for_word(ipa):
    text = ipa.strip('/')
    output = ''
    while text:
        for symbol in sorted(MAPPING, key=len, reverse=True):
            if text.startswith(symbol):
                output += MAPPING[symbol]
                text = text[len(symbol):]
                break
        else:
            if text[0] not in 'bcdfghjklmnprstvwz':
                raise ValueError(f'Unmapped IPA symbol: {text!r}')
            output += text[0]
            text = text[1:]
    return output


def generate(item):
    group, name, phonemes = item
    if group == "sounds" and name in CONTEXT_SOUNDS:
        return
    output = DEST / group / f'{name}.mp3'
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        wav = pathlib.Path(temp) / 'sample.wav'
        subprocess.run(['espeak-ng', '-v', 'en-gb', '-s', '130', '-g', '0', '-w', str(wav), f'[[{phonemes}]]'], check=True)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-af', 'volume=1.4,alimiter=limit=0.89:level=false', '-ar', '22050', '-codec:a', 'libmp3lame', '-b:a', '64k', str(output)], check=True)


def generate_context_sounds():
    # Voiced stops need a following vowel to release in eSpeak. Use phoneme event
    # timestamps to cut BEFORE that vowel, then repeat the short consonant burst.
    class EventId(ctypes.Union):
        _fields_ = [('number', ctypes.c_int), ('name', ctypes.c_void_p), ('string', ctypes.c_char * 8)]

    class Event(ctypes.Structure):
        _fields_ = [('type', ctypes.c_int), ('identifier', ctypes.c_uint), ('position', ctypes.c_int),
                    ('length', ctypes.c_int), ('audio_position', ctypes.c_int), ('sample', ctypes.c_int),
                    ('userdata', ctypes.c_void_p), ('id', EventId)]

    library = ctypes.util.find_library('espeak-ng')
    if not library:
        raise RuntimeError('The espeak-ng shared library is required.')
    engine = ctypes.CDLL(library)
    engine.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
    engine.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
    engine.espeak_Synth.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int,
                                   ctypes.c_uint, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p]
    rate = engine.espeak_Initialize(2, 0, None, 1)  # synchronous retrieval, phoneme events
    if rate <= 0 or engine.espeak_SetVoiceByName(b'gmw/en') != 0:
        raise RuntimeError('Could not initialize British phoneme synthesis.')
    engine.espeak_SetParameter(1, 130, 0)
    chunks, events = [], []

    @ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.POINTER(Event))
    def callback(samples, count, items):
        if count:
            chunks.append(ctypes.string_at(samples, count * 2))
        index = 0
        while items[index].type:
            if items[index].type == 7:
                events.append((items[index].id.string.decode(), items[index].audio_position))
            index += 1
        return 0

    engine.espeak_SetSynthCallback(callback)
    try:
        for name in sorted(CONTEXT_SOUNDS):
            chunks.clear()
            events.clear()
            text = f'[[{PHONEMES[name]}@]]'.encode()
            if engine.espeak_Synth(text, len(text) + 1, 0, 1, 0, 257, None, None) != 0:
                raise RuntimeError(f'Could not synthesize {name}')
            cutoff = next(ms for code, ms in events if '@' in code)
            pcm = b''.join(chunks)[:int(cutoff * rate / 1000) * 2]
            samples = (ctypes.c_short * (len(pcm) // 2)).from_buffer_copy(pcm)
            if max(map(abs, samples), default=0) < 200:
                raise RuntimeError(f'Silent consonant: {name}')
            # The vowel is removed. Short bursts are repeated to make them audible.
            pcm = (pcm + bytes(int(rate * 0.2) * 2)) * 3
            with tempfile.TemporaryDirectory() as temp:
                wav = pathlib.Path(temp) / 'sample.wav'
                with wave.open(str(wav), 'wb') as output:
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(rate)
                    output.writeframes(pcm)
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                                '-af', 'volume=1.4,alimiter=limit=0.89:level=false', '-ar', '22050',
                                '-codec:a', 'libmp3lame', '-b:a', '64k', str(DEST / 'sounds' / f'{name}.mp3')], check=True)
    finally:
        engine.espeak_Terminate()


if __name__ == '__main__':
    if (ROOT / 'src/lib/pronunciation-audio-sources.json').exists():
        raise SystemExit('Human recordings are now bundled. Use scripts/import-pronunciation-audio.py; do not overwrite them with synthesis.')
    jobs = [('sounds', sound, notation) for sound, notation in PHONEMES.items()]
    jobs += [('words', word, phonemes_for_word(ipa)) for word, ipa in WORDS.items()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(generate, jobs))
    generate_context_sounds()
    print(f'Generated {len(PHONEMES)} sound samples and {len(WORDS)} example words.')
