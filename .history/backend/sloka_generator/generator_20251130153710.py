# sloka_generator/generator.py
import os
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
async def _generate_with_sdk_async(prompt: str) -> str:
    """
    Calls the Google SDK. The SDK may be sync; we robustly run it in a thread.
    The exact SDK call varies by SDK version; we try common variants.
    """
    if not _HAS_GENAI:
        raise RuntimeError("google.generativeai SDK not installed. Install with `pip install google-generativeai` or use HTTP path.")

    def _sync_call():
        # Attempt common SDK usage patterns and return a textual result
        try:
            # Newer SDKs may have a genai.create or genai.generate function.
            # We'll try genai.generate_text style (some libs may differ).
            # Prefer model.generate if available
            if hasattr(genai, "generate") or hasattr(genai, "create"):
                # some versions: genai.generate(..., model=..., input=...)
                fn = getattr(genai, "generate", None) or getattr(genai, "create", None)
                if fn:
                    resp = fn(model=GEMINI_MODEL, input=prompt)
                    # try common structures
                    if isinstance(resp, dict):
                        # check candidates / output
                        if "candidates" in resp and len(resp["candidates"]) > 0:
                            return resp["candidates"][0].get("content") or resp["candidates"][0].get("text") or str(resp)
                        return resp.get("output", {}).get("text") or resp.get("text") or str(resp)
                    else:
                        return str(resp)
            # Fallback to model object if SDK provides
            if hasattr(genai, "Model"):
                model = genai.Model(GEMINI_MODEL)
                # many SDKs name method generate or generate_text
                if hasattr(model, "generate") :
                    r = model.generate(prompt)
                    # r might be object with .text or dict
                    if isinstance(r, dict):
                        if "candidates" in r and len(r["candidates"])>0:
                            return r["candidates"][0].get("content") or r["candidates"][0].get("text") or str(r)
                        return r.get("output", {}).get("text") or r.get("text") or str(r)
                    return getattr(r, "text", str(r))
                if hasattr(model, "generate_text"):
                    r = model.generate_text(prompt)
                    return getattr(r, "text", str(r))
        except Exception as e:
            # bubble up original exception as string for debugging
            raise RuntimeError(f"SDK sync call failed: {e}") from e

        raise RuntimeError("Unable to call google.generativeai SDK with available methods on this environment.")

    # run sync call in executor to avoid blocking event loop
    return await asyncio.to_thread(_sync_call)

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
