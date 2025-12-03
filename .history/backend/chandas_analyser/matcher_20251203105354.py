# app/matcher.py
import logging
from typing import List, Dict, Any
from math import ceil
from chandas_analyser.config import SIMILARITY_THRESHOLD

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


def _normalize_pattern_to_padas(raw: Any) -> List[str]:
    """
    Normalize a DB 'pattern' into a list of per-pada compact 'L'/'G' strings.
    Accepts:
      - "LGLGLG|LGLGLG" -> ["LGLGLG","LGLGLG"]
      - "L G L G L G" -> ["LGLGLG"] (single string)
      - ["LGLGLG","LGLGLG"] -> same
      - "LGLG" -> ["LGLG"]
    Always strips any characters except L/G and returns uppercase strings per pada.
    """
    if raw is None:
        return []
    # If list -> use items
    if isinstance(raw, list):
        items = raw
    else:
        items = [str(raw)]

    # If a single string contains '|' split into pada parts
    if len(items) == 1:
        s = items[0]
        # if pipe present -> split into padas
        if "|" in s:
            parts = [p for p in s.split("|") if p.strip()]
            items = parts
        else:
            # otherwise keep as one piece (may contain spaces)
            items = [s]

    # Normalize each item: remove spaces & any non L/G
    normalized = []
    for itm in items:
        if itm is None:
            continue
        # accept also arrays where each element might have spaces
        st = str(itm).upper()
        # Keep only L or G characters
        compact = "".join(ch for ch in st if ch in ("L", "G"))
        if compact:
            normalized.append(compact)
    return normalized


def _pad_or_truncate(pattern: str, length: int) -> str:
    """
    Repeat (concatenate) pattern until length reached, then truncate to 'length'.
    If pattern is empty, return empty string of requested length (will produce distance = length).
    """
    if not pattern:
        return "".ljust(length)
    rep = ceil(length / max(1, len(pattern)))
    return (pattern * rep)[:length]


def find_match_in_db(lg_patterns: List[str], db_chandas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Per-pada matching:
    - lg_patterns: list of strings (one per pada) extracted from input
    - db_chandas: list of dicts from DB; 'pattern' may be string, spaced, list, or '|' separated
    Scoring:
    - Compute per-pada similarity (1 - lev_dist / pada_len). If lengths mismatch, we align by truncating/repeating DB pada pattern.
    - Final similarity is average of per-pada similarities (padas present in the input).
    - Bonus: prefer DB entries with same number of padas or with syllables_per_pada hint.
    """
    if not lg_patterns:
        return {"identifiedChandas": "Unknown", "similarity": 0.0, "matchedPattern": "", "explanation": "No vowels/syllables detected."}

    input_padas = [p.upper() for p in lg_patterns]
    num_padas = len(input_padas)
    input_lengths = [len(p) for p in input_padas]

    logger.debug("find_match_in_db: input_padas=%s lengths=%s", input_padas, input_lengths)

    best = {"name": "Unknown / Mixed", "similarity": 0.0, "matchedPattern": ""}

    for ch in db_chandas:
        raw = ch.get("pattern") or ch.get("patterns") or ch.get("lg") or ""
        db_padas = _normalize_pattern_to_padas(raw)

        # If DB has one compact pattern but input has multiple padas, we'll split/truncate later by repeating base
        if len(db_padas) == 0:
            continue

        # Build per-pada db strings aligned to input padas
        per_pada_db = []
        if len(db_padas) == num_padas:
            # same count — align 1:1
            for i in range(num_padas):
                per_pada_db.append(_pad_or_truncate(db_padas[i], input_lengths[i]))
        elif len(db_padas) > 1 and len(db_padas) != num_padas:
            # DB has multiple padas but count mismtach — try to align by repeating or truncating DB padas sequence
            # repeat the sequence to match num_padas
            rep = ceil(num_padas / len(db_padas))
            seq = (db_padas * rep)[:num_padas]
            for i, dp in enumerate(seq):
                per_pada_db.append(_pad_or_truncate(dp, input_lengths[i]))
        else:
            # db_padas has single base pattern (or fewer) — repeat/truncate to each input pada length
            base = db_padas[0]
            for i in range(num_padas):
                per_pada_db.append(_pad_or_truncate(base, input_lengths[i]))

        # compute per-pada similarities
        total_sim = 0.0
        valid_counts = 0
        for i in range(num_padas):
            inp = input_padas[i]
            dbp = per_pada_db[i] if i < len(per_pada_db) else ""
            # if both empty -> perfect match
            if len(inp) == 0 and len(dbp) == 0:
                sim = 1.0
            else:
                dist = levenshtein(inp, dbp)
                sim = 1.0 - (dist / max(1, len(inp)))
                if sim < 0:
                    sim = 0.0
            total_sim += sim
            valid_counts += 1

            logger.debug("DB '%s' pada %d: inp=%s db=%s dist=%d sim=%.3f", ch.get("name","<unnamed>"), i, inp, dbp, levenshtein(inp, dbp), sim)

        avg_sim = (total_sim / valid_counts) if valid_counts else 0.0

        # small bonus/penalty heuristics
        bonus = 0.0
        # if DB stored 'syllables_per_pada' and matches input pada length, add tiny bonus
        sp_p = ch.get("syllables_per_pada")
        if sp_p and isinstance(sp_p, int):
            if all(sp_p == L for L in input_lengths):
                bonus += 0.08  # prefer exact syllable-per-pada matches

        # if DB has same number of padas, small bonus
        if len(_normalize_pattern_to_padas(raw)) == num_padas:
            bonus += 0.03

        final_score = max(0.0, min(1.0, avg_sim + bonus))

        logger.debug("Candidate '%s' avg_sim=%.4f bonus=%.3f final=%.4f", ch.get("name","<unnamed>"), avg_sim, bonus, final_score)

        if final_score > best["similarity"]:
            best = {"name": ch.get("name", "Unknown"), "similarity": final_score, "matchedPattern": "|".join(_normalize_pattern_to_padas(raw))}

    # Apply Anuṣṭubh exact heuristic as high confidence override (preserve existing behavior)
    combined = "".join(input_padas)
    if len(combined) % 8 == 0 and len(combined) >= 8:
        padas = [combined[i:i+8] for i in range(0, len(combined), 8)]
        if all(len(p) == 8 and p[4] == "L" and p[5] == "G" for p in padas):
            return {"identifiedChandas": "Anuṣṭubh", "similarity": 1.0, "matchedPattern": "LGLLGGLG", "explanation": f"Matches Anuṣṭubh heuristic (pādas: {len(padas)}). Full pattern: '{combined}'."}

    identified = best["name"] if best["similarity"] >= float(SIMILARITY_THRESHOLD) else "Unknown / Mixed"
    explanation = f"Detected average per-pada similarity {best['similarity']*100:.1f}% vs DB canonical '{best['matchedPattern']}'"
    return {"identifiedChandas": identified, "similarity": round(best["similarity"], 4), "matchedPattern": best["matchedPattern"], "explanation": explanation}