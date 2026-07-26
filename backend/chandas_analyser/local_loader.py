import json
import logging
import aiofiles
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

_cached_chandas: Optional[List[Dict[str, Any]]] = None
_cached_mtime: Optional[float] = None





def _normalize_item(item: Any) -> Dict[str, Any]:
    """
    Normalize a single chandas entry to a canonical dict with 'name' and 'pattern'.
    """
    if not isinstance(item, dict):
        return {"name": str(item), "pattern": ""}

    name = (
        item.get("name")
        or item.get("chandas")
        or item.get("title")
        or item.get("id")
        or ""
    )
    raw_pattern = (
        item.get("pattern")
        or item.get("lg")
        or item.get("pat")
        or item.get("patterns")
        or ""
    )

    # Handle list patterns (if any)
    if isinstance(raw_pattern, list):
        pattern = "".join(str(p) for p in raw_pattern)
    else:
        pattern = str(raw_pattern or "")

    return {
        "name": name,
        "pattern": pattern,
        "pattern_regex": item.get("pattern_regex", ""),
        "syllables_per_pada": item.get("syllables_per_pada", 0),
    }


async def load_chandas_local() -> List[Dict[str, Any]]:
    db_path = Path(__file__).resolve().parent / "chandas_db.json"

    if not db_path.exists():
        logger.error(f"❌ DATABASE NOT FOUND at: {db_path}")
        raise FileNotFoundError(f"Database file missing: {db_path}")

    try:
        async with aiofiles.open(db_path, mode="r", encoding="utf-8") as f:
            content = await f.read()
            raw = json.loads(content)

        logger.info(f"Loaded DB from {db_path} (Size: {len(raw)} items)")

        normalized = []
        items = raw if isinstance(raw, list) else raw.get("data", [])

        for item in items:
            normalized.append(_normalize_item(item))

        return normalized

    except Exception as e:
        logger.exception(f"Failed to parse DB: {e}")
        raise RuntimeError(f"Database parsing failed: {e}")


async def get_chandas_cached(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_chandas

    # Reload if cache is empty or forced
    if force_reload or _cached_chandas is None:
        _cached_chandas = await load_chandas_local()

    return _cached_chandas


def clear_chandas_cache() -> None:
    global _cached_chandas
    _cached_chandas = None
    logger.info("Cleared chandas cache.")