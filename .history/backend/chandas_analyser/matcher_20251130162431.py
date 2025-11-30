# app/matcher.py
from typing import List, Dict, Any
import math


def levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    if m == 0: return n
    if n == 0: return m
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

def find_match_in_db(lg_patterns: List[str], db_chandas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Mirrors the JS findMatchInDb:
    - Joins LG patterns -> combined
    - For each db pattern: repeat/truncate to combined length, compute edit distance, similarity
    - Threshold 0.7 => declare match
    - If combined length divisible by 8, test Anuṣṭubh special-case
    """
    if not lg_patterns or len(lg_patterns) == 0:
        return {"identifiedChandas": "Unknown", "explanation": "Input was empty or contained no recognizable vowels."}

    combined = "".join(lg_patterns)

    best_match = {"name": "Unknown / Mixed", "similarity": 0.0, "matchedPattern": ""}

    for ch in db_chandas:
        base = ch.get("pattern")
        if isinstance(base, list):
            base = base[0] if len(base) > 0 else ""
        if not isinstance(base, str) or base.strip() == "":
            continue

        # repeat base to approximate total length and truncate (same as JS)
        repeat_times = -(-len(combined) // len(base))  # ceil division
        repeated = (base * repeat_times)[:len(combined)]

        distance = levenshtein(combined, repeated)
        similarity = 1 - (distance / max(1, len(combined)))

        if similarity > best_match["similarity"]:
            best_match = {"name": ch.get("name", "Unknown"), "similarity": similarity, "matchedPattern": base}

    # threshold logic (0.7)
    if best_match["similarity"] >= 0.7:
        return {
            "identifiedChandas": best_match["name"],
            "explanation": f"Detected pattern ({len(combined)} syllables) matches {best_match['name']} with {(best_match['similarity']*100):.1f}% confidence.\nCanonical pattern: {best_match['matchedPattern']}"
        }

    # Anuṣṭubh check (every 8-syllable pada must have 5th L and 6th G)
    if len(combined) % 8 == 0:
        padas = [combined[i:i+8] for i in range(0, len(combined), 8)]
        ok = all(len(p) == 8 and p[4] == "L" and p[5] == "G" for p in padas)
        if ok:
            return {"identifiedChandas": "Anuṣṭubh", "explanation": "Matches Anuṣṭubh (8-syllable pādas, 5th Laghu, 6th Guru)."}

    return {"identifiedChandas": "Unknown / Mixed", "explanation": f"Could not match any standard Chandas. Full pattern: '{combined}' (length {len(combined)})."}
