"""Schemas Pydantic de wishlist."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WishlistItemCreate(BaseModel):
    product_id: uuid.UUID


class WishlistItemResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
