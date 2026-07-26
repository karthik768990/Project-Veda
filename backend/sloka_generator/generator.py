import os
import json
import re
import logging
from typing import Optional, Dict, Any

from dotenv import load_dotenv

try:
    from google import genai
    _HAS_GENAI = True
except Exception:
    genai = None
    _HAS_GENAI = False

try:
    from chandas_analyser.syllabifier import get_lg_pattern, to_iast, to_devanagari
    from chandas_analyser.matcher import find_match_in_db
    from chandas_analyser.local_loader import get_chandas_cached
    from chandas_analyser.config import SIMILARITY_THRESHOLD
except Exception:
    get_lg_pattern = lambda x: []
    find_match_in_db = lambda x, y: {}
    async def get_chandas_cached(): return []
    SIMILARITY_THRESHOLD = 0.7

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

DEFAULT_MAX_ATTEMPTS = 5
TIMEOUT = 30.0

logger = logging.getLogger("sloka_generator")
logging.basicConfig(level=logging.INFO)

_client = None

def _ensure_client():
    global _client
    if not _HAS_GENAI:
        raise RuntimeError("google-genai SDK is not installed.")
    if _client is None:
        if not GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set; generator will fail until set.")
            raise RuntimeError("GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Configured google.genai SDK globally.")

def build_prompt(chandas_name: str, context: str, language: str="devanagari", extra_instructions: Optional[str]=None) -> str:
    lang_note = "Output must be in Devanagari." if language == "devanagari" else "Output must be in IAST (Latin)."
    
    prompt = f"""You are a master classical Sanskrit poet and prosody expert.
Produce EXACTLY one śloka in {language} that satisfies the following constraints:

1) Chandas (Meter): {chandas_name}.
2) Context / Topic: {context}.
3) Strict Metrical Constraints: 
   - Laghu (L): Short vowels (a, i, u, ṛ, ḷ) not followed by a conjunct consonant.
   - Guru (G): Long vowels (ā, ī, ū, ṝ, e, ai, o, au) OR short vowels followed by anusvara (ṃ/ṁ), visarga (ḥ), or a conjunct consonant.
   - You MUST follow the exact syllable count and L/G pattern for this meter.
4) Formatting: Output ONLY the exact blocks below — no extra markdown, no introduction, no conversational text.

---BEGIN_SHLOKA---
<the shloka lines>
---END_SHLOKA---
---META---
syllable_pattern: <LG pattern per pada separated by |>
explanation: <one-line justification>
---END_META---

{extra_instructions or ""}
"""
    return prompt

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F\s।॥,०-९\-]+", re.U)

def extract_shloka_and_meta(generated_text: str) -> Dict[str, str]:
    txt = generated_text
    try:
        if isinstance(generated_text, str):
            st = generated_text.strip()
            if st.startswith("{") or st.startswith("["):
                parsed = json.loads(st)
                if isinstance(parsed, dict) and "parts" in parsed and parsed["parts"]:
                    txt = parsed["parts"][0].get("text", txt)
    except Exception:
        pass

    shloka = ""
    meta = ""

    m = re.search(r"---BEGIN_SHLOKA---(.*?)---END_SHLOKA---", txt, re.S)
    if m:
        shloka = m.group(1).strip()
    else:
        blocks = DEVANAGARI_RE.findall(txt)
        blocks = [b.strip() for b in blocks if len(b.strip()) > 8]
        if blocks:
            shloka = max(blocks, key=len)
        else:
            lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
            shloka = "\n".join(lines[:4])

    m2 = re.search(r"---META---(.*?)---END_META---", txt, re.S)
    if m2:
        meta = m2.group(1).strip()

    return {"shloka": shloka, "meta": meta, "raw": generated_text}

async def _generate_with_sdk_async(prompt: str) -> str:
    """
    Generate content using the official google-genai SDK.
    """
    _ensure_client()
    try:
        from google.genai import types
        response = await _client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=512,
            )
        )
        return response.text
    except Exception as e:
        raise RuntimeError(f"Gemini API SDK Error: {e}") from e


