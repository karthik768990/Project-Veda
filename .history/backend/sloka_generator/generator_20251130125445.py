import os
import re
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# --- 1. CONFIGURATION ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ WARNING: GEMINI_API_KEY not found. Please check your .env or terminal.")

# Configure the official SDK (Fixes the URL/Base errors) TODO CHANGE THE MODEL 

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

# --- 2. PROMPT BUILDER ---
def build_prompt(chandas_name: str, context: str, language: str = "devanagari", previous_error: str = None) -> str:
    """
    Constructs a structured prompt for the LLM.
    """
    chandas_hints = {
        "Anuṣṭubh": "8 syllables per line. 5th is Laghu, 6th is Guru.",
        "Vasantatilaka": "14 syllables. Pattern: G G L G L L L G L L G L G G",
        "Mandakranta": "17 syllables. Pattern: G G G G L L L L L G G L G G L G G"
    }
    
    hint = chandas_hints.get(chandas_name, f"Follow the strict rules for {chandas_name}.")
    
    # Retry logic injection
    correction_instruction = ""
    if previous_error:
        correction_instruction = f"""
        ⚠️ PREVIOUS ATTEMPT FAILED.
        Error: {previous_error}
        PLEASE FIX THE METER. Count the syllables carefully.
        """

    prompt = f"""
    You are a classical Sanskrit poet (Kavi).
    
    Task: Compose ONE Sanskrit Sloka (4 lines).
    Meter: {chandas_name}
    Topic: {context}
    Constraint: {hint}
    
    {correction_instruction}

    Output Rules:
    1. Output ONLY in Devanagari script.
    2. Format strictly as follows:
    ---BEGIN_SHLOKA---
    (Write the sloka here)
    ---END_SHLOKA---
    """
    return prompt

# --- 3. HELPER: EXTRACT TEXT ---
def extract_shloka(text: str) -> str:
    """
    Extracts the clean sloka from the AI response tags.
    """
    match = re.search(r"---BEGIN_SHLOKA---(.*?)---END_SHLOKA---", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Fallback: if AI forgot tags, return the whole text cleaned up
    return text.replace("---BEGIN_SHLOKA---", "").replace("---END_SHLOKA---", "").strip()

# --- 4. MAIN GENERATION LOOP ---
async def generate_poem_with_retry(chandas: str, context: str, verify_func, max_attempts: int = 3):
    """
    Generates a poem, verifies it with the analyzer, and retries if wrong.
    """
    last_error = None
    
    for attempt in range(1, max_attempts + 1):
        print(f"⚡ Generation Attempt {attempt}/{max_attempts} for {chandas}...")
        
        # Build prompt (with error history if applicable)
        prompt = build_prompt(chandas, context, previous_error=last_error)
        
        try:
            # Call Gemini (Using SDK - Async)
            response = await model.generate_content_async(prompt)
            raw_text = response.text
            
            # Clean the output
            sloka = extract_shloka(raw_text)
            
            # VERIFY (Using the analyzer function passed from main.py)
            # We expect verify_func to return a dict with 'identifiedChandas'
            analysis = verify_func(sloka)
            
            detected_meter = analysis.get("identifiedChandas", "Unknown")
            pattern = analysis.get("pattern", "")
            
            # Check Match (Case Insensitive)
            # If the desired chandas is part of the detected string (e.g. "Anushtup" in "Anushtup (Pathya)")
            if chandas.lower() in detected_meter.lower():
                return {
                    "success": True,
                    "sloka": sloka,
                    "analysis": analysis,
                    "attempts": attempt
                }
            
            # If we are here, the meter was wrong
            print(f"❌ Mismatch: Wanted {chandas}, Got {detected_meter} ({pattern})")
            last_error = f"You wrote in {detected_meter} (Pattern: {pattern}), but I need {chandas}."
            
        except Exception as e:
            print(f"⚠️ API Error: {e}")
            last_error = str(e)

    return {
        "success": False,
        "message": f"Could not generate perfect {chandas} after {max_attempts} attempts.",
        "last_attempt": sloka if 'sloka' in locals() else "",
        "last_analysis": analysis if 'analysis' in locals() else {}
    }