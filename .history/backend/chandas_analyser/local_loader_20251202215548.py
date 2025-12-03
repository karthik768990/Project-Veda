import json
import logging
import os
import aiofiles  # Ensure you have this: pip install aiofiles
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Cache variable
_cached_chandas: Optional[List[Dict[str, Any]]] = None
_cached_mtime: Optional[float] = None

def _normalize_item(item: Any) -> Dict[str, Any]:
    """
    Normalize a single chandas entry to a canonical dict with 'name' and 'pattern'.
    """
    if not isinstance(item, dict):
        return {"name": str(item), "pattern": ""}

    name = item.get("name") or item.get("chandas") or item.get("title") or item.get("id") or ""
    raw_pattern = item.get("pattern") or item.get("lg") or item.get("pat") or item.get("patterns") or ""
    
    # Handle list patterns (if any)
    if isinstance(raw_pattern, list):
        pattern = "".join(str(p) for p in raw_pattern)
    else:
        pattern = str(raw_pattern or "")
        
    # Preserve other useful keys like pattern_regex or syllables_per_pada
    return {
        "name": name, 
        "pattern": pattern,
        "pattern_regex": item.get("pattern_regex", ""),
        "syllables_per_pada": item.get("syllables_per_pada", 0)
    }

async def load_chandas_local() -> List[Dict[str, Any]]:
    """
    Read chandas_db.json from the SAME DIRECTORY as this script.
    """
    # 1. CALCULATE ABSOLUTE PATH
    # Current file: backend/chandas_analyser/local_loader.py
    # Database file: backend/chandas_analyser/chandas_db.json
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "chandas_db.json")

    if not os.path.exists(db_path):
        logger.error(f"❌ DATABASE NOT FOUND at: {db_path}")
        # Fallback list so the app doesn't crash empty
        return [
            {"name": "Anuṣṭubh", "pattern": "L G L G L G L G", "syllables_per_pada": 8},
            {"name": "Vasantatilakā", "pattern": "G G L G L L L G L L G L G G", "syllables_per_pada": 14}
        ]

    try:
        # 2. ASYNC READ
        async with aiofiles.open(db_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            raw = json.loads(content)
            
        logger.info(f"✅ Loaded DB from {db_path} (Size: {len(raw)} items)")
        
        # 3. NORMALIZE
        normalized = []
        # Handle if the root is a dict or list
        items = raw if isinstance(raw, list) else raw.get('data', [])
        
        for item in items:
            normalized.append(_normalize_item(item))
            
        return normalized

    except Exception as e:
        logger.exception(f"Failed to parse DB: {e}")
        # Return fallback on crash
        return [
            {"name": "Anuṣṭubh (Fallback)", "pattern": "L G L G L G L G"},
        ]

async def get_chandas_cached(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_chandas
    
    # Reload if cache is empty, forced, or contains only the fallback
    if force_reload or _cached_chandas is None or len(_cached_chandas) <= 2:
        _cached_chandas = await load_chandas_local()
        
    return _cached_chandas

def clear_chandas_cache() -> None:
    global _cached_chandas
    _cached_chandas = None
    logger.info("Cleared chandas cache.")