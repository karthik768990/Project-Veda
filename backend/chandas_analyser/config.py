# app/config.py
from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCAL_DB = PROJECT_ROOT / "chandas_db.json"

# similarity threshold for matcher (same as before)
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.65"))
