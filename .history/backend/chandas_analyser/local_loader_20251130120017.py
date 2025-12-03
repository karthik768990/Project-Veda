# app/local_loader.py
import json
from typing import List, Dict, Any
from pathlib import Path
from .config import LOCAL_DB

_cached_chandas: List[Dict[str, Any]] = None

async def load_chandas_local() -> List[Dict[str, Any]]:
    """
    Reads chandas_db.json from project root. If missing, returns a tiny fallback set.
    """
    try:
        with open(LOCAL_DB, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            # normalize: ensure pattern is str
            normalized = []
            for item in data:
                name = item.get("name") or item.get("chandas") or item.get("title")
                pattern = item.get("pattern") or item.get("lg") or ""
                normalized.append({"name": name, "pattern": pattern})
            return normalized
    except FileNotFoundError:
        # small safe fallback
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"}
        ]

async def get_chandas_cached(force_reload: bool=False) -> List[Dict[str, Any]]:
    """
    Cached loader. Set force_reload=True during dev if you edit JSON and want immediate effect.
    """
    global _cached_chandas
    if _cached_chandas is None or force_reload:
        _cached_chandas = await load_chandas_local()
    return _cached_chandas
