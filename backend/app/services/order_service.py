"""Lógica de negocio de órdenes de compra (checkout, consulta y administración).

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.

Los precios y el stock SIEMPRE se calculan y validan acá, del lado del
servidor. Nunca se confía en montos ni cantidades enviados por el cliente.
"""

import math
import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate, OrderUpdate
from app.services import address_service, cart_service, coupon_service
from app.utils.constants import OrderStatus, PaymentStatus
from app.utils.order_number import generate_order_number

# Umbral de subtotal a partir del cual el envío es gratis.
FREE_SHIPPING_THRESHOLD = Decimal("50000")
# Costo de envío estándar (hardcodeado).
# TODO: en una fase futura esto se calcula dinámicamente según método de
# envío, ubicación y peso/volumen de los productos.
STANDARD_SHIPPING_COST = Decimal("5000")

# Transiciones de estado válidas para una orden.
VALID_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def _build_address_snapshot(address: Any) -> dict[str, Any]:
    """Arma el snapshot de dirección de envío a partir de un `Address`."""
    return {
        "label": address.label,
        "street": address.street,
        "number": address.number,
        "floor_apt": address.floor_apt,
        "city": address.city,
        "state": address.state,
        "zip_code": address.zip_code,
        "country": address.country,
        "phone": address.phone,
    }


async def create_order(db: AsyncSession, user_id: uuid.UUID, data: OrderCreate) -> Order:
    """Crea una orden de compra a partir del carrito actual del usuario.

    Flujo completo de checkout: valida carrito, dirección, stock y cupón,
    calcula todos los montos en el servidor, descuenta stock, vacía el
    carrito y persiste la orden. Todo ocurre dentro de una única transacción:
    `clear_cart` y `record_coupon_usage` solo hacen `flush`, nunca `commit`,
    así que un error en cualquier punto hace rollback de todos los cambios
    pendientes (incluido el descuento de stock y el vaciado del carrito).
    """
    cart_items = await cart_service.get_cart(db, user_id)
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El carrito está vacío")

    address = await address_service.get_address(db, user_id, data.shipping_address_id)
    shipping_address_snapshot = _build_address_snapshot(address)

    try:
        order_items: list[OrderItem] = []
        subtotal = Decimal("0")

        for cart_item in cart_items:
            product = cart_item.product
            variant = cart_item.variant

            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El producto {product.name} ya no está disponible",
                )

            if cart_item.variant_id is not None:
                if variant is None or not variant.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El producto {product.name} ya no está disponible",
                    )

            available_stock = variant.stock if variant is not None else product.stock
            if available_stock < cart_item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para {product.name} (disponible: {available_stock})",
                )

            unit_price = product.price + (variant.price_adjustment if variant is not None else Decimal("0"))
            total_price = unit_price * cart_item.quantity
            subtotal += total_price

            order_item = OrderItem(
                product_id=product.id,
                variant_id=variant.id if variant is not None else None,
                product_name=product.name,
                product_sku=variant.sku if variant is not None else product.sku,
                quantity=cart_item.quantity,
                unit_price=unit_price,
                total_price=total_price,
            )
            order_items.append(order_item)

        coupon = None
        discount_amount = Decimal("0")
        if data.coupon_code:
            coupon = await coupon_service.validate_coupon(db, data.coupon_code, user_id, subtotal)
            discount_amount = coupon_service.calculate_discount(coupon, subtotal)

        shipping_cost = Decimal("0") if subtotal > FREE_SHIPPING_THRESHOLD else STANDARD_SHIPPING_COST
        tax_amount = Decimal("0")  # Por ahora no se calculan impuestos.
        total = subtotal - discount_amount + shipping_cost + tax_amount

        order_number = await generate_order_number(db)

        order = Order(
            order_number=order_number,
            user_id=user_id,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            shipping_address_snapshot=shipping_address_snapshot,
            shipping_method=data.shipping_method,
            shipping_cost=shipping_cost,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total=total,
            coupon_id=coupon.id if coupon is not None else None,
            notes=data.notes,
        )
        order.items = order_items

        # Descontar stock reservado por esta orden.
        for cart_item in cart_items:
            if cart_item.variant is not None:
                cart_item.variant.stock -= cart_item.quantity
            else:
                cart_item.product.stock -= cart_item.quantity

        db.add(order)
        await db.flush()  # Necesitamos order.id para registrar el uso del cupón.

        if coupon is not None:
            await coupon_service.record_coupon_usage(db, coupon.id, user_id, order.id)

        await cart_service.clear_cart(db, user_id)

        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise

    await db.refresh(order, attribute_names=["items"])
    return order


async def get_order(
    db: AsyncSession, user_id: uuid.UUID, order_id: uuid.UUID, is_admin: bool = False
) -> Order:
    """Busca una orden por id, con sus ítems precargados.

    Si `is_admin=False`, valida que la orden pertenezca al usuario (404 si
    no, para no revelar la existencia de órdenes ajenas).
    """
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")

    if not is_admin and order.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")

    return order


async def list_user_orders(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    status: OrderStatus | None = None,
) -> dict[str, Any]:
    """Lista paginada de las órdenes de un usuario, ordenadas por fecha descendente."""
    conditions = [Order.user_id == user_id]
    if status is not None:
        conditions.append(Order.status == status)

    return await _paginated_orders(db, conditions, page=page, page_size=page_size)


async def list_all_orders(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status: OrderStatus | None = None,
    payment_status: PaymentStatus | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    """Lista paginada de todas las órdenes (uso admin), filtrable por estado, pago y número de orden."""
    conditions = []
    if status is not None:
        conditions.append(Order.status == status)
    if payment_status is not None:
        conditions.append(Order.payment_status == payment_status)
    if search:
        conditions.append(Order.order_number.ilike(f"%{search}%"))

    return await _paginated_orders(db, conditions, page=page, page_size=page_size)


async def _paginated_orders(
    db: AsyncSession,
    conditions: list[Any],
    *,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    """Helper interno de paginación compartido por `list_user_orders`/`list_all_orders`."""
    count_stmt = select(func.count()).select_from(Order)
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if conditions:
        stmt = stmt.where(*conditions)

    result = await db.execute(stmt)
    items = list(result.scalars().unique().all())

    pages = math.ceil(total / page_size) if page_size else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, data: OrderUpdate) -> Order:
    """Actualiza el estado (y otros campos) de una orden. Sólo debe llamarse desde un endpoint admin.

    Valida la transición de `status` contra `VALID_TRANSITIONS`. Si la
    nueva transición es a `CANCELLED`, devuelve el stock reservado por cada
    ítem de la orden (a la variante si el ítem tenía una, sino al producto).
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.items).selectinload(OrderItem.variant),
        )
        .where(Order.id == order_id)
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")

    updates = data.model_dump(exclude_unset=True)

    new_status = updates.pop("status", None)
    if new_status is not None:
        allowed = VALID_TRANSITIONS.get(order.status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede pasar de {order.status.value} a {new_status.value}",
            )

        if new_status == OrderStatus.CANCELLED:
            for item in order.items:
                if item.variant_id is not None and item.variant is not None:
                    item.variant.stock += item.quantity
                elif item.product is not None:
                    item.product.stock += item.quantity

        order.status = new_status

    for field, value in updates.items():
        setattr(order, field, value)

    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    return order
