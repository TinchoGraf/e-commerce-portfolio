"""Endpoints de marcas: listado público y administración (admin).

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate
from app.schemas.common import MessageResponse
from app.services import brand_service

router = APIRouter(tags=["brands"])


@router.get("", response_model=list[BrandResponse])
async def list_brands(db: AsyncSession = Depends(get_db)) -> list[BrandResponse]:
    """Lista las marcas activas."""
    brands = await brand_service.list_brands(db)
    return [BrandResponse.model_validate(brand) for brand in brands]


@router.get("/{slug}", response_model=BrandResponse)
async def get_brand(slug: str, db: AsyncSession = Depends(get_db)) -> BrandResponse:
    """Obtiene una marca por su slug."""
    brand = await brand_service.get_brand_by_slug(db, slug)
    return BrandResponse.model_validate(brand)


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> BrandResponse:
    """Crea una marca nueva (sólo admin)."""
    brand = await brand_service.create_brand(db, data)
    await db.commit()
    await db.refresh(brand)
    return BrandResponse.model_validate(brand)


@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: uuid.UUID,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> BrandResponse:
    """Actualiza parcialmente una marca (sólo admin)."""
    brand = await brand_service.update_brand(db, brand_id, data)
    await db.commit()
    await db.refresh(brand)
    return BrandResponse.model_validate(brand)


@router.delete("/{brand_id}", response_model=MessageResponse)
async def delete_brand(
    brand_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> MessageResponse:
    """Da de baja una marca (soft delete, sólo admin)."""
    await brand_service.delete_brand(db, brand_id)
    await db.commit()
    return MessageResponse(message="Marca eliminada correctamente")
