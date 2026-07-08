"""Lógica de negocio de categorías (árbol jerárquico self-referencial)."""

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.slug import generate_slug

# Sentinel para distinguir "no se pasó parent_id" de "se pasó parent_id=None".
_UNSET: Any = object()


async def list_categories(
    db: AsyncSession,
    *,
    include_inactive: bool = False,
    parent_id: uuid.UUID | None = _UNSET,
) -> list[Category]:
    """Lista categorías con sus hijos directos precargados (1 nivel).

    - `parent_id` no especificado (default, sentinel interno): devuelve
      sólo categorías raíz (`parent_id IS NULL`).
    - `parent_id=None` explícito: equivalente a pedir las categorías raíz.
    - `parent_id=<uuid>`: devuelve las categorías hijas de esa categoría.
    - `include_inactive=False` (default): filtra sólo categorías activas.

    Ordenadas por `display_order`.
    """
    stmt = select(Category).options(selectinload(Category.children)).order_by(
        Category.display_order
    )

    target_parent_id = None if parent_id is _UNSET else parent_id
    stmt = stmt.where(Category.parent_id == target_parent_id) if target_parent_id is not None else stmt.where(
        Category.parent_id.is_(None)
    )

    if not include_inactive:
        stmt = stmt.where(Category.is_active == True)  # noqa: E712

    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def get_category_by_slug(db: AsyncSession, slug: str) -> Category:
    """Busca una categoría por slug, con sus hijos precargados. 404 si no existe."""
    stmt = (
        select(Category)
        .options(selectinload(Category.children))
        .where(Category.slug == slug)
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    return category


async def get_category_by_id(db: AsyncSession, category_id: uuid.UUID) -> Category:
    """Busca una categoría por id. 404 si no existe."""
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    return category


async def create_category(db: AsyncSession, data: CategoryCreate) -> Category:
    """Crea una categoría, validando padre (si viene) y unicidad de nombre/slug."""
    slug = (data.slug or "").strip() or generate_slug(data.name)

    if data.parent_id is not None:
        parent = await db.get(Category, data.parent_id)
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoría padre no encontrada"
            )

    existing_name = await db.execute(select(Category).where(Category.name == data.name))
    if existing_name.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una categoría con el nombre '{data.name}'",
        )

    existing_slug = await db.execute(select(Category).where(Category.slug == slug))
    if existing_slug.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una categoría con el slug '{slug}'",
        )

    payload = data.model_dump(exclude={"slug"})
    category = Category(**payload, slug=slug)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category_id: uuid.UUID, data: CategoryUpdate) -> Category:
    """Actualiza parcialmente una categoría (sólo campos enviados).

    Valida que la categoría no sea su propio padre y revalida unicidad de
    nombre/slug si cambian.
    """
    category = await get_category_by_id(db, category_id)
    updates = data.model_dump(exclude_unset=True)

    if updates.get("parent_id") is not None:
        if updates["parent_id"] == category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Una categoría no puede ser su propio padre",
            )
        parent = await db.get(Category, updates["parent_id"])
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoría padre no encontrada"
            )

    if updates.get("name") and updates["name"] != category.name:
        existing_name = await db.execute(
            select(Category).where(Category.name == updates["name"], Category.id != category_id)
        )
        if existing_name.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una categoría con el nombre '{updates['name']}'",
            )

    if "slug" in updates:
        new_slug = (updates["slug"] or "").strip()
        if not new_slug:
            updates.pop("slug")
        elif new_slug != category.slug:
            existing_slug = await db.execute(
                select(Category).where(Category.slug == new_slug, Category.id != category_id)
            )
            if existing_slug.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe una categoría con el slug '{new_slug}'",
                )
            updates["slug"] = new_slug
        else:
            updates.pop("slug")

    for field, value in updates.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category_id: uuid.UUID) -> None:
    """Da de baja una categoría (soft delete: `is_active=False`).

    Los productos asociados mantienen su `category_id` intacto.
    """
    category = await get_category_by_id(db, category_id)
    category.is_active = False
    await db.commit()
