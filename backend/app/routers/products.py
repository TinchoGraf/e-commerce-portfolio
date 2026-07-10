"""Endpoints de productos: catálogo público y administración (admin).

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.product import (
    PaginatedProductResponse,
    ProductCreate,
    ProductImageCreate,
    ProductImageResponse,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)
from app.services import product_service

router = APIRouter(tags=["products"])


@router.get("", response_model=PaginatedProductResponse)
async def list_products(
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    search: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    is_featured: bool | None = None,
    include_inactive: bool = False,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedProductResponse:
    """Lista productos con filtros, búsqueda, orden y paginación.

    Por default sólo trae productos activos (catálogo público). El panel de
    administración puede pasar `include_inactive=true` para ver también los
    productos dados de baja (sin filtrar por `is_active`).
    """
    is_active = None if include_inactive else True
    result = await product_service.list_products(
        db,
        category_id=category_id,
        brand_id=brand_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        is_featured=is_featured,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return PaginatedProductResponse(
        items=[product_service.to_list_response(product) for product in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/id/{product_id}", response_model=ProductResponse)
async def get_product_by_id_admin(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductResponse:
    """Obtiene el detalle completo de un producto por id, incluyendo
    inactivos y variantes inactivas (sólo admin, uso del panel de edición).
    """
    product = await product_service.get_product_by_id(db, product_id)
    return ProductResponse.model_validate(product)


@router.get("/{slug}", response_model=ProductResponse)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> ProductResponse:
    """Obtiene el detalle de un producto activo por su slug, con imágenes,
    variantes activas, categoría y marca.
    """
    product = await product_service.get_product_by_slug(db, slug)
    response = ProductResponse.model_validate(product)
    response.variants = [ProductVariantResponse.model_validate(v) for v in product.active_variants]
    return response


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductResponse:
    """Crea un producto nuevo (sólo admin)."""
    product = await product_service.create_product(db, data)
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductResponse:
    """Actualiza parcialmente un producto (sólo admin)."""
    product = await product_service.update_product(db, product_id, data)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> MessageResponse:
    """Da de baja un producto (soft delete, sólo admin)."""
    await product_service.delete_product(db, product_id)
    return MessageResponse(message="Producto eliminado correctamente")


@router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_product_image(
    product_id: uuid.UUID,
    data: ProductImageCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductImageResponse:
    """Agrega una imagen a la galería de un producto (sólo admin)."""
    image = await product_service.add_product_image(db, product_id, data)
    return ProductImageResponse.model_validate(image)


@router.delete("/images/{image_id}", response_model=MessageResponse)
async def delete_product_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> MessageResponse:
    """Elimina definitivamente una imagen de producto (sólo admin)."""
    await product_service.delete_product_image(db, image_id)
    await db.commit()
    return MessageResponse(message="Imagen eliminada correctamente")


@router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_product_variant(
    product_id: uuid.UUID,
    data: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductVariantResponse:
    """Crea una variante para un producto (sólo admin)."""
    variant = await product_service.add_product_variant(db, product_id, data)
    return ProductVariantResponse.model_validate(variant)


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
async def update_product_variant(
    variant_id: uuid.UUID,
    data: ProductVariantUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ProductVariantResponse:
    """Actualiza parcialmente una variante de producto (sólo admin)."""
    variant = await product_service.update_product_variant(db, variant_id, data)
    return ProductVariantResponse.model_validate(variant)


@router.delete("/variants/{variant_id}", response_model=MessageResponse)
async def delete_product_variant(
    variant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> MessageResponse:
    """Da de baja una variante de producto (soft delete, sólo admin)."""
    await product_service.delete_product_variant(db, variant_id)
    return MessageResponse(message="Variante eliminada correctamente")
