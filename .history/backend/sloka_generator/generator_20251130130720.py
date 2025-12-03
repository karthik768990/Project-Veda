import os
import re
import asyncio
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai # <--- We use the official SDK now

# --- IMPORT HANDLING ---
# We try to import your custom analyser. If it fails, we warn you instead of crashing immediately.
try:
    from chandas_analyser.syllabifier import get_lg_pattern, to_iast, to_devanagari
    from chandas_analyser.matcher import find_match_in_db
    from chandas_analyser.local_loader import get_chandas_cached
    from chandas_analyser.config import SIMILARITY_THRESHOLD
except ImportError:
    print("⚠️ WARNING: 'chandas_analyser' module not found. Logic will fail unless you fix folder structure.")
    # Dummy fallbacks to prevent immediate crash on load
    get_lg_pattern = lambda x: []
    find_match_in_db = lambda x, y: {}
    get_chandas_cached = lambda: []
    SIMILARITY_THRESHOLD = 0.8

load_dotenv() 

# --- CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# We don't need GEMINI_API_BASE anymore because the SDK handles it.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro") # Updated to a valid model name

if not GEMINI_API_KEY: 
    print("❌ ERROR: GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

DEFAULT_MAX_ATTEMPTS = 5

# --- HELPER FUNCTIONS ---

def build_prompt(chandas_name: str, context: str, language: str="devanagari", extra_instructions: Optional[str]=None) -> str:
    chandas_hint = {
        "Anuṣṭubh": "Each pāda must be 8 syllables. 5th syllable Laghu, 6th syllable Guru.",
        "Triṣṭubh": "Each pāda must be 11 syllables." 
    }.get(chandas_name, "Follow the canonical meter for " + chandas_name + ".")

    lang_note = "Output must be in Devanagari." if language == "devanagari" else "Output must be in IAST."

    prompt = f"""
    You are a classical Sanskrit poet.
    Produce exactly one śloka (no commentary) that satisfies:
    - Chandas: {chandas_name}. {chandas_hint}
    - Context: {context}
    - {lang_note}
    
    Output format MUST be:
    ---BEGIN_SHLOKA---
    <the shloka lines>
    ---END_SHLOKA---
    ---META---
    syllable_pattern: <pattern>
    explanation: <text>
    ---END_META---
    {extra_instructions or ""}
    """
    return prompt

def extract_shloka_and_meta(generated_text: str) -> Dict[str, str]:
    shloka = ""
    meta = ""
    # Regex to find content between tags
    m = re.search(r"---BEGIN_SHLOKA---(.*?)---END_SHLOKA---", generated_text, re.DOTALL)
    if m:
        shloka = m.group(1).strip()
    else:
        # Fallback if AI forgets tags
        shloka = generated_text
        
    m2 = re.search(r"---META---(.*?)---END_META---", generated_text, re.DOTALL)
    if m2:
        meta = m2.group(1).strip()
        
    return {"shloka": shloka, "meta": meta, "raw": generated_text}

# --- MAIN GENERATION LOGIC ---

async def generate_and_verify(chandas_name: str, context: str, language: str="devanagari", max_attempts: int=DEFAULT_MAX_ATTEMPTS) -> Dict[str, Any]:
    
    # Initialize Model
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    attempts = []
    
    # Load DB (Async check)
    try:
        db = await get_chandas_cached()
    except:
        db = [] # Fallback if DB fails
        
    canonical = next((c for c in db if c.get("name","").lower() == chandas_name.lower()), None)
    extra_instructions = ""
    if canonical:
        pat = canonical.get("pattern")
        extra_instructions = f"Canonical LG pattern (for guidance): {pat}"

    for attempt in range(1, max_attempts+1):
        print(f"⚡ Attempt {attempt}/{max_attempts} for {chandas_name}...")
        
        prompt = build_prompt(chandas_name, context, language, extra_instructions)
        
        try:
            # === HERE IS THE FIX: USING SDK INSTEAD OF HTTPX ===
            response = await model.generate_content_async(prompt)
            gen_text = response.text
        except Exception as e:
            return {"success": False, "error": f"Gemini API Error: {str(e)}"}

        parsed = extract_shloka_and_meta(gen_text)
        shloka_text = parsed["shloka"]

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

        # Success Check
        ok = False
        identified = match.get("identifiedChandas", "").lower()
        
        # Check 1: Name match
        if identified.startswith(chandas_name.lower()):
            ok = True
        # Check 2: Confidence score
        elif match.get("confidence", 0) >= SIMILARITY_THRESHOLD:
            ok = True

        if ok:
            return {"success": True, "attempts": attempts, "final": attempts[-1]}

        # If failed, Make prompt stricter for next loop
        extra_instructions = f"Previous attempt failed. You wrote in {identified}. Please strictly use {chandas_name} meter."

    return {"success": False, "attempts": attempts, "final": attempts[-1] if attempts else None}