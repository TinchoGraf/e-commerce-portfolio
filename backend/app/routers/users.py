"""Endpoints de gestión de usuarios (panel de administración).

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.user import (
    PaginatedUserResponse,
    UserAdminResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services import user_service
from app.utils.constants import UserRole

router = APIRouter(tags=["admin-users"])


@router.get("", response_model=PaginatedUserResponse)
async def list_users(
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> PaginatedUserResponse:
    """Lista usuarios con búsqueda, filtros y paginación (sólo admin)."""
    result = await user_service.list_users(
        db,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return PaginatedUserResponse(
        items=[UserAdminResponse.model_validate(user) for user in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> UserAdminResponse:
    """Obtiene el detalle de un usuario por id (sólo admin)."""
    user = await user_service.get_user_by_id(db, user_id)
    return UserAdminResponse.model_validate(user)


@router.put("/{user_id}/role", response_model=UserAdminResponse)
async def update_user_role(
    user_id: uuid.UUID,
    data: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> UserAdminResponse:
    """Cambia el rol de un usuario (sólo admin, no puede cambiar el propio)."""
    user = await user_service.update_user_role(db, user_id, data.role, current_admin.id)
    return UserAdminResponse.model_validate(user)


@router.put("/{user_id}/status", response_model=UserAdminResponse)
async def update_user_status(
    user_id: uuid.UUID,
    data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> UserAdminResponse:
    """Activa/desactiva un usuario (sólo admin, no puede desactivar la propia cuenta)."""
    user = await user_service.toggle_user_active(db, user_id, data.is_active, current_admin.id)
    return UserAdminResponse.model_validate(user)
