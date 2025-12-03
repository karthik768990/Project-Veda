# app/validators.py
import re
from pydantic import BaseModel, validator

class ShlokaIn(BaseModel):
    shloka: str

    @validator("shloka")
    def validate_shloka(cls, v: str) -> str:
        # Parity with validateInput.js: must be string, trimmed, not empty, length <= 1000, strip HTML tags
        if not isinstance(v, str):
            raise ValueError("Invalid input: 'shloka' must be provided as a string.")
        normalized = v.strip()
        if len(normalized) == 0:
            raise ValueError("Invalid input: 'shloka' cannot be empty.")
        if len(normalized) > 1000:
            raise ValueError("Input too long: please limit your shloka to under 1000 characters.")
        # Remove HTML tags (same regex semantics as JS)
        cleaned = re.sub(r"<[^>]*>?", "", normalized)
        return cleaned
