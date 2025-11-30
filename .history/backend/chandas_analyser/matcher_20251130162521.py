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
    Improved matcher:
    - Accepts db pattern as string or list of strings (alternates)
    - Computes numeric similarity and returns it as 'similarity' (0..1)
    - Returns structured dict including 'identifiedChandas', 'similarity', 'matchedPattern', 'explanation'
    - Keeps Anuṣṭubh heuristic and sets similarity to 1.0 when it matches
    """
    if not lg_patterns or len(lg_patterns) == 0:
        return {"identifiedChandas": "Unknown", "similarity": 0.0, "explanation": "Input was empty or contained no recognizable vowels."}

    combined = "".join(lg_patterns)

    best = {"name": "Unknown / Mixed", "similarity": 0.0, "matchedPattern": ""}

    for ch in db_chandas:
        base_raw = ch.get("pattern", "")
        # allow list of patterns or single string
        bases = base_raw if isinstance(base_raw, list) else [base_raw]

        for base in bases:
            if not isinstance(base, str) or base.strip() == "":
                continue

            # repeat base to approximate total length and truncate (same as JS)
            repeat_times = -(-len(combined) // len(base))  # ceil division
            repeated = (base * repeat_times)[:len(combined)]

            distance = levenshtein(combined, repeated)
            similarity = 1 - (distance / max(1, len(combined)))

            if similarity > best["similarity"]:
                best = {"name": ch.get("name", "Unknown"), "similarity": similarity, "matchedPattern": base}

    # Anuṣṭubh check (every 8-syllable pada must have 5th L and 6th G)
    if len(combined) % 8 == 0:
        padas = [combined[i:i+8] for i in range(0, len(combined), 8)]
        ok = all(len(p) == 8 and p[4] == "L" and p[5] == "G" for p in padas)
        if ok:
            # high confidence for Anuṣṭubh heuristic
            return {
                "identifiedChandas": "Anuṣṭubh",
                "similarity": 1.0,
                "matchedPattern": "LGLLGGLG",
                "explanation": f"Matches Anuṣṭubh (8-syllable pādas, 5th Laghu, 6th Guru). Full pattern: '{combined}'"
            }

    # threshold logic (0.7) — return structured data including numeric similarity
    if best["similarity"] >= 0.0:
        # Build an explanation string containing percentage for backwards compatibility
        percent = best["similarity"] * 100.0
        explanation = f"Detected pattern ({len(combined)} syllables) matches {best['name']} with {percent:.1f}% confidence.\nCanonical pattern: {best['matchedPattern']}"
        # if similarity below threshold, still return similarity but mark identified accordingly
        identified = best["name"] if best["similarity"] >= 0.7 else "Unknown / Mixed"
        return {
            "identifiedChandas": identified,
            "similarity": best["similarity"],
            "matchedPattern": best["matchedPattern"],
            "explanation": explanation
        }

    # Fallback
    return {"identifiedChandas": "Unknown / Mixed", "similarity": 0.0, "explanation": f"Could not match any standard Chandas. Full pattern: '{combined}' (length {len(combined)})."}
