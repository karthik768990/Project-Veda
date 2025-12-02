# app/local_loader.py
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import LOCAL_DB

logger = logging.getLogger(__name__)

_cached_chandas: Optional[List[Dict[str, Any]]] = None
_cached_mtime: Optional[float] = None

def _normalize_item(item: Any) -> Dict[str, Any]:
    """
    Normalize a single chandas entry to a canonical dict with 'name' and 'pattern'.
    Accepts various legacy keys.
    """
    if not isinstance(item, dict):
        return {"name": str(item), "pattern": ""}

    name = item.get("name") or item.get("chandas") or item.get("title") or item.get("id") or ""
    raw_pattern = item.get("pattern") or item.get("lg") or item.get("pat") or item.get("patterns") or ""
    if isinstance(raw_pattern, list):
        pattern = "".join(str(p) for p in raw_pattern)
    else:
        pattern = str(raw_pattern or "")
    return {"name": name, "pattern": pattern}


async def load_chandas_local() -> List[Dict[str, Any]]:
    """
    Read chandas_db.json (or LOCAL_DB path). Returns a normalized list of chandas dicts.
    If file missing or invalid, returns a small safe fallback.
    """
    p = Path(LOCAL_DB)
    if not p.exists():
        logger.warning("LOCAL_DB not found at %s — returning fallback set", LOCAL_DB)
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]

    try:
        # Log file metadata for debugging
        try:
            stat = p.stat()
            logger.info("LOCAL_DB found at %s (size=%d bytes, mtime=%s)", LOCAL_DB, stat.st_size, stat.st_mtime)
        except Exception:
            logger.info("LOCAL_DB found at %s (could not stat file metadata)", LOCAL_DB)

        text = p.read_text(encoding="utf-8")
        raw = json.loads(text)
    except json.JSONDecodeError as jde:
        logger.exception("JSON parse error reading LOCAL_DB at %s: %s", LOCAL_DB, jde)
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]
    except Exception as e:
        logger.exception("Failed to read/parse LOCAL_DB at %s: %s", LOCAL_DB, e)
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]

    # raw can be a list of objects or a dict containing a list (common shapes)
    if isinstance(raw, dict):
        candidates = ["data", "chandas", "items", "rows"]
        found = None
        for k in candidates:
            if k in raw and isinstance(raw[k], list):
                found = raw[k]
                break
        if found is None:
            found = [raw]
    elif isinstance(raw, list):
        found = raw
    else:
        logger.warning("Unexpected LOCAL_DB JSON shape (%s). Wrapping into a list.", type(raw))
        found = [raw]

    normalized: List[Dict[str, Any]] = []
    for item in found:
        normalized.append(_normalize_item(item))

    if len(normalized) == 0:
        logger.warning("LOCAL_DB parsed to empty list. Returning fallback.")
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]

    logger.info("Successfully loaded %d chandas entries from %s", len(normalized), LOCAL_DB)
    return normalized


async def get_chandas_cached(force_reload: bool = False) -> List[Dict[str, Any]]:
    """
    Cached loader. Will reload when:
      - cache is empty,
      - force_reload=True,
      - or file modification time changed since last load.
    """
    global _cached_chandas, _cached_mtime
    p = Path(LOCAL_DB)

    current_mtime = None
    try:
        if p.exists():
            current_mtime = p.stat().st_mtime
    except Exception as e:
        logger.debug("Could not stat LOCAL_DB: %s", e)

    if force_reload or _cached_chandas is None or (current_mtime and _cached_mtime != current_mtime):
        logger.info("Loading chandas from local DB (force_reload=%s).", force_reload)
        _cached_chandas = await load_chandas_local()
        _cached_mtime = current_mtime
        logger.info("Loaded %d chandas entries from %s", len(_cached_chandas), LOCAL_DB)

    return _cached_chandas


def clear_chandas_cache() -> None:
    """
    Clear the in-memory cache (useful in tests or admin endpoints).
    """
    global _cached_chandas, _cached_mtime
    _cached_chandas = None
    _cached_mtime = None
    logger.info("Cleared chandas cache.")
