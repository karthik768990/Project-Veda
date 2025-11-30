# app/syllabifier.py
import re
from typing import List
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

VOWELS = "aiuṛḷāīūṝeoṃḥ"   # includes anusvāra/visarga as extra chars for safety
LONG_VOWELS = "āīūṝeo"

def to_iast(text: str) -> str:
    # If text contains Devanagari, transliterate to IAST; otherwise lower-case and return
    if re.search(r"[\u0900-\u097F]", text):
        try:
            return transliterate(text, sanscript.DEVANAGARI, sanscript.IAST).lower()
        except Exception:
            return text.lower()
    return text.lower()

def to_devanagari(text: str) -> str:
    if re.search(r"[\u0900-\u097F]", text):
        return text
    try:
        return transliterate(text, sanscript.IAST, sanscript.DEVANAGARI)
    except Exception:
        return text

def get_lg_pattern(shloka: str) -> List[str]:
    """
    Returns a list of LG patterns (one string per pada) identical to the JS version.
    Behaviour preserved: diphthongs ai/au, long vowels, visarga/anusvara treated as Guru,
    consonant cluster rule => Guru, punctuation/digits removed before processing.
    """
    pada_list = [p.strip() for p in re.split(r"[|।॥\n]+", shloka) if p.strip()]
    patterns: List[str] = []

    for pada in pada_list:
        iast = to_iast(pada)
        # remove punctuation/digits/spaces (mirror JS: iast.replace(/[.\d\s]+/g, ""))
        iast = re.sub(r"[.\d\s]+", "", iast)

        pattern = ""
        i = 0
        while i < len(iast):
            ch = iast[i]
            if ch not in VOWELS:
                i += 1
                continue

            # diphthong ai/au handling
            nxt = iast[i+1] if i+1 < len(iast) else ""
            nxt2 = iast[i+2] if i+2 < len(iast) else ""

            if ch == "a" and nxt in ("i", "u"):
                pattern += "G"
                i += 2
                continue

            if ch in LONG_VOWELS:
                pattern += "G"
                i += 1
                continue

            if nxt in ("ṃ", "ḥ"):
                pattern += "G"
                i += 1
                continue

            # consonant cluster (next1 and next2 not vowels) => Guru
            if (nxt and nxt not in VOWELS) and (nxt2 and nxt2 not in VOWELS):
                pattern += "G"
                i += 1
                continue

            pattern += "L"
            i += 1

        patterns.append(pattern)
    return patterns
