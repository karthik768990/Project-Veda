# app/matcher.py
import logging
from typing import List, Dict, Any
from math import ceil
from app.config import SIMILARITY_THRESHOLD

logger = logging.getLogger("chandas_analyser.matcher")

def levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    if m == 0:
        return n
    if n == 0:
        return m
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i-1] == b[j-1] else 1
            dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost)
    return dp[m][n]

def _normalize_pattern(p: Any) -> str:
    """
    Normalize DB pattern into compact uppercase 'L'/'G' string.
    Accepts list or spaced string.
    """
    if p is None:
        return ""
    if isinstance(p, list):
        joined = "".join(str(x) for x in p)
    else:
        joined = str(p)
    normalized = "".join(ch for ch in joined.upper() if ch in ("L", "G"))
    return normalized

def find_match_in_db(lg_patterns: List[str], db_chandas: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not lg_patterns:
        return {"identifiedChandas": "Unknown", "similarity": 0.0, "matchedPattern": "", "explanation": "No vowels/syllables detected."}

    combined = "".join(lg_patterns).upper()
    logger.debug("Combined LG pattern: %s", combined)

    best = {"name": "Unknown / Mixed", "similarity": 0.0, "matchedPattern": ""}

    for ch in db_chandas:
        raw = ch.get("pattern", "") or ch.get("patterns") or ch.get("lg") or ""
        candidates = raw if isinstance(raw, list) else [raw]

        for cand in candidates:
            base = _normalize_pattern(cand)
            if not base:
                continue

            rep_times = ceil(max(1, len(combined)) / len(base))
            repeated = (base * rep_times)[:len(combined)]

            distance = levenshtein(combined, repeated)
            similarity = 1.0 - (distance / max(1, len(combined)))

            logger.debug("DB '%s' base='%s' distance=%d similarity=%.3f", ch.get("name","<unnamed>"), base, distance, similarity)

            if similarity > best["similarity"]:
                best = {"name": ch.get("name", "Unknown"), "similarity": similarity, "matchedPattern": base}

    # Anuṣṭubh heuristic:
    if len(combined) % 8 == 0 and len(combined) >= 8:
        padas = [combined[i:i+8] for i in range(0, len(combined), 8)]
        if all(len(p) == 8 and p[4] == "L" and p[5] == "G" for p in padas):
            explanation = f"Matches Anuṣṭubh heuristic (pādas: {len(padas)}). Full pattern: '{combined}'."
            return {"identifiedChandas": "Anuṣṭubh", "similarity": 1.0, "matchedPattern": "LGLLGGLG", "explanation": explanation}

    percent = best["similarity"] * 100.0
    identified = best["name"] if best["similarity"] >= float(SIMILARITY_THRESHOLD) else "Unknown / Mixed"
    explanation = f"Detected pattern ({len(combined)} syllables) matches {best['name']} with {percent:.1f}% confidence.\nCanonical pattern: {best['matchedPattern']}"
    return {"identifiedChandas": identified, "similarity": round(best["similarity"], 4), "matchedPattern": best["matchedPattern"], "explanation": explanation}
