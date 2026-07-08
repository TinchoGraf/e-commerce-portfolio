"""Lógica de negocio de marcas."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate
from app.utils.slug import generate_slug


async def list_brands(db: AsyncSession, *, include_inactive: bool = False) -> list[Brand]:
    """Lista marcas, ordenadas por nombre. `include_inactive=False` filtra sólo activas."""
    stmt = select(Brand).order_by(Brand.name)
    if not include_inactive:
        stmt = stmt.where(Brand.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_brand_by_slug(db: AsyncSession, slug: str) -> Brand:
    """Busca una marca por slug. 404 si no existe."""
    stmt = select(Brand).where(Brand.slug == slug)
    result = await db.execute(stmt)
    brand = result.scalar_one_or_none()
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")
    return brand


async def get_brand_by_id(db: AsyncSession, brand_id: uuid.UUID) -> Brand:
    """Busca una marca por id. 404 si no existe."""
    brand = await db.get(Brand, brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")
    return brand


async def create_brand(db: AsyncSession, data: BrandCreate) -> Brand:
    """Crea una marca, validando unicidad de nombre/slug."""
    slug = (data.slug or "").strip() or generate_slug(data.name)

    existing_name = await db.execute(select(Brand).where(Brand.name == data.name))
    if existing_name.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una marca con el nombre '{data.name}'",
        )

    existing_slug = await db.execute(select(Brand).where(Brand.slug == slug))
    if existing_slug.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una marca con el slug '{slug}'",
        )

    payload = data.model_dump(exclude={"slug"})
    brand = Brand(**payload, slug=slug)
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand


async def update_brand(db: AsyncSession, brand_id: uuid.UUID, data: BrandUpdate) -> Brand:
    """Actualiza parcialmente una marca (sólo campos enviados)."""
    brand = await get_brand_by_id(db, brand_id)
    updates = data.model_dump(exclude_unset=True)

    if updates.get("name") and updates["name"] != brand.name:
        existing_name = await db.execute(
            select(Brand).where(Brand.name == updates["name"], Brand.id != brand_id)
        )
        if existing_name.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una marca con el nombre '{updates['name']}'",
            )

    if "slug" in updates:
        new_slug = (updates["slug"] or "").strip()
        if not new_slug:
            updates.pop("slug")
        elif new_slug != brand.slug:
            existing_slug = await db.execute(
                select(Brand).where(Brand.slug == new_slug, Brand.id != brand_id)
            )
            if existing_slug.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe una marca con el slug '{new_slug}'",
                )
            updates["slug"] = new_slug
        else:
            updates.pop("slug")

    for field, value in updates.items():
        setattr(brand, field, value)

    await db.commit()
    await db.refresh(brand)
    return brand


async def delete_brand(db: AsyncSession, brand_id: uuid.UUID) -> None:
    """Da de baja una marca (soft delete: `is_active=False`)."""
    brand = await get_brand_by_id(db, brand_id)
    brand.is_active = False
    await db.commit()
