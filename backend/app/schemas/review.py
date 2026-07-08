"""Schemas Pydantic de reseñas de producto."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    product_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    title: str | None = None
    comment: str | None = None


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    title: str | None = None
    comment: str | None = None


class ReviewResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    rating: int
    title: str | None = None
    comment: str | None = None
    is_verified_purchase: bool
    is_approved: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewWithUserResponse(BaseModel):
    """Igual a ``ReviewResponse`` pero incluyendo el nombre del usuario que
    dejó la reseña.

    NOTA: ``user_name`` se arma en el service/router (por ejemplo,
    ``f"{first_name} {last_name[0]}."``) a partir de la relación ``user``,
    no es un campo directo del modelo ``Review``.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    rating: int
    title: str | None = None
    comment: str | None = None
    is_verified_purchase: bool
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    user_name: str

    model_config = ConfigDict(from_attributes=True)


class PaginatedReviewResponse(BaseModel):
    """Respuesta paginada de reseñas para endpoints de listado."""

    items: list[ReviewWithUserResponse]
    total: int
    page: int
    page_size: int
    pages: int
