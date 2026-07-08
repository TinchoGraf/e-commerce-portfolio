"""Endpoints de pagos, integrando MercadoPago (o el mock local de checkout).

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.payment_service``/``order_service`` y
arma la respuesta.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.order import OrderDetailResponse
from app.services import order_service, payment_service

router = APIRouter(tags=["payments"])


@router.post("/{order_id}/create", response_model=None)
async def create_payment(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Crea la preferencia de pago de una orden propia del usuario autenticado.

    Devuelve el dict crudo de ``payment_service.create_payment_preference``
    (``{"preference_id", "init_point", "mock"}``) sin envolverlo en un
    schema adicional, ya que su forma puede variar levemente según se use
    el mock local o el SDK real de MercadoPago.
    """
    order = await order_service.get_order(db, current_user.id, order_id)
    return await payment_service.create_payment_preference(db, order)


@router.post("/webhook")
async def payment_webhook(
    payment_data: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Recibe notificaciones de pago (webhook de MercadoPago o del mock local). Sin autenticación."""
    await payment_service.process_webhook(db, payment_data)
    return {"received": True}


@router.post("/mock-checkout/{order_id}", response_model=OrderDetailResponse)
async def mock_checkout(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """Simula la aprobación de un pago (endpoint de conveniencia sin MercadoPago real). Sin autenticación.

    ``mock_approve_payment`` devuelve la orden vía ``db.get``, sin
    precargar ``items`` (relación lazy). Para evitar un error de lazy-load
    en `AsyncSession` al serializar la respuesta, se vuelve a buscar la
    orden con ``order_service.get_order`` (que sí precarga `items` con
    `selectinload`), pasando ``is_admin=True`` para omitir la validación
    de dueño (este endpoint no tiene usuario autenticado).
    """
    approved_order = await payment_service.mock_approve_payment(db, order_id)
    order = await order_service.get_order(db, approved_order.user_id, order_id, is_admin=True)
    return OrderDetailResponse.model_validate(order)
