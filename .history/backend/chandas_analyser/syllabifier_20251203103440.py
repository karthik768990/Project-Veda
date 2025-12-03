# backend/chandas_analyser/syllabifier.py
import re
import logging
from typing import List
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

logger = logging.getLogger("chandas_analyser.syllabifier")

DIPHTHONGS = ("ai", "au")
LONG_VOWELS = ("ā", "ī", "ū", "ṝ")
SIMPLE_VOWELS = ("a", "i", "u", "e", "o", "ṛ", "ḷ")
SPECIALS = ("ṃ", "ṁ", "ḥ")
ALL_VOWELS = DIPHTHONGS + LONG_VOWELS + SIMPLE_VOWELS + SPECIALS

_non_vowel_chars_re = re.compile(r"[^a-zāīūṛṝḷṃṁḥ]")

def to_iast(text: str) -> str:
    if re.search(r"[\u0900-\u097F]", text):
        try:
            return transliterate(text, sanscript.DEVANAGARI, sanscript.IAST).lower()
        except Exception as e:
            logger.exception("Transliteration error to IAST: %s", e)
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
    padas = [p.strip() for p in re.split(r"[|।॥\n]+", shloka) if p.strip()]
    patterns: List[str] = []

    for pada in padas:
        iast = to_iast(pada)
        iast = re.sub(r"[.\d\s]+", "", iast)
        iast = _non_vowel_chars_re.sub("", iast)

        pattern = ""
        i = 0
        while i < len(iast):
            two = iast[i:i+2]
            ch = iast[i] if i < len(iast) else ""

            if two in DIPHTHONGS:
                pattern += "G"; i += 2; continue
            if ch in LONG_VOWELS:
                pattern += "G"; i += 1; continue
            if ch in SIMPLE_VOWELS:
                nxt = iast[i+1] if i+1 < len(iast) else ""
                nxt2 = iast[i+2] if i+2 < len(iast) else ""
                if nxt in SPECIALS:
                    pattern += "G"; i += 1; continue
                cond1 = nxt and (nxt not in ALL_VOWELS)
                cond2 = nxt2 and (nxt2 not in ALL_VOWELS)
                if cond1 and cond2:
                    pattern += "G"; i += 1; continue
                pattern += "L"; i += 1; continue
            i += 1

        patterns.append(pattern)

    logger.debug("get_lg_pattern input='%s' -> %s", shloka, patterns)
    return patterns
