#!/usr/bin/env python3
"""
Process downloaded word list data and generate JSON files for the echo-type app.
Reads from /tmp/wordbook-raw/ and outputs to public/wordbooks/

Data source: https://github.com/KyleBing/english-vocabulary
Original: https://github.com/kajweb/dict
"""

import json
import os
from pathlib import Path

RAW_DIR = Path("/tmp/wordbook-raw")
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "wordbooks"

# Mapping: our book ID -> list of source JSON filenames (without .json)
BOOK_SOURCES = {
    "cet4": ["CET4_1", "CET4_2", "CET4_3"],
    "cet6": ["CET6_1", "CET6_2", "CET6_3"],
    "tem4": ["Level4_1", "Level4_2"],
    "tem8": ["Level8_1", "Level8_2"],
    "graduate": ["KaoYan_1", "KaoYan_2", "KaoYan_3"],
    "toefl": ["TOEFL_2", "TOEFL_3"],
    "ielts": ["IELTS_2", "IELTS_3"],
    "gre": ["GRE_2"],
    "gmat": ["GMAT_2", "GMAT_3"],
    "sat": ["SAT_2", "SAT_3"],
    "bec": ["BEC_2", "BEC_3"],
    "junior-high": ["ChuZhong_2", "ChuZhong_3"],
    "senior-high": ["GaoZhong_2", "GaoZhong_3"],
    "gaokao2026": ["GaoZhong_2", "GaoZhong_3"],
    "elementary": [
        "PEPXiaoXue3_1", "PEPXiaoXue3_2",
        "PEPXiaoXue4_1", "PEPXiaoXue4_2",
        "PEPXiaoXue5_1", "PEPXiaoXue5_2",
        "PEPXiaoXue6_1", "PEPXiaoXue6_2",
    ],
}

# Words to skip (too basic for typing practice)
SKIP_WORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
    "do", "does", "did", "has", "have", "had", "will", "would", "shall", "should",
    "can", "could", "may", "might", "must", "need", "dare", "ought",
    "i", "me", "my", "mine", "we", "us", "our", "ours",
    "you", "your", "yours", "he", "him", "his", "she", "her", "hers",
    "it", "its", "they", "them", "their", "theirs",
    "this", "that", "these", "those",
    "and", "or", "but", "not", "no", "yes",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "down",
    "if", "so", "as", "than", "then", "too", "also", "very", "just",
}


def extract_sentence(entry: dict) -> str:
    """Extract the first example sentence from a full JSON entry."""
    # Path: content.word.content.sentence.sentences[0].sContent
    try:
        content = entry.get("content", {})
        word_data = content.get("word", {})
        word_content = word_data.get("content", {})
        sentence_data = word_content.get("sentence", {})
        sentences = sentence_data.get("sentences", [])
        if sentences:
            s = sentences[0].get("sContent", "").strip()
            if s:
                return s
    except (AttributeError, IndexError, TypeError):
        pass

    # Fallback: try top-level sentence
    try:
        sentence_data = entry.get("content", {}).get("sentence", {})
        sentences = sentence_data.get("sentences", [])
        if sentences:
            s = sentences[0].get("sContent", "").strip()
            if s:
                return s
    except (AttributeError, IndexError, TypeError):
        pass

    return ""


def extract_word(entry: dict) -> str:
    """Extract the headword from an entry."""
    word = entry.get("headWord", "").strip()
    # Keep original casing for proper display, but normalize for dedup
    return word


def process_book(book_id: str, source_files: list, skip_basic: bool = True) -> list:
    """Process a book by reading and merging source files."""
    print(f"\nProcessing {book_id}...")
    seen_words = set()
    words = []

    for filename in source_files:
        filepath = RAW_DIR / f"{filename}.json"
        if not filepath.exists():
            print(f"  WARNING: {filepath} not found")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            entries = json.load(f)

        print(f"  {filename}: {len(entries)} entries")

        for entry in entries:
            word = extract_word(entry)
            if not word:
                continue
            word_lower = word.lower()
            if word_lower in seen_words:
                continue
            # Skip very basic words for exam books
            if skip_basic and word_lower in SKIP_WORDS:
                continue
            # Skip single-character entries
            if len(word) <= 1:
                continue
            seen_words.add(word_lower)
            sentence = extract_sentence(entry)
            words.append({"word": word_lower, "sentence": sentence})

    # Sort alphabetically
    words.sort(key=lambda x: x["word"])
    print(f"  Total unique words: {len(words)}")
    return words


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summary = {}
    for book_id, sources in BOOK_SOURCES.items():
        # Don't skip basic words for elementary/junior-high
        skip_basic = book_id not in ("elementary",)
        words = process_book(book_id, sources, skip_basic=skip_basic)
        if not words:
            print(f"  SKIPPED: No data for {book_id}")
            continue

        output_file = OUTPUT_DIR / f"{book_id}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(words, f, ensure_ascii=False, separators=(",", ":"))

        file_size = output_file.stat().st_size
        summary[book_id] = {
            "words": len(words),
            "size_kb": round(file_size / 1024, 1),
        }

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    total_words = 0
    total_size = 0
    for book_id, info in sorted(summary.items()):
        print(f"  {book_id:20s}: {info['words']:6d} words  ({info['size_kb']:8.1f} KB)")
        total_words += info["words"]
        total_size += info["size_kb"]
    print(f"  {'TOTAL':20s}: {total_words:6d} words  ({total_size:8.1f} KB)")
    print(f"\nOutput directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
