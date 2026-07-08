"""Schemas Pydantic de ítems de carrito."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int | None = None


class CartItemResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
