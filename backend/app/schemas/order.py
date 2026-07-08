"""Schemas Pydantic de órdenes de compra y sus ítems."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.utils.constants import OrderStatus, PaymentStatus


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    product_name: str
    product_sku: str | None = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    """Datos mínimos para crear una orden a partir del carrito actual."""

    shipping_address_id: uuid.UUID
    shipping_method: str | None = None
    coupon_code: str | None = None
    notes: str | None = None


class OrderUpdate(BaseModel):
    """Actualización administrativa del estado de una orden."""

    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None
    payment_id: str | None = None
    notes: str | None = None


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    user_id: uuid.UUID
    status: OrderStatus
    payment_status: PaymentStatus
    shipping_address_snapshot: dict[str, Any]
    shipping_method: str | None = None
    shipping_cost: Decimal
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total: Decimal
    coupon_id: uuid.UUID | None = None
    payment_id: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
