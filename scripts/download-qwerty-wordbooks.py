#!/usr/bin/env python3
"""
Download word lists from qwerty-learner and convert to echo-type format.
Output: public/wordbooks/{bookId}.json with [{word, sentence}] format.
"""

import json
import os
import urllib.request
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "wordbooks"
BASE_URL = "https://raw.githubusercontent.com/RealKai42/qwerty-learner/master/public/dicts"

# Mapping: our book ID -> (remote filename(s), description)
DOWNLOADS = {
    # Exam & Certification
    "toeic": (["TOEIC.json"], "TOEIC"),
    "ket": (["ket2021.json"], "KET 2021"),
    "pet": (["pet-vacabulary-list-2024.json"], "PET 2024"),
    "pets3": (["PETS3-2023.json"], "PETS-3 2023"),
    "hongbaoshu": (["hongbaoshu-2026.json"], "红宝书 2026"),

    # Core Vocabulary
    "oxford3000": (["Oxford3000.json"], "Oxford 3000"),
    "oxford5000": (["Oxford5000.json"], "Oxford 5000"),
    "coca20000": (["coca20000.json"], "COCA 20000"),
    "essential4000": (["4000_Essential_English_Words-sentence.json"], "4000 Essential Words"),

    # New Concept English
    "nce1": (["nce-new-1.json"], "NCE Book 1"),
    "nce2": (["nce-new-2.json"], "NCE Book 2"),
    "nce3": (["nce-new-3.json"], "NCE Book 3"),
    "nce4": (["nce-new-4.json"], "NCE Book 4"),

    # Tech / Professional
    "it-words": (["it-words.json"], "IT Words"),
    "it-vocab": (["itVocabulary.json"], "IT Vocabulary"),
    "ai-science": (["ai_for_science.json"], "AI for Science"),
    "ai-ml": (["ai_machine_learning.json"], "AI & Machine Learning"),
    "biomedical": (["BIOmedical.json"], "Biomedical"),
}


def download_file(url: str) -> list:
    """Download a JSON file from URL."""
    print(f"  Downloading {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "echo-type-wordbook-gen/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def convert_qwerty_format(entries: list) -> list:
    """
    Convert qwerty-learner format to echo-type format.
    Input:  [{"name": "word", "trans": ["释义"], "usphone": "...", "ukphone": "..."}]
    Output: [{"word": "word", "sentence": "释义"}]

    Some files use different field names, so we handle variants.
    """
    words = []
    seen = set()
    for entry in entries:
        # Get the word - try different field names
        word = (
            entry.get("name", "")
            or entry.get("word", "")
            or entry.get("headWord", "")
        ).strip()

        if not word or len(word) <= 1:
            continue

        word_lower = word.lower()
        if word_lower in seen:
            continue
        seen.add(word_lower)

        # Get sentence/translation - try different sources
        sentence = ""

        # Try "sentence" field first (4000 Essential Words has this)
        if "sentence" in entry and entry["sentence"]:
            sentence = entry["sentence"].strip()

        # Try "trans" array (most qwerty-learner files)
        if not sentence and "trans" in entry:
            trans = entry["trans"]
            if isinstance(trans, list) and trans:
                sentence = "; ".join(str(t) for t in trans if t)

        # Try "translation" field
        if not sentence and "translation" in entry:
            sentence = str(entry["translation"]).strip()

        # Fallback to word itself
        if not sentence:
            sentence = word

        words.append({"word": word_lower, "sentence": sentence})

    words.sort(key=lambda x: x["word"])
    return words


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summary = {}
    errors = []

    for book_id, (filenames, label) in DOWNLOADS.items():
        print(f"\nProcessing {label} ({book_id})...")
        all_entries = []

        for filename in filenames:
            url = f"{BASE_URL}/{filename}"
            try:
                entries = download_file(url)
                all_entries.extend(entries)
                print(f"  {filename}: {len(entries)} entries")
            except Exception as e:
                print(f"  ERROR downloading {filename}: {e}")
                errors.append((book_id, filename, str(e)))

        if not all_entries:
            print(f"  SKIPPED: No data for {book_id}")
            continue

        words = convert_qwerty_format(all_entries)

        output_file = OUTPUT_DIR / f"{book_id}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(words, f, ensure_ascii=False, separators=(",", ":"))

        file_size = output_file.stat().st_size
        summary[book_id] = {
            "label": label,
            "words": len(words),
            "size_kb": round(file_size / 1024, 1),
        }
        print(f"  Output: {len(words)} words ({file_size / 1024:.1f} KB)")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    total_words = 0
    total_size = 0
    for book_id, info in sorted(summary.items()):
        print(f"  {book_id:20s} ({info['label']:25s}): {info['words']:6d} words  ({info['size_kb']:8.1f} KB)")
        total_words += info["words"]
        total_size += info["size_kb"]
    print(f"  {'TOTAL':48s}: {total_words:6d} words  ({total_size:8.1f} KB)")

    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for book_id, filename, err in errors:
            print(f"  {book_id}/{filename}: {err}")

    print(f"\nOutput directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
