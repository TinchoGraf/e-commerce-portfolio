"""Endpoints de pagos, integrando MercadoPago (o el mock local de checkout).

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.payment_service``/``order_service`` y
arma la respuesta.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.order import OrderDetailResponse
from app.services import order_service, payment_service
from app.utils.constants import UserRole

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
    x_signature: str | None = Header(default=None, alias="x-signature"),
    x_request_id: str | None = Header(default=None, alias="x-request-id"),
) -> dict[str, bool]:
    """Recibe notificaciones de pago (webhook de MercadoPago o del mock local). Sin autenticación
    de usuario (MercadoPago llama a este endpoint directamente), pero valida la firma HMAC del
    header ``x-signature`` contra `MERCADOPAGO_WEBHOOK_SECRET` cuando ese secret está configurado,
    para evitar que un tercero falsifique notificaciones de pago aprobado.
    """
    data_id = payment_data.get("payment_id") or payment_data.get("data", {}).get("id")
    if not payment_service.verify_webhook_signature(
        x_signature=x_signature, x_request_id=x_request_id, data_id=str(data_id) if data_id else None
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma de webhook inválida")

    await payment_service.process_webhook(db, payment_data)
    return {"received": True}


@router.post("/mock-checkout/{order_id}", response_model=OrderDetailResponse)
async def mock_checkout(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """Simula la aprobación de un pago (endpoint de conveniencia sin MercadoPago real).

    Requiere usuario autenticado y valida ownership de la orden (o admin).
    Sólo funciona si no hay credenciales reales de MercadoPago configuradas
    (`MERCADOPAGO_ACCESS_TOKEN` vacío): en producción con MercadoPago real,
    este endpoint debe estar deshabilitado para que nadie pueda marcar una
    orden como pagada sin pagar de verdad.
    """
    if settings.MERCADOPAGO_ACCESS_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El checkout mock no está disponible cuando MercadoPago real está configurado",
        )

    is_admin = current_user.role == UserRole.ADMIN
    # Valida ownership (o admin) antes de aprobar el pago: 404 si la orden no
    # existe o no pertenece al usuario autenticado.
    await order_service.get_order(db, current_user.id, order_id, is_admin=is_admin)

    approved_order = await payment_service.mock_approve_payment(db, order_id)
    order = await order_service.get_order(db, approved_order.user_id, order_id, is_admin=True)
    return OrderDetailResponse.model_validate(order)
