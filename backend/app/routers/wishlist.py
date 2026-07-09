"""Endpoints de la lista de deseos (wishlist), requieren usuario autenticado.

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.schemas.common import MessageResponse
from app.schemas.wishlist import WishlistItemCreate, WishlistItemResponse
from app.services import product_service, wishlist_service

router = APIRouter(tags=["wishlist"])


def _to_response(item: WishlistItem) -> WishlistItemResponse:
    """Mapea un `WishlistItem` ORM a `WishlistItemResponse`, incluyendo el
    producto (requiere `item.product` e `item.product.images` precargados).
    """
    return WishlistItemResponse(
        id=item.id,
        user_id=item.user_id,
        product_id=item.product_id,
        created_at=item.created_at,
        product=product_service.to_list_response(item.product),
    )


@router.get("", response_model=list[WishlistItemResponse])
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WishlistItemResponse]:
    """Lista los ítems de la wishlist del usuario autenticado."""
    items = await wishlist_service.get_wishlist(db, current_user.id)
    return [_to_response(item) for item in items]


@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    data: WishlistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistItemResponse:
    """Agrega un producto a la wishlist del usuario autenticado."""
    item = await wishlist_service.add_to_wishlist(db, current_user.id, data)
    return _to_response(item)


@router.delete("/{product_id}", response_model=MessageResponse)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Elimina un producto de la wishlist del usuario autenticado."""
    await wishlist_service.remove_from_wishlist(db, current_user.id, product_id)
    await db.commit()
    return MessageResponse(message="Producto eliminado de la wishlist")
