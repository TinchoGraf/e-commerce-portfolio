"""Schemas Pydantic de direcciones."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AddressCreate(BaseModel):
    label: str | None = None
    street: str
    number: str
    floor_apt: str | None = None
    city: str
    state: str
    zip_code: str
    country: str = "Argentina"
    phone: str | None = None
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = None
    street: str | None = None
    number: str | None = None
    floor_apt: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    phone: str | None = None
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    label: str | None = None
    street: str
    number: str
    floor_apt: str | None = None
    city: str
    state: str
    zip_code: str
    country: str
    phone: str | None = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
