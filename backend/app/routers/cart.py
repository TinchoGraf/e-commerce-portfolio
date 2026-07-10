"""Endpoints del carrito de compras (requieren usuario autenticado).

Los endpoints NO contienen lógica de negocio: sólo reciben la request,
llaman al service correspondiente y devuelven la response mapeada al
schema Pydantic que corresponda.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.cart import (
    CartItemCreate,
    CartItemDetailResponse,
    CartItemResponse,
    CartItemUpdate,
    CartSummaryResponse,
)
from app.schemas.common import MessageResponse
from app.services import cart_service

router = APIRouter(tags=["cart"])


def _to_detail_response(item: dict[str, Any]) -> CartItemDetailResponse:
    """Mapea un ítem del dict de `get_cart_summary` a `CartItemDetailResponse`.

    NOTA: el dict que arma `cart_service.get_cart_summary` no incluye una
    clave `product_price` separada (sólo `unit_price`, que ya contempla el
    ajuste de precio de la variante si corresponde), y su clave de imagen se
    llama `product_image` (no `product_image_url`). Ante la falta de un
    precio "base" de producto en el dict, se usa `unit_price` también como
    `product_price` (mismo valor cuando el ítem no tiene variante).
    """
    return CartItemDetailResponse(
        id=item["id"],
        product_id=item["product_id"],
        variant_id=item["variant_id"],
        quantity=item["quantity"],
        product_name=item["product_name"],
        product_slug=item["product_slug"],
        product_price=item["unit_price"],
        product_image_url=item.get("product_image"),
        variant_name=item["variant_name"],
        unit_price=item["unit_price"],
        line_total=item["line_total"],
    )


@router.get("", response_model=CartSummaryResponse)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartSummaryResponse:
    """Obtiene el resumen del carrito del usuario autenticado."""
    summary = await cart_service.get_cart_summary(db, current_user.id)
    return CartSummaryResponse(
        items=[_to_detail_response(item) for item in summary["items"]],
        item_count=summary["item_count"],
        subtotal=summary["subtotal"],
    )


@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    data: CartItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartItemResponse:
    """Agrega un producto (o variante) al carrito del usuario autenticado."""
    cart_item = await cart_service.add_to_cart(db, current_user.id, data)
    return CartItemResponse.model_validate(cart_item)


@router.put("/items/{cart_item_id}")
async def update_cart_item(
    cart_item_id: uuid.UUID,
    data: CartItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartItemResponse | MessageResponse:
    """Actualiza la cantidad de un ítem del carrito.

    Si la nueva cantidad es 0, el ítem se elimina y se devuelve un mensaje
    de confirmación en vez del ítem actualizado.
    """
    cart_item = await cart_service.update_cart_item(db, current_user.id, cart_item_id, data)
    if cart_item is None:
        return MessageResponse(message="Ítem eliminado del carrito")

    return CartItemResponse.model_validate(cart_item)


@router.delete("/items/{cart_item_id}", response_model=MessageResponse)
async def remove_from_cart(
    cart_item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Elimina un ítem del carrito del usuario autenticado."""
    await cart_service.remove_from_cart(db, current_user.id, cart_item_id)
    return MessageResponse(message="Ítem eliminado del carrito")


@router.delete("", response_model=MessageResponse)
async def clear_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Vacía por completo el carrito del usuario autenticado.

    `cart_service.clear_cart` no hace commit internamente (para poder
    integrarse en flujos atómicos como el checkout), por lo que el commit
    se hace acá, en el router.
    """
    await cart_service.clear_cart(db, current_user.id)
    await db.commit()
    return MessageResponse(message="Carrito vaciado correctamente")
