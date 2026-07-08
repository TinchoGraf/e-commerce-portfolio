"""Endpoints de cupones de descuento.

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.coupon_service`` y arma la respuesta.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin, get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.coupon import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.services import coupon_service

router = APIRouter(tags=["coupons"])


@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    data: CouponValidateRequest,
    subtotal: Decimal,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CouponValidateResponse:
    """Valida un cupón contra el subtotal actual del carrito.

    NOTA: `CouponValidateRequest` sólo trae `code`, por lo que el
    `subtotal` se recibe como query param separado (ej:
    `POST /api/coupons/validate?subtotal=15000`). Nunca se propaga la
    `HTTPException` del service: un cupón inválido se responde con 200 y
    `valid=False` + el motivo en `message`, ya que es un resultado
    esperado de la validación, no un error del servidor.
    """
    try:
        coupon = await coupon_service.validate_coupon(db, data.code, current_user.id, subtotal)
    except HTTPException as exc:
        return CouponValidateResponse(
            valid=False, coupon=None, discount_amount=None, message=str(exc.detail)
        )

    discount = coupon_service.calculate_discount(coupon, subtotal)
    return CouponValidateResponse(
        valid=True,
        coupon=CouponResponse.model_validate(coupon),
        discount_amount=discount,
        message="Cupón válido",
    )


@router.get("", response_model=list[CouponResponse])
async def list_coupons(
    include_expired: bool = True,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[CouponResponse]:
    """Lista todos los cupones (uso admin)."""
    coupons = await coupon_service.list_coupons(db, include_expired=include_expired)
    return [CouponResponse.model_validate(coupon) for coupon in coupons]


@router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CouponResponse:
    """Busca un cupón por id (uso admin)."""
    coupon = await coupon_service.get_coupon_by_id(db, coupon_id)
    return CouponResponse.model_validate(coupon)


@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CouponResponse:
    """Crea un cupón nuevo (uso admin)."""
    coupon = await coupon_service.create_coupon(db, data)
    return CouponResponse.model_validate(coupon)


@router.put("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CouponResponse:
    """Actualiza parcialmente un cupón (uso admin)."""
    coupon = await coupon_service.update_coupon(db, coupon_id, data)
    return CouponResponse.model_validate(coupon)


@router.delete("/{coupon_id}", response_model=MessageResponse)
async def delete_coupon(
    coupon_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Da de baja un cupón (uso admin)."""
    await coupon_service.delete_coupon(db, coupon_id)
    return MessageResponse(message="Cupón dado de baja correctamente")
