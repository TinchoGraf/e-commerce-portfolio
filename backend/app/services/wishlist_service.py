"""Lógica de negocio de la lista de deseos (wishlist).

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import WishlistItemCreate


async def get_wishlist(db: AsyncSession, user_id: uuid.UUID) -> list[WishlistItem]:
    """Lista los ítems de la wishlist de un usuario, con el producto precargado."""
    stmt = (
        select(WishlistItem)
        .options(selectinload(WishlistItem.product).selectinload(Product.images))
        .where(WishlistItem.user_id == user_id)
    )
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def add_to_wishlist(db: AsyncSession, user_id: uuid.UUID, data: WishlistItemCreate) -> WishlistItem:
    """Agrega un producto a la wishlist del usuario.

    Lanza 404 si el producto no existe y 409 si ya estaba en la wishlist.
    """
    stmt = (
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.id == data.product_id)
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    stmt = select(WishlistItem).where(
        WishlistItem.user_id == user_id, WishlistItem.product_id == data.product_id
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El producto ya está en la wishlist"
        )

    wishlist_item = WishlistItem(user_id=user_id, product_id=data.product_id)
    db.add(wishlist_item)
    await db.commit()
    await db.refresh(wishlist_item)
    wishlist_item.product = product
    return wishlist_item


async def remove_from_wishlist(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    """Elimina un producto de la wishlist del usuario. 404 si no existe o no es suyo."""
    stmt = select(WishlistItem).where(
        WishlistItem.user_id == user_id, WishlistItem.product_id == product_id
    )
    wishlist_item = (await db.execute(stmt)).scalar_one_or_none()
    if wishlist_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ítem de wishlist no encontrado"
        )
    await db.delete(wishlist_item)
    await db.commit()
