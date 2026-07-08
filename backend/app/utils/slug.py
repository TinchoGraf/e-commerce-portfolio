"""Generación de slugs URL-friendly."""

import re
import unicodedata


def generate_slug(text: str) -> str:
    """Genera un slug URL-friendly a partir de texto (ej: 'iPhone 15 Pro Max' -> 'iphone-15-pro-max')."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")
