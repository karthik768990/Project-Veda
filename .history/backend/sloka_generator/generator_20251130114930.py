# app/generator.py
import os
import re
import httpx
import asyncio
from typing import Optional, Dict, Any
from .syllabifier import get_lg_pattern, to_iast, to_devanagari
from .matcher import find_match_in_db
from .supabase_service import get_chandas_cached
from .config import SIMILARITY_THRESHOLD

# Config placeholders — set via env
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://api.yourgeneration.endpoint/v1/generate")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "paste-your-key-here")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview") 

#TODO redesign it to the env setup

DEFAULT_MAX_ATTEMPTS = 5
TIMEOUT = 30.0

def build_prompt(chandas_name: str, context: str, language: str="devanagari", extra_instructions: Optional[str]=None) -> str:
    # You can add more constraints (e.g., exact number of pādas, rhyme, words).
    chandas_hint = {
        "Anuṣṭubh": "Each pāda must be 8 syllables. 5th syllable Laghu, 6th syllable Guru.",
        "Triṣṭubh": "Each pāda must be 11 syllables..."  # extend as needed
    }.get(chandas_name, "Follow the canonical meter for " + chandas_name + ".")

    lang_note = "Output must be in Devanagari." if language == "devanagari" else "Output must be in IAST transliteration (Latin with diacritics)."

    prompt = f"""
You are a classical Sanskrit poet and prosody expert.
Produce exactly one śloka (no extra commentary) that satisfies:
- Chandas: {chandas_name}. {chandas_hint}
- Context / topic: {context}
- {lang_note}
Output format MUST be:
---BEGIN_SHLOKA---
<the shloka lines>
---END_SHLOKA---
---META---
Please include a single-line 'syllable_pattern' (LG pattern per pada separated by |) and a one-line 'explanation'.
---END_META---
{extra_instructions or ""}
"""
    return prompt

async def call_gemini(prompt: str) -> str:
    # Generic HTTP wrapper: adapt per actual Gemini API contract.
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}", "Content-Type":"application/json"}
    body = {
        "model": GEMINI_MODEL,
        "prompt": prompt,
        "max_output_tokens": 512,
        # you may add temperature, top_p, etc here
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(GEMINI_API_URL, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        # The exact JSON shape depends on provider. Try common keys then fallback.
        text = None
        # example: data.get("output", {}).get("text")
        if isinstance(data, dict):
            if "output" in data and isinstance(data["output"], dict):
                text = data["output"].get("text")
            elif "candidates" in data:
                # some APIS put text in candidates[0].content etc.
                candidates = data.get("candidates")
                if candidates and isinstance(candidates, list):
                    text = candidates[0].get("content") or candidates[0].get("text")
            else:
                # fallback to raw json->string
                text = data.get("text") or data.get("response") or str(data)
        if text is None:
            text = str(data)
        return text

def extract_shloka_and_meta(generated_text: str) -> Dict[str, str]:
    # parse BEGIN/END blocks
    shloka = ""
    meta = ""
    m = re.search(r"---BEGIN_SHLOKA---(.*?)---END_SHLOKA---", generated_text, re.S)
    if m:
        shloka = m.group(1).strip()
    m2 = re.search(r"---META---(.*?)---END_META---", generated_text, re.S)
    if m2:
        meta = m2.group(1).strip()
    return {"shloka": shloka, "meta": meta, "raw": generated_text}

async def generate_and_verify(chandas_name: str, context: str, language: str="devanagari", max_attempts: int=DEFAULT_MAX_ATTEMPTS) -> Dict[str, Any]:
    attempts = []
    # load DB to provide canonical pattern as hint (optional)
    db = await get_chandas_cached()
    canonical = next((c for c in db if c.get("name","").lower() == chandas_name.lower()), None)
    extra_instructions = ""
    if canonical:
        pat = canonical.get("pattern")
        extra_instructions = f"Canonical LG pattern (for guidance): {pat}"

    for attempt in range(1, max_attempts+1):
        prompt = build_prompt(chandas_name, context, language, extra_instructions)
        gen_text = await call_gemini(prompt)
        parsed = extract_shloka_and_meta(gen_text)
        shloka_text = parsed["shloka"] or gen_text  # fallback to whole text

        # Analyze using your analyser
        lg_patterns = get_lg_pattern(shloka_text)
        match = find_match_in_db(lg_patterns, db)

        attempts.append({
            "attempt": attempt,
            "generated_raw": gen_text,
            "parsed_shloka": shloka_text,
            "lg_patterns": lg_patterns,
            "match": match
        })

        # success condition
        ok = False
        # If analyser identified same chandas OR similarity high enough OR special-case
        if match.get("identifiedChandas", "").lower().startswith(chandas_name.lower()):
            ok = True
        elif "confidence" in match:
            # defensive: if match reports numeric confidence (some variants)
            try:
                conf = float(match.get("confidence", 0))
                if conf >= SIMILARITY_THRESHOLD:
                    ok = True
            except Exception:
                pass
        else:
            # fallback: if match similarity >= threshold inside match explanation (we used similarity score)
            if "matches" in match.get("explanation","") or match.get("identifiedChandas","") != "Unknown / Mixed":
                ok = True

        if ok:
            return {"success": True, "attempts": attempts, "final": attempts[-1]}

        # otherwise adjust instructions (e.g., be stricter) and retry
        extra_instructions = "Be stricter about the meter: ensure the LG pattern exactly matches the canonical pattern provided. If not possible, produce the closest match and show the syllable pattern."

    # exhausted
    return {"success": False, "attempts": attempts, "final": attempts[-1] if attempts else None}
