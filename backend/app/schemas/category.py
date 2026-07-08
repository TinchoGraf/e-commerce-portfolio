"""Schemas Pydantic de categorías."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool = True
    display_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool | None = None
    display_order: int | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryTreeResponse(BaseModel):
    """Igual a ``CategoryResponse`` pero con sus subcategorías anidadas de
    forma recursiva, para representar el árbol completo de categorías.
    """

    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime
    children: list["CategoryTreeResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# Necesario en Pydantic v2 para resolver la referencia recursiva
# ("CategoryTreeResponse") usada en el campo `children`.
CategoryTreeResponse.model_rebuild()
