# backend/main.py
import re
from typing import List, Optional
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# analyser imports (local package)
from chandas_analyser.validators import ShlokaIn
from chandas_analyser.syllabifier import get_lg_pattern, to_devanagari, to_iast
from chandas_analyser.local_loader import get_chandas_cached
from chandas_analyser.matcher import find_match_in_db

# generator import (local package)
from sloka_generator.generator import generate_and_verify

app = FastAPI(title="Chandas Creator — Analyzer & Generator", version="1.0")

# Warm the chandas cache on startup
@app.on_event("startup")
async def startup():
    await get_chandas_cached()


# ---------- GET /chandas ----------
@app.get("/chandas")
async def get_all_chandas():
    """
    Return the list of chandas (from chandas_db.json).
    """
    chs = await get_chandas_cached()
    return JSONResponse({"success": True, "message": "Fetched all Chandas successfully ✅", "data": chs})


# ---------- POST /chandas/analyze ----------
@app.post("/chandas/analyze")
async def analyze_chandas(payload: ShlokaIn):
    """
    Validate input (ShlokaIn), compute LG pattern(s), and find best matching Chandas.
    """
    shloka = payload.shloka
    if not shloka:
        raise HTTPException(status_code=400, detail="Missing shloka text")

    try:
        # Produce devanagari + latin forms (like previous behaviour)
        is_devanagari = bool(re.search(r"[\u0900-\u097F]", shloka))
        devanagari_form = shloka if is_devanagari else to_devanagari(shloka)
        latin_form = to_iast(shloka) if is_devanagari else shloka

        pada_patterns: List[str] = get_lg_pattern(shloka)
        combined_pattern = "|".join(pada_patterns)

        db_chandas = await get_chandas_cached()
        match = find_match_in_db(pada_patterns, db_chandas)

        return JSONResponse({
            "success": True,
            "message": "Chandas analysis successful ✅",
            "analysis": {
                "input": {
                    "original": shloka,
                    "devanagari": devanagari_form,
                    "latin": latin_form
                },
                "pattern": {
                    "byPada": pada_patterns,
                    "combined": combined_pattern
                },
                "identifiedChandas": match.get("identifiedChandas"),
                "explanation": match.get("explanation")
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- POST /generate-and-verify ----------
class GenRequest(BaseModel):
    chandas: str
    context: str
    language: Optional[str] = "devanagari"
    max_attempts: Optional[int] = 3

@app.post("/generate-and-verify")
async def generate_and_verify_route(req: GenRequest):
    """
    Generate a śloka using the generator (Gemini) and verify it using the analyser.
    Returns all attempts and the final accepted (or last) attempt.
    """
    try:
        result = await generate_and_verify(req.chandas, req.context, req.language, req.max_attempts)
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- quick health endpoint ----------
@app.get("/health")
async def health():
    return {"status": "ok"}


# If you want to run directly: `python main.py`
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
