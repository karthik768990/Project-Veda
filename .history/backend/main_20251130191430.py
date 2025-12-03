import os
import re
from typing import List, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, Request
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

app = FastAPI(title="Chandas Creator — Analyzer & Generator", version="1.0")

# --- 1. SETUP CORS (Safety Net) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (good for dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. SERVE FRONTEND (Static Files) ---
# Ensure you created the 'static' folder in the root directory!
# Structure: project_root/static/index.html
app.mount("/static", StaticFiles(directory="../static"), name="static")

@app.get("/")
async def read_root():
    # Serves the UI when you go to http://localhost:3000
    return FileResponse("../static/index.html")

# --- 3. GOOGLE AUTHENTICATION ---
# TODO: Put your actual Client ID here or in .env
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID_HERE")

class LoginRequest(BaseModel):
    token: str

@app.post("/auth/google")
async def google_login(login_data: LoginRequest):
    try:
        # Verify the token with Google servers
        idinfo = id_token.verify_oauth2_token(
            login_data.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        # Get User Info
        user_name = idinfo.get('name', 'Poet')
        email = idinfo.get('email')

        # In a real production app, you would issue a secure Session Cookie here.
        # For this prototype, we return success so the UI unlocks.
        return {"success": True, "user": user_name, "email": email}

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")

# --- EXISTING LOGIC BELOW ---

# Warm the chandas cache on startup
@app.on_event("startup")
async def startup():
    await get_chandas_cached()

# ... (Rest of your existing endpoints: /chandas, /chandas/analyze) ...

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

        pada_patterns: List[str] = get_lg_pattern(shloka)
        combined_pattern = "|".join(pada_patterns)

        db_chandas = await get_chandas_cached()
        match = find_match_in_db(pada_patterns, db_chandas)

        return JSONResponse({
            "success": True,
            "message": "Chandas analysis successful ✅",
            "analysis": {
                "input": {"original": shloka, "devanagari": devanagari_form, "latin": latin_form},
                "pattern": {"byPada": pada_patterns, "combined": combined_pattern},
                "identifiedChandas": match.get("identifiedChandas"),
                "explanation": match.get("explanation")
            }
        })
    except Exception as e:
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)