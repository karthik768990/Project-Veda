import os
import logging
import re
from pathlib import Path
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Google Auth Imports   
from google.oauth2 import id_token
from google.auth.transport import requests

# Analyser imports
from chandas_analyser.validators import ShlokaIn
from chandas_analyser.syllabifier import get_lg_pattern, to_devanagari, to_iast
from chandas_analyser.local_loader import get_chandas_cached
from chandas_analyser.matcher import find_match_in_db

# Generator import
from sloka_generator.generator import generate_and_verify

# ---- App setup ----
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chandas_creator")

app = FastAPI(title="Chandas Creator — Analyzer & Generator", version="1.0")

# --- 1. CORS (dev-friendly) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. STATIC FILES (robust absolute resolution) ---
# Resolve paths relative to this file, not current working directory
BASE_DIR = Path(__file__).resolve().parent            # backend/
PROJECT_ROOT = BASE_DIR.parent                        # project root
STATIC_DIR = (PROJECT_ROOT / "static").resolve()      # project_root/static
INDEX_FILE = STATIC_DIR / "index.html"

if STATIC_DIR.exists() and STATIC_DIR.is_dir():
    logger.info(f"Mounting static files from: {STATIC_DIR}")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
else:
    logger.warning(f"Static directory not found at: {STATIC_DIR}. Skipping mounting /static.")

@app.get("/")
async def read_root():
    """
    Serve index.html if available; otherwise return a helpful JSON response.
    This avoids crashing at import time if index.html doesn't exist.
    """
    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))
    return JSONResponse({
        "success": True,
        "message": "Frontend not built or index.html missing. Run frontend dev server (Vite) or build frontend into project_root/static."
    })


# --- 3. GOOGLE AUTHENTICATION ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID_HERE")

class LoginRequest(BaseModel):
    token: str


@app.post("/auth/google")
async def google_login(login_data: LoginRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            login_data.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        user_name = idinfo.get("name", "Poet")
        email = idinfo.get("email")

        return {"success": True, "user": user_name, "email": email}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")


# --- 4. Warm cache on startup ---
@app.on_event("startup")
async def startup():
    await get_chandas_cached()


# --- 5. Chandas endpoints ---
@app.get("/chandas")
async def get_all_chandas():
    chs = await get_chandas_cached()
    return JSONResponse({"success": True, "message": "Fetched all Chandas successfully ✅", "data": chs})


@app.post("/chandas/analyze")
async def analyze_chandas(payload: ShlokaIn):
    shloka = payload.shloka
    if not shloka:
        raise HTTPException(status_code=400, detail="Missing shloka text")

    try:
        is_devanagari = bool(re.search(r"[\u0900-\u097F]", shloka))
        devanagari_form = shloka if is_devanagari else to_devanagari(shloka)
        latin_form = to_iast(shloka) if is_devanagari else shloka

        # Extract LG patterns per pada
        pada_patterns: List[str] = get_lg_pattern(shloka)
        combined_compact = "".join(pada_patterns)
        combined_by_pada = "|".join(pada_patterns)

        # Load DB
        db_chandas = await get_chandas_cached()

        # Match and obtain structured result (now includes similarity & matchedPattern)
        match = find_match_in_db(pada_patterns, db_chandas)

        # Log useful debug info
        logger.info("Analysis input (devanagari present=%s). latin_form=%s", is_devanagari, (latin_form[:80] + "...") if len(str(latin_form))>80 else latin_form)
        logger.info("LG patterns byPada=%s combined=%s", pada_patterns, combined_compact)
        logger.info("Matcher result: %s", match)

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
                    "combined_compact": combined_compact,
                    "combined_by_pada": combined_by_pada
                },
                "identifiedChandas": match.get("identifiedChandas"),
                "similarity": match.get("similarity"),
                "matchedPattern": match.get("matchedPattern"),
                "explanation": match.get("explanation")
            }
        })
    except Exception as e:
        logger.exception("Error during chandas analysis")
        raise HTTPException(status_code=500, detail=str(e))

class GenRequest(BaseModel):
    chandas: str
    context: str
    language: Optional[str] = "devanagari"
    max_attempts: Optional[int] = 3

@app.post("/generate-and-verify")
async def generate_and_verify_route(req: GenRequest):
    try:
        result = await generate_and_verify(req.chandas, req.context, req.language, req.max_attempts)
        return JSONResponse(result)
    except Exception as e:
        logger.exception("Error in generate-and-verify")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/reload-db")
async def reload_db():
    from chandas_analyser.local_loader import get_chandas_cached
    await get_chandas_cached(force_reload=True)
    return {"success": True, "message": "Chandas DB reloaded 🔄"}