async def generate_and_verify(chandas_name: str, context: str, language: str="devanagari", max_attempts: int=DEFAULT_MAX_ATTEMPTS) -> Dict[str, Any]:
    """
    Generate candidate ślokas and verify against chandas DB.
    - Uses deterministic settings (temperature=0) where possible.
    - Logs raw model output, parsed shloka, LG patterns and match for debugging.
    - Retries with progressively stricter prompt if mismatch occurs.
    """
    # load DB
    try:
        db = await get_chandas_cached()
    except Exception as e:
        logger.warning("Failed to load chandas DB: %s", e)
        db = []

    canonical = next((c for c in db if c.get("name","").lower() == chandas_name.lower()), None)
    extra_instructions = ""
    if canonical:
        pat = canonical.get("pattern")
        extra_instructions = f"Canonical LG pattern (for guidance): {pat}"

    attempts = []
    ACCEPT_NEAR_THRESHOLD = float(os.getenv("ACCEPT_NEAR_THRESHOLD", "0.62")) 
    gen_opts = {
        "temperature": 0.0,
        "maxOutputTokens": 512,
        # you may include other SDK-specific tuning fields as needed
    }

    for attempt in range(1, max_attempts+1):
        logger.info("Generation attempt %d/%d for chandas=%s", attempt, max_attempts, chandas_name)

        prompt = build_prompt(chandas_name, context, language, extra_instructions)

        if attempt > 1:
            prompt += "\nNOTE: Previous attempt did not match the meter. THIS TIME strictly follow the meter exactly and output NOTHING but the required fenced blocks."

        try:

            gen_text = await _generate_with_sdk_async(prompt)
        except Exception as e:
            logger.error("Generation failed (API): %s", e)
            return {"success": False, "error": f"Generation failed: {e}", "attempts": attempts}

        if not isinstance(gen_text, str):
            gen_text = str(gen_text)

        logger.debug("Raw generated text (first 1000 chars): %s", gen_text[:1000])



        parsed = extract_shloka_and_meta(gen_text)
        shloka_text = parsed.get("shloka", "").strip()
        meta = parsed.get("meta", "")
        logger.info("Parsed shloka (len=%d) meta len=%d", len(shloka_text), len(meta))


        if not shloka_text:
            attempts.append({
                "attempt": attempt,
                "generated_raw": gen_text,
                "parsed_shloka": shloka_text,
                "lg_patterns": [],
                "match": {"identifiedChandas": "Unknown", "explanation": "No shloka extracted"}
            })
            logger.warning("No shloka block extracted from generated text. Raw output saved.")
            continue

        # Analyze produced shloka
        lg_patterns = get_lg_pattern(shloka_text)
        match = find_match_in_db(lg_patterns, db)

        attempt_record = {
            "attempt": attempt,
            "generated_raw": gen_text,
            "parsed_shloka": shloka_text,
            "meta": meta,
            "lg_patterns": lg_patterns,
            "match": match
        }
        attempts.append(attempt_record)

        identified = (match.get("identifiedChandas") or "").lower()
        similarity = float(match.get("similarity") or 0.0)

        ok = False
        if identified and identified.startswith(chandas_name.lower()):
            ok = True
        elif similarity >= float(os.getenv("SIMILARITY_THRESHOLD", "0.7")):
            ok = True
        elif similarity >= ACCEPT_NEAR_THRESHOLD:
            ok = True
            logger.info("Soft-accepting near-match: %s (sim=%.3f)", match.get("matchedPattern"), similarity)

        if ok:
            logger.info("Generation SUCCESS on attempt %d: identified=%s similarity=%.3f", attempt, match.get("identifiedChandas"), similarity)
            return {"success": True, "attempts": attempts, "final": attempt_record}

        logger.info("Attempt %d did not pass verification: identified=%s similarity=%.3f", attempt, match.get("identifiedChandas"), similarity)

    logger.warning("Generation failed after %d attempts. Returning attempts payload.", max_attempts)
    return {"success": False, "attempts": attempts, "final": attempts[-1] if attempts else None}
