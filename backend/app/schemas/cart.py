"""Schemas Pydantic de ítems de carrito."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int = Field(default=1, ge=1)


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


class CartItemDetailResponse(BaseModel):
    """Ítem de carrito enriquecido con datos del producto para mostrar en el
    frontend (nombre, imagen, precio unitario y subtotal de línea).

    NOTA: estos campos se arman en el service/router (no vienen 1:1 del
    modelo ``CartItem`` del ORM), por lo que puede construirse tanto desde
    un dict como desde un objeto con esos atributos ya calculados.
    """

    id: uuid.UUID
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int
    product_name: str
    product_slug: str
    product_price: Decimal
    product_image_url: str | None = None
    variant_name: str | None = None
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class CartSummaryResponse(BaseModel):
    """Resumen completo del carrito de un usuario."""

    items: list[CartItemDetailResponse]
    item_count: int
    subtotal: Decimal
