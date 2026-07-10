"""Endpoints de categorías: árbol jerárquico público y administración (admin).

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryTreeResponse, CategoryUpdate
from app.schemas.common import MessageResponse
from app.services import category_service

router = APIRouter(tags=["categories"])


def _to_tree_response(category: Category) -> CategoryTreeResponse:
    """Mapea recursivamente un `Category` ORM a `CategoryTreeResponse`.

    `list_categories`/`get_category_by_slug` sólo precargan un nivel de
    `children` (selectinload). Para evitar disparar un lazy-load síncrono
    (que rompería en un contexto async) en los nietos, se chequea si la
    relación `children` está cargada antes de acceder a ella (vía
    `category_service.children_loaded`): si no lo está, se asume lista
    vacía en ese nivel.
    """
    children = list(category.children) if category_service.children_loaded(category) else []

    return CategoryTreeResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        image_url=category.image_url,
        parent_id=category.parent_id,
        is_active=category.is_active,
        display_order=category.display_order,
        created_at=category.created_at,
        updated_at=category.updated_at,
        children=[_to_tree_response(child) for child in children],
    )


@router.get("", response_model=list[CategoryTreeResponse])
async def list_categories(
    include_inactive: bool = False, db: AsyncSession = Depends(get_db)
) -> list[CategoryTreeResponse]:
    """Lista las categorías raíz, con sus hijos directos anidados.

    `include_inactive=False` (default) trae sólo activas (uso público).
    `include_inactive=True` trae también inactivas (uso admin).
    """
    categories = await category_service.list_categories(db, include_inactive=include_inactive)
    return [_to_tree_response(category) for category in categories]


@router.get("/{slug}", response_model=CategoryTreeResponse)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)) -> CategoryTreeResponse:
    """Obtiene una categoría por slug, con sus hijos directos anidados."""
    category = await category_service.get_category_by_slug(db, slug)
    return _to_tree_response(category)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> CategoryResponse:
    """Crea una categoría nueva (sólo admin)."""
    category = await category_service.create_category(db, data)
    return CategoryResponse.model_validate(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> CategoryResponse:
    """Actualiza parcialmente una categoría (sólo admin)."""
    category = await category_service.update_category(db, category_id, data)
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> MessageResponse:
    """Da de baja una categoría (soft delete, sólo admin)."""
    await category_service.delete_category(db, category_id)
    return MessageResponse(message="Categoría eliminada correctamente")
