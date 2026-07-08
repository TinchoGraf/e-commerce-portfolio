"""Lógica de negocio de cupones de descuento.

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import Coupon, CouponUsage
from app.schemas.coupon import CouponCreate, CouponUpdate


async def validate_coupon(
    db: AsyncSession, code: str, user_id: uuid.UUID, subtotal: Decimal
) -> Coupon:
    """Valida que un cupón sea aplicable para un usuario y un subtotal dados.

    Busca el cupón por código (case-insensitive) y valida, en orden: que
    esté activo, que esté dentro de su vigencia, que no haya alcanzado su
    límite de usos global, que el usuario no haya superado su límite de
    usos personal y que el subtotal cumpla el monto mínimo de compra.
    Lanza `HTTPException` con el mensaje correspondiente ante cualquier
    incumplimiento. Devuelve el `Coupon` si todas las validaciones pasan.
    """
    stmt = select(Coupon).where(func.lower(Coupon.code) == code.lower())
    coupon = (await db.execute(stmt)).scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cupón no encontrado")

    if not coupon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Este cupón ya no está activo"
        )

    now = datetime.now(timezone.utc)
    if now < coupon.valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Este cupón todavía no es válido"
        )
    if now > coupon.valid_until:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este cupón ya venció")

    if coupon.usage_limit is not None and coupon.usage_count >= coupon.usage_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este cupón alcanzó su límite de usos",
        )

    user_usage_stmt = select(func.count()).select_from(CouponUsage).where(
        CouponUsage.coupon_id == coupon.id, CouponUsage.user_id == user_id
    )
    user_usage_count = (await db.execute(user_usage_stmt)).scalar_one()
    if user_usage_count >= coupon.per_user_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya usaste este cupón el máximo de veces permitido",
        )

    if coupon.min_purchase_amount is not None and subtotal < coupon.min_purchase_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El monto mínimo de compra para este cupón es ${coupon.min_purchase_amount}",
        )

    return coupon


def calculate_discount(coupon: Coupon, subtotal: Decimal) -> Decimal:
    """Calcula el monto de descuento a aplicar según el tipo de cupón.

    Para cupones porcentuales, el descuento se limita (tope) por
    `max_discount_amount` si está definido. Para cupones de monto fijo, el
    descuento nunca supera el subtotal.
    """
    if coupon.discount_type == "percentage":
        discount = subtotal * coupon.discount_value / Decimal("100")
        if coupon.max_discount_amount is not None:
            discount = min(discount, coupon.max_discount_amount)
        return discount

    return min(coupon.discount_value, subtotal)


async def record_coupon_usage(
    db: AsyncSession, coupon_id: uuid.UUID, user_id: uuid.UUID, order_id: uuid.UUID
) -> CouponUsage:
    """Registra el uso de un cupón en una orden e incrementa su contador de usos.

    No hace commit: el caller (checkout de order_service) es responsable de confirmar
    la transacción, para que esto quede incluido en el flujo atómico de la orden.
    """
    coupon = await db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cupón no encontrado")

    coupon.usage_count += 1

    usage = CouponUsage(coupon_id=coupon_id, user_id=user_id, order_id=order_id)
    db.add(usage)
    await db.flush()
    await db.refresh(usage)
    return usage


async def list_coupons(db: AsyncSession, *, include_expired: bool = True) -> list[Coupon]:
    """Lista todos los cupones (uso admin). Si `include_expired=False`, excluye los vencidos."""
    stmt = select(Coupon)
    if not include_expired:
        now = datetime.now(timezone.utc)
        stmt = stmt.where(Coupon.valid_until >= now)
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def get_coupon_by_id(db: AsyncSession, coupon_id: uuid.UUID) -> Coupon:
    """Busca un cupón por id. 404 si no existe."""
    coupon = await db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cupón no encontrado")
    return coupon


async def create_coupon(db: AsyncSession, data: CouponCreate) -> Coupon:
    """Crea un cupón nuevo, validando que el código sea único (case-insensitive)."""
    existing_stmt = select(Coupon).where(func.lower(Coupon.code) == data.code.lower())
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un cupón con el código '{data.code}'",
        )

    coupon = Coupon(**data.model_dump())
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return coupon


async def update_coupon(db: AsyncSession, coupon_id: uuid.UUID, data: CouponUpdate) -> Coupon:
    """Actualiza parcialmente un cupón (sólo los campos enviados)."""
    coupon = await get_coupon_by_id(db, coupon_id)
    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(coupon, field, value)

    await db.commit()
    await db.refresh(coupon)
    return coupon


async def delete_coupon(db: AsyncSession, coupon_id: uuid.UUID) -> None:
    """Da de baja un cupón (soft delete: `is_active=False`)."""
    coupon = await get_coupon_by_id(db, coupon_id)
    coupon.is_active = False
    await db.commit()
