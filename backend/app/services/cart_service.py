"""Lógica de negocio del carrito de compras.

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import CartItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.schemas.cart import CartItemCreate, CartItemUpdate


async def get_cart(db: AsyncSession, user_id: uuid.UUID) -> list[CartItem]:
    """Devuelve los ítems del carrito de un usuario.

    Sólo se incluyen ítems cuyo producto esté activo y con stock disponible
    (considerando el stock de la variante si el ítem tiene una asociada).
    Precarga `product` (con sus `images`) y `variant`.
    """
    stmt = (
        select(CartItem)
        .options(
            selectinload(CartItem.product).selectinload(Product.images),
            selectinload(CartItem.variant),
        )
        .where(CartItem.user_id == user_id)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().unique().all())

    def _is_available(item: CartItem) -> bool:
        if not item.product.is_active:
            return False
        if item.variant_id is not None:
            return item.variant is not None and item.variant.stock > 0
        return item.product.stock > 0

    return [item for item in items if _is_available(item)]


async def _get_owned_cart_item(db: AsyncSession, user_id: uuid.UUID, cart_item_id: uuid.UUID) -> CartItem:
    """Busca un `CartItem` por id validando que pertenezca al usuario. 404 si no."""
    stmt = (
        select(CartItem)
        .options(
            selectinload(CartItem.product),
            selectinload(CartItem.variant),
        )
        .where(CartItem.id == cart_item_id, CartItem.user_id == user_id)
    )
    result = await db.execute(stmt)
    cart_item = result.scalar_one_or_none()
    if cart_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ítem de carrito no encontrado")
    return cart_item


async def add_to_cart(db: AsyncSession, user_id: uuid.UUID, data: CartItemCreate) -> CartItem:
    """Agrega un producto (o variante) al carrito.

    Si ya existe un ítem con el mismo producto/variante para el usuario, suma
    la cantidad nueva a la existente en vez de crear un duplicado. Valida
    stock disponible en ambos casos.
    """
    product = await db.get(Product, data.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    variant: ProductVariant | None = None
    available_stock = product.stock

    if data.variant_id is not None:
        variant = await db.get(ProductVariant, data.variant_id)
        if variant is None or variant.product_id != product.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante no encontrada")
        if not variant.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La variante no está activa")
        available_stock = variant.stock

    stmt = select(CartItem).where(
        CartItem.user_id == user_id,
        CartItem.product_id == data.product_id,
        CartItem.variant_id == data.variant_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    requested_quantity = data.quantity + (existing.quantity if existing else 0)

    if requested_quantity > available_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock insuficiente: disponible {available_stock}, solicitado {requested_quantity}",
        )

    if existing is not None:
        existing.quantity = requested_quantity
        cart_item = existing
    else:
        cart_item = CartItem(
            user_id=user_id,
            product_id=data.product_id,
            variant_id=data.variant_id,
            quantity=data.quantity,
        )
        db.add(cart_item)

    await db.commit()
    await db.refresh(cart_item)
    return cart_item


async def update_cart_item(
    db: AsyncSession, user_id: uuid.UUID, cart_item_id: uuid.UUID, data: CartItemUpdate
) -> CartItem | None:
    """Actualiza la cantidad de un ítem del carrito.

    Si `quantity == 0`, elimina el ítem y devuelve `None`. Valida stock
    disponible para la nueva cantidad.
    """
    cart_item = await _get_owned_cart_item(db, user_id, cart_item_id)

    if data.quantity is None:
        return cart_item

    if data.quantity == 0:
        await db.delete(cart_item)
        await db.commit()
        return None

    available_stock = cart_item.variant.stock if cart_item.variant_id is not None else cart_item.product.stock

    if data.quantity > available_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock insuficiente: disponible {available_stock}, solicitado {data.quantity}",
        )

    cart_item.quantity = data.quantity
    await db.commit()
    await db.refresh(cart_item)
    return cart_item


async def remove_from_cart(db: AsyncSession, user_id: uuid.UUID, cart_item_id: uuid.UUID) -> None:
    """Elimina un ítem del carrito, validando que pertenezca al usuario."""
    cart_item = await _get_owned_cart_item(db, user_id, cart_item_id)
    await db.delete(cart_item)
    await db.commit()


async def clear_cart(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Elimina todos los ítems del carrito de un usuario.

    No hace commit: el caller (router o el checkout de order_service) es responsable
    de confirmar la transacción, para poder incluir esta operación en un flujo atómico.
    """
    stmt = select(CartItem).where(CartItem.user_id == user_id)
    result = await db.execute(stmt)
    for cart_item in result.scalars().all():
        await db.delete(cart_item)
    await db.flush()


async def get_cart_summary(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    """Arma el resumen del carrito con precios calculados.

    Devuelve `{"items", "item_count", "subtotal"}`. El precio unitario de
    cada ítem se calcula como `product.price + variant.price_adjustment`
    (si tiene variante). El router mapea cada item de la lista al schema
    `CartItemDetailResponse`.
    """
    cart_items = await get_cart(db, user_id)

    items: list[dict[str, Any]] = []
    item_count = 0
    subtotal = Decimal("0")

    for cart_item in cart_items:
        unit_price = cart_item.product.price
        if cart_item.variant is not None:
            unit_price += cart_item.variant.price_adjustment
        line_total = unit_price * cart_item.quantity

        primary_image = next((img for img in cart_item.product.images if img.is_primary), None)
        image_url = primary_image.url if primary_image else (
            cart_item.product.images[0].url if cart_item.product.images else None
        )

        items.append(
            {
                "id": cart_item.id,
                "user_id": cart_item.user_id,
                "product_id": cart_item.product_id,
                "variant_id": cart_item.variant_id,
                "quantity": cart_item.quantity,
                "created_at": cart_item.created_at,
                "updated_at": cart_item.updated_at,
                "product_name": cart_item.product.name,
                "product_slug": cart_item.product.slug,
                "product_image": image_url,
                "variant_name": cart_item.variant.name if cart_item.variant else None,
                "unit_price": unit_price,
                "line_total": line_total,
            }
        )
        item_count += cart_item.quantity
        subtotal += line_total

    return {
        "items": items,
        "item_count": item_count,
        "subtotal": subtotal,
    }
