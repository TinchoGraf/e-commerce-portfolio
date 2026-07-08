"""Schemas Pydantic comunes y reutilizables entre módulos."""

from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Parámetros de paginación estándar para query params de listados."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class MessageResponse(BaseModel):
    """Respuesta genérica de un mensaje simple (confirmaciones, etc.)."""

    message: str
