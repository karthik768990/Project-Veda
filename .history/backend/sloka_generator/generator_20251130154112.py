# sloka_generator/generator.py
import os
import httpx
import json
import re
import asyncio
import logging
from typing import Optional, Dict, Any

from dotenv import load_dotenv

# try to import official SDK; if missing fall back later
try:
    import google.generativeai as genai
    _HAS_GENAI = True
except Exception:
    genai = None
    _HAS_GENAI = False

# analyser imports (these must be available in your project)
try:
    from chandas_analyser.syllabifier import get_lg_pattern, to_iast, to_devanagari
    from chandas_analyser.matcher import find_match_in_db
    from chandas_analyser.local_loader import get_chandas_cached
    from chandas_analyser.config import SIMILARITY_THRESHOLD
except Exception:
    # graceful fallback: keep file importable for testing
    get_lg_pattern = lambda x: []
    find_match_in_db = lambda x, y: {}
    async def get_chandas_cached(): return []
    SIMILARITY_THRESHOLD = 0.7

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
# Note: if you previously used GEMINI_API_BASE, the SDK takes care of endpoints.

DEFAULT_MAX_ATTEMPTS = 5
TIMEOUT = 30.0

# Setup logging
logger = logging.getLogger("sloka_generator")
logging.basicConfig(level=logging.INFO)

# Configure SDK if available
if _HAS_GENAI:
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; generator will fail until set.")
    else:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            logger.info("Configured google.generativeai SDK.")
        except Exception as e:
            logger.warning(f"Failed to configure google.generativeai SDK: {e}")

# ---------------- prompt + parsing ----------------
def build_prompt(chandas_name: str, context: str, language: str="devanagari", extra_instructions: Optional[str]=None) -> str:
    chandas_hint = {
        "Anuṣṭubh": "Each pāda must be 8 syllables. 5th syllable Laghu, 6th syllable Guru.",
        "Triṣṭubh": "Each pāda must be 11 syllables."
    }.get(chandas_name, "Follow the canonical meter for " + chandas_name + ".")
    lang_note = "Output must be in Devanagari." if language == "devanagari" else "Output must be in IAST (Latin)."

    # Strong deterministic prompt: ask for only the block.
    prompt = f"""You are a classical Sanskrit poet and prosody expert.
Produce EXACTLY one śloka in {language} that satisfies the following constraints:
1) Chandas: {chandas_name}. {chandas_hint}
2) Context / topic: {context}
3) Output only the exact blocks below — no explanation, no extra text.

---BEGIN_SHLOKA---
<the shloka lines in one or more lines>
---END_SHLOKA---
---META---
syllable_pattern: <LG pattern per pada separated by |>
explanation: <one-line justification>
---END_META---

{extra_instructions or ""}
"""
    return prompt

# Robust extraction with Devanagari fallback
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F\s।॥,०-९\-]+", re.U)

def extract_shloka_and_meta(generated_text: str) -> Dict[str, str]:
    shloka = ""
    meta = ""

    m = re.search(r"---BEGIN_SHLOKA---(.*?)---END_SHLOKA---", generated_text, re.S)
    if m:
        shloka = m.group(1).strip()
    else:
        # fallback: largest Devanagari block
        blocks = DEVANAGARI_RE.findall(generated_text)
        blocks = [b.strip() for b in blocks if len(b.strip()) > 8]
        if blocks:
            shloka = max(blocks, key=len)
        else:
            # final fallback: take first 4 lines that look like a verse
            lines = [ln.strip() for ln in generated_text.splitlines() if ln.strip()]
            shloka = "\n".join(lines[:4])

    m2 = re.search(r"---META---(.*?)---END_META---", generated_text, re.S)
    if m2:
        meta = m2.group(1).strip()

    return {"shloka": shloka, "meta": meta, "raw": generated_text}

# ---------------- SDK wrapper ----------------


# Ensure GEMINI_API_KEY and GEMINI_MODEL are set earlier in the file
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

