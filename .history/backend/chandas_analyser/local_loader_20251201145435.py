# app/local_loader.py
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import LOCAL_DB

logger = logging.getLogger(__name__)

# cache container
_cached_chandas: Optional[List[Dict[str, Any]]] = None
_cached_mtime: Optional[float] = None

def _normalize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a single chandas entry to a canonical dict with 'name' and 'pattern'.
    Accepts various legacy keys.
    """
    if not isinstance(item, dict):
        return {"name": str(item), "pattern": ""}

    name = item.get("name") or item.get("chandas") or item.get("title") or item.get("id") or ""
    # pattern might be a list or string; convert lists to joined string
    raw_pattern = item.get("pattern") or item.get("lg") or item.get("pat") or item.get("patterns") or ""
    if isinstance(raw_pattern, list):
        # join with no separator (patterns are often strings of L/G)
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
        text = p.read_text(encoding="utf-8")
        raw = json.loads(text)
    except Exception as e:
        logger.exception("Failed to read/parse LOCAL_DB at %s: %s", LOCAL_DB, e)
        # return fallback but keep logs for debugging
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]

    # raw can be a list of objects or a dict containing a list (common shapes)
    if isinstance(raw, dict):
        # try common keys that hold arrays
        candidates = ["data", "chandas", "items", "rows"]
        found = None
        for k in candidates:
            if k in raw and isinstance(raw[k], list):
                found = raw[k]
                break
        if found is None:
            # if dict but not containing list -> try to interpret as single entry
            found = [raw]
    elif isinstance(raw, list):
        found = raw
    else:
        # unexpected shape
        logger.warning("Unexpected LOCAL_DB JSON shape (%s). Wrapping into a list.", type(raw))
        found = [raw]

    # normalize every item (do not slice)
    normalized: List[Dict[str, Any]] = []
    for item in found:
        normalized.append(_normalize_item(item))

    # final sanity check — if normalized is empty, fallback
    if len(normalized) == 0:
        logger.warning("LOCAL_DB parsed to empty list. Returning fallback.")
        return [
            {"name": "Anuṣṭubh", "pattern": "LGLLGGLG"},
            {"name": "Triṣṭubh", "pattern": "GGLGLGGLGGLG"},
        ]

    return normalized
# change the force reload to be false in the production 

async def get_chandas_cached(force_reload: bool = True) -> List[Dict[str, Any]]:
    """
    Cached loader. Will reload when:
      - cache is empty,
      - force_reload=True,
      - or file modification time changed since last load.
    """
    global _cached_chandas, _cached_mtime
    p = Path(LOCAL_DB)

    # check mtime safely
    current_mtime = None
    try:
        if p.exists():
            current_mtime = p.stat().st_mtime
    except Exception as e:
        logger.debug("Could not stat LOCAL_DB: %s", e)

    # reload conditions
    if force_reload or _cached_chandas is None or (current_mtime and _cached_mtime != current_mtime):
        logger.info("Loading chandas from local DB (force_reload=%s).", force_reload)
        _cached_chandas = await load_chandas_local()
        _cached_mtime = current_mtime

        # log how many entries loaded (helps debug 'only 2' problem)
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
