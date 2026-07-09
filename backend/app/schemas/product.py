"""Schemas Pydantic de productos, imágenes y variantes."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.brand import BrandResponse
from app.schemas.category import CategoryResponse


class ProductImageCreate(BaseModel):
    url: str
    alt_text: str | None = None
    display_order: int = 0
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    url: str
    alt_text: str | None = None
    display_order: int
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductVariantCreate(BaseModel):
    name: str
    sku: str | None = None
    price_adjustment: Decimal = Decimal("0")
    stock: int = 0
    attributes: dict[str, Any]
    is_active: bool = True


class ProductVariantUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    price_adjustment: Decimal | None = None
    stock: int | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    name: str
    sku: str | None = None
    price_adjustment: Decimal
    stock: int
    attributes: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    short_description: str | None = None
    price: Decimal = Field(gt=0)
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    sku: str | None = None
    stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = 5
    category_id: uuid.UUID | None = None
    brand_id: uuid.UUID | None = None
    is_active: bool = True
    is_featured: bool = False
    weight: Decimal | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    short_description: str | None = None
    price: Decimal | None = None
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    sku: str | None = None
    stock: int | None = None
    low_stock_threshold: int | None = None
    category_id: uuid.UUID | None = None
    brand_id: uuid.UUID | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    weight: Decimal | None = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    short_description: str | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    sku: str | None = None
    stock: int
    low_stock_threshold: int
    category_id: uuid.UUID | None = None
    brand_id: uuid.UUID | None = None
    is_active: bool
    is_featured: bool
    weight: Decimal | None = None
    avg_rating: Decimal
    review_count: int
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageResponse] = []
    variants: list[ProductVariantResponse] = []
    category: CategoryResponse | None = None
    brand: BrandResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Versión resumida del producto para listados (sin descripción completa
    ni variantes).

    NOTA: ``primary_image_url`` no es un atributo directo del modelo ORM.
    El router/service debe construir este schema con ``.model_validate()``
    sobre un dict (o un objeto intermedio) que ya incluya ese valor
    precalculado (por ejemplo, tomando la imagen con ``is_primary=True``),
    en vez de confiar en ``from_attributes`` sobre el ORM crudo para ese
    campo en particular.
    """

    id: uuid.UUID
    name: str
    slug: str
    price: Decimal
    compare_at_price: Decimal | None = None
    is_featured: bool
    avg_rating: Decimal
    review_count: int
    stock: int
    primary_image_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductResponse(BaseModel):
    """Respuesta paginada de productos para endpoints de listado."""

    items: list[ProductListResponse]
    total: int
    page: int
    page_size: int
    pages: int
