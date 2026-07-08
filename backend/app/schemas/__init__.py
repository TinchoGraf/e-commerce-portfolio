"""Schemas Pydantic de la API. Se importan explícitamente desde cada router
(ej: `from app.schemas.user import UserCreate`), este `__init__` no re-exporta
todo para evitar imports circulares innecesarios.
"""
