"""Schemas Pydantic de cupones de descuento."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CouponCreate(BaseModel):
    code: str
    description: str | None = None
    discount_type: Literal["percentage", "fixed"]
    discount_value: Decimal = Field(gt=0)
    min_purchase_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int = 1
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

    @model_validator(mode="after")
    def check_valid_dates(self) -> "CouponCreate":
        """Valida que la fecha de inicio de vigencia sea anterior a la de fin."""
        if self.valid_from >= self.valid_until:
            raise ValueError("valid_from debe ser anterior a valid_until")
        return self


class CouponUpdate(BaseModel):
    description: str | None = None
    discount_type: Literal["percentage", "fixed"] | None = None
    discount_value: Decimal | None = None
    min_purchase_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None


class CouponResponse(BaseModel):
    id: uuid.UUID
    code: str
    description: str | None = None
    discount_type: str
    discount_value: Decimal
    min_purchase_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    usage_count: int
    per_user_limit: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponUsageResponse(BaseModel):
    id: uuid.UUID
    coupon_id: uuid.UUID
    user_id: uuid.UUID
    order_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponValidateRequest(BaseModel):
    """Solicitud para validar un código de cupón contra el carrito actual."""

    code: str


class CouponValidateResponse(BaseModel):
    """Resultado de la validación de un cupón, incluyendo el monto de
    descuento calculado si es válido.
    """

    valid: bool
    coupon: CouponResponse | None = None
    discount_amount: Decimal | None = None
    message: str