async def _generate_with_sdk_async(prompt: str) -> str:
    """
    Use Google Generative Language REST endpoint via httpx.
    Returns the generated text (string) or raises RuntimeError on failure.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in environment (.env).")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    # Google expects the 'contents.parts' body
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        # Optionally you can set temperature, maxOutputTokens etc:
        # "temperature": 0.0,
        # "maxOutputTokens": 512
    }

    headers = {"Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            # Try common response shapes:
            # 1) data["candidates"][0]["content"]
            if isinstance(data, dict):
                cand = data.get("candidates") or data.get("outputs") or data.get("output", {}).get("candidates")
                if cand and isinstance(cand, list) and len(cand) > 0:
                    first = cand[0]
                    # candidate may have 'content', 'text', or nested fields
                    text = first.get("content") or first.get("text") or first.get("output")
                    if text:
                        return text if isinstance(text, str) else json.dumps(text)

                # 2) data["output"]["text"]
                out_text = None
                if "output" in data and isinstance(data["output"], dict):
                    out_text = data["output"].get("text")
                if out_text:
                    return out_text

                # 3) data.get("text") or generic fallback
                if "text" in data and isinstance(data["text"], str):
                    return data["text"]

            # Final fallback: return the whole JSON string so caller can inspect
            return json.dumps(data)

    except httpx.HTTPStatusError as e:
        # Include server response body in error for debugging
        body_text = e.response.text if e.response is not None else "<no body>"
        raise RuntimeError(f"Gemini API HTTP {e.response.status_code}: {body_text}") from e
    except httpx.RequestError as e:
        raise RuntimeError(f"Network error when contacting Gemini REST API: {e}") from e

# ---------------- public generate_and_verify ----------------
async def generate_and_verify(chandas_name: str, context: str, language: str="devanagari", max_attempts: int=DEFAULT_MAX_ATTEMPTS) -> Dict[str, Any]:
    # ensure DB loaded
    try:
        db = await get_chandas_cached()
    except Exception as e:
        logger.warning(f"Failed to load chandas DB: {e}")
        db = []

    canonical = next((c for c in db if c.get("name","").lower() == chandas_name.lower()), None)
    extra_instructions = ""
    if canonical:
        pat = canonical.get("pattern")
        extra_instructions = f"Canonical LG pattern (for guidance): {pat}"

    attempts = []

    for attempt in range(1, max_attempts+1):
        logger.info(f"Attempt {attempt}/{max_attempts} for chandas={chandas_name}")
        prompt = build_prompt(chandas_name, context, language, extra_instructions)

        # generate text (via SDK wrapper)
        try:
            gen_text = await _generate_with_sdk_async(prompt)
            if not isinstance(gen_text, str):
                gen_text = str(gen_text)
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return {"success": False, "error": f"Generation failed: {e}"}

        parsed = extract_shloka_and_meta(gen_text)
        shloka_text = parsed["shloka"]

        # Analyse
        lg_patterns = get_lg_pattern(shloka_text)
        match = find_match_in_db(lg_patterns, db)

        attempts.append({
            "attempt": attempt,
            "generated_raw": gen_text,
            "parsed_shloka": shloka_text,
            "lg_patterns": lg_patterns,
            "match": match
        })

        # success check
        ok = False
        identified = (match.get("identifiedChandas") or "").lower()
        # name match
        if identified and identified.startswith(chandas_name.lower()):
            ok = True
        # numeric confidence check
        conf = match.get("similarity") or match.get("confidence") or 0
        try:
            if float(conf) >= SIMILARITY_THRESHOLD:
                ok = True
        except Exception:
            pass

        if ok:
            logger.info(f"Success on attempt {attempt}")
            return {"success": True, "attempts": attempts, "final": attempts[-1]}

        # tighten instructions for next attempt
        extra_instructions = f"Previous attempt matched {identified or 'none'}. Please strictly adhere to the {chandas_name} meter in Devanagari only. Output ONLY the required blocks."

    return {"success": False, "attempts": attempts, "final": attempts[-1] if attempts else None}
