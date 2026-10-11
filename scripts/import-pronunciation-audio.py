#!/usr/bin/env python3
"""Build the bundled human pronunciation clips from the pinned Commons manifest.

Requires FFmpeg. Downloads and source hashes are cached outside the repository.
Only leading/trailing silence, level, and encoding are changed; spoken phonetic
content (including demonstration vowels) is retained.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'src/lib/pronunciation-audio-sources.json'
CACHE = pathlib.Path(tempfile.gettempdir()) / 'echo-human-pronunciation-cache'
TRIM = 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB'


def import_clip(item):
    url, source = item
    if source['kind'] != 'human' or not re.fullmatch(
        r'CC BY(?:-SA)? [\d.]+(?: us)?|Public domain|CC0', source['license']
    ):
        raise ValueError(f'Unapproved source: {url}')
    original = CACHE / hashlib.sha256(source['downloadUrl'].encode()).hexdigest()
    if not original.exists():
        time.sleep(1)
        partial = original.with_suffix('.partial')
        subprocess.run(['curl', '--ipv4', '-A', 'EchoType/1.6 (https://github.com/Talljack/echo-type; pronunciation audio)', '-fsSL', '--retry', '3', '--retry-delay', '5', '--retry-all-errors',
                        '--max-time', '25', source['downloadUrl'], '-o', str(partial)], check=True)
        partial.replace(original)
    digest = hashlib.sha256(original.read_bytes()).hexdigest()
    if source.get('sourceSha256') and digest != source['sourceSha256']:
        raise ValueError(f'Source changed: {url}')
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(original), '-af',
                            'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    match = re.search(r'max_volume: ([-\d.]+) dB', probe.stderr)
    if not match:
        raise ValueError(f'Silent or invalid recording: {url}')
    gain = -3 - float(match.group(1))
    output = ROOT / 'public' / url.lstrip('/')
    output.parent.mkdir(parents=True, exist_ok=True)
    filters = f'{TRIM},areverse,{TRIM},areverse,volume={gain}dB,apad=pad_dur=0.08'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-af', filters,
                    '-ac', '1', '-ar', '48000', '-codec:a', 'libmp3lame', '-b:a', '128k',
                    '-metadata', f"artist={source['creator']}",
                    '-metadata', f"copyright={source['license']} {source['licenseUrl']}",
                    '-metadata', f"comment={source['sourcePage']}; silence trimmed, gain normalized, MP3 encoded",
                    str(output)], check=True)
    source['sourceSha256'] = digest
    source['outputSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    return url, source


if __name__ == '__main__':
    CACHE.mkdir(parents=True, exist_ok=True)
    sources = json.loads(MANIFEST.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        imported = dict(executor.map(import_clip, sources.items()))
    MANIFEST.write_text(json.dumps(imported, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(imported)} attributed human recordings.')
