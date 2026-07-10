"""Lógica de negocio de gestión de usuarios (panel de administración).

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import math
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.constants import UserRole


async def list_users(
    db: AsyncSession,
    *,
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Lista usuarios con búsqueda, filtros y paginación (uso admin).

    `search` filtra por coincidencia parcial (`ilike`) en email, nombre o
    apellido. `page_size` se limita a un máximo de 100.

    Retorna un dict: `{"items", "total", "page", "page_size", "pages"}`.
    """
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    filters = []
    if role is not None:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)
    if search:
        term = f"%{search}%"
        filters.append(
            or_(User.email.ilike(term), User.first_name.ilike(term), User.last_name.ilike(term))
        )

    count_stmt = select(func.count()).select_from(User)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = select(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    if filters:
        stmt = stmt.where(*filters)

    result = await db.execute(stmt)
    items = list(result.scalars().all())

    pages = math.ceil(total / page_size) if page_size else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    """Busca un usuario por id. Lanza 404 si no existe."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


async def update_user_role(
    db: AsyncSession, user_id: uuid.UUID, role: UserRole, current_admin_id: uuid.UUID
) -> User:
    """Cambia el rol de un usuario. Un admin no puede cambiar su propio rol."""
    if user_id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No podés cambiar tu propio rol"
        )

    user = await get_user_by_id(db, user_id)
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


async def toggle_user_active(
    db: AsyncSession, user_id: uuid.UUID, is_active: bool, current_admin_id: uuid.UUID
) -> User:
    """Activa/desactiva un usuario. Un admin no puede desactivar su propia cuenta."""
    if user_id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No podés desactivar tu propia cuenta"
        )

    user = await get_user_by_id(db, user_id)
    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user
