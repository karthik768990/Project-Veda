# app/syllabifier.py
import re
import logging
from typing import List
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

logger = logging.getLogger(__name__)

# vowel sets — keep IAST tokens and mark long vowels & diphthongs
DIPHTHONGS = ("ai", "au")
LONG_VOWELS = ("ā", "ī", "ū", "ṝ")  # treat these as inherently Guru
SIMPLE_VOWELS = ("a", "i", "u", "e", "o", "ṛ", "ḷ")
SPECIALS = ("ṃ", "ṁ", "ḥ")  # anusvara / visarga as Guru markers

ALL_VOWELS = DIPHTHONGS + LONG_VOWELS + SIMPLE_VOWELS + SPECIALS

_non_vowel_chars_re = re.compile(r"[^a-zāīūṛṝḷṃṁḥ\s\-]")

def to_iast(text: str) -> str:
    if re.search(r"[\u0900-\u097F]", text):
        try:
            return transliterate(text, sanscript.DEVANAGARI, sanscript.IAST).lower()
        except Exception as e:
            logger.exception("Transliteration error: %s", e)
            return text.lower()
    return text.lower()

def get_lg_pattern(shloka: str) -> List[str]:
    """
    Returns LG pattern list (one string per pada).
    Heuristics:
      - Dipthongs ai/au and long vowels -> Guru
      - vowel followed by anusvara/visarga -> Guru
      - consonant cluster (>=2 consonants before next vowel) -> Guru
    """
    # split by danda / newline
    padas = [p.strip() for p in re.split(r"[|।॥\n]+", shloka) if p.strip()]
    patterns: List[str] = []

    for pada in padas:
        iast = to_iast(pada)
        # remove digits/punctuation but keep diacritics & anusa/visarga
        iast = re.sub(r"[.\d\s]+", "", iast)
        iast = _non_vowel_chars_re.sub("", iast)

        pattern = ""
        # find vowels by scanning but prefer diphthongs first
        i = 0
        while i < len(iast):
            # attempt diphthong match
            two = iast[i:i+2]
            ch = iast[i]

            if two in DIPHTHONGS:
                # diphthong -> Guru
                pattern += "G"
                i += 2
                continue

            if ch in LONG_VOWELS:
                pattern += "G"
                i += 1
                continue

            if ch in SIMPLE_VOWELS:
                # check next two chars to evaluate cluster
                nxt = iast[i+1] if i+1 < len(iast) else ""
                nxt2 = iast[i+2] if i+2 < len(iast) else ""

                # if next is anusvara/visarga -> Guru
                if nxt in SPECIALS:
                    pattern += "G"
                    i += 1
                    continue

                # consonant cluster rule: if next two are non-vowels -> Guru
                # (use vowel membership to decide)
                def is_vowel_char(c):
                    return any(c.startswith(v) for v in ALL_VOWELS) if c else False

                cond1 = nxt and (nxt not in ALL_VOWELS)
                cond2 = nxt2 and (nxt2 not in ALL_VOWELS)
                if cond1 and cond2:
                    pattern += "G"
                    i += 1
                    continue

                pattern += "L"
                i += 1
                continue

            # not a vowel -> skip
            i += 1

        patterns.append(pattern)

    logger.debug("get_lg_pattern input='%s' -> patterns=%s", shloka, patterns)
    return patterns
