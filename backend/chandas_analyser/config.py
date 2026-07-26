from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCAL_DB = PROJECT_ROOT / "chandas_db.json"

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.65"))