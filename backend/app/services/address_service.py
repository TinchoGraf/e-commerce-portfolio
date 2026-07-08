"""Lógica de negocio de direcciones de usuario.

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate


async def list_addresses(db: AsyncSession, user_id: uuid.UUID) -> list[Address]:
    """Lista todas las direcciones de un usuario."""
    stmt = select(Address).where(Address.user_id == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    """Busca una dirección por id, validando que pertenezca al usuario. 404 si no."""
    stmt = select(Address).where(Address.id == address_id, Address.user_id == user_id)
    result = await db.execute(stmt)
    address = result.scalar_one_or_none()
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dirección no encontrada")
    return address


async def _unset_default_addresses(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Desmarca `is_default` en todas las direcciones actuales del usuario."""
    await db.execute(
        update(Address).where(Address.user_id == user_id, Address.is_default == True).values(  # noqa: E712
            is_default=False
        )
    )


async def create_address(db: AsyncSession, user_id: uuid.UUID, data: AddressCreate) -> Address:
    """Crea una dirección para el usuario.

    Si `is_default=True`, desmarca las demás direcciones del usuario. Si es
    la primera dirección del usuario, se marca como default automáticamente
    sin importar lo que venga en `data`.
    """
    count_stmt = select(Address).where(Address.user_id == user_id)
    has_existing = (await db.execute(count_stmt)).scalars().first() is not None

    is_default = data.is_default or not has_existing

    if is_default and has_existing:
        await _unset_default_addresses(db, user_id)

    address = Address(user_id=user_id, **data.model_dump(exclude={"is_default"}), is_default=is_default)
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


async def update_address(
    db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID, data: AddressUpdate
) -> Address:
    """Actualiza parcialmente una dirección (sólo campos enviados).

    Si `data.is_default=True`, desmarca las demás direcciones del usuario.
    """
    address = await get_address(db, user_id, address_id)
    updates = data.model_dump(exclude_unset=True)

    if updates.get("is_default") is True:
        await _unset_default_addresses(db, user_id)

    for field, value in updates.items():
        setattr(address, field, value)

    await db.commit()
    await db.refresh(address)
    return address


async def delete_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
    """Elimina una dirección del usuario.

    Si la dirección eliminada era la default y quedan otras, marca la
    primera restante como default.
    """
    address = await get_address(db, user_id, address_id)
    was_default = address.is_default

    await db.delete(address)
    await db.commit()

    if was_default:
        stmt = select(Address).where(Address.user_id == user_id).order_by(Address.created_at)
        remaining = (await db.execute(stmt)).scalars().first()
        if remaining is not None:
            remaining.is_default = True
            await db.commit()
