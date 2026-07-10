"""Lógica de negocio de pagos, integrando MercadoPago (o un mock local).

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.

Si `settings.MERCADOPAGO_ACCESS_TOKEN` no está configurado, se usa un modo
mock que permite completar el flujo de checkout en el portfolio sin
credenciales reales de MercadoPago. El SDK de `mercadopago` se importa de
forma diferida (dentro de la función) para que el resto de la aplicación
funcione aunque el paquete no esté instalado.
"""

import hashlib
import hmac
import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.order import Order
from app.utils.constants import OrderStatus, PaymentStatus

logger = logging.getLogger(__name__)


def verify_webhook_signature(
    *,
    x_signature: str | None,
    x_request_id: str | None,
    data_id: str | None,
) -> bool:
    """Valida la firma HMAC de un webhook de MercadoPago.

    Sigue el algoritmo documentado por MercadoPago: el header
    ``x-signature`` trae pares ``ts=<timestamp>,v1=<hash>``; el hash
    esperado es el HMAC-SHA256 (con `MERCADOPAGO_WEBHOOK_SECRET`) del
    "manifest" ``id:<data_id>;request-id:<x_request_id>;ts:<ts>;``.

    Si `settings.MERCADOPAGO_WEBHOOK_SECRET` no está configurado (modo
    mock/desarrollo, sin credenciales reales de MercadoPago), se omite la
    validación y se loguea una advertencia: no hay secreto real contra el
    cual validar. En producción con MercadoPago real, este secret SIEMPRE
    debe estar configurado.
    """
    if not settings.MERCADOPAGO_WEBHOOK_SECRET:
        logger.warning(
            "MERCADOPAGO_WEBHOOK_SECRET no configurado: se omite la validación de "
            "firma del webhook (esperado sólo en modo mock/desarrollo)."
        )
        return True

    if not x_signature:
        return False

    parts: dict[str, str] = {}
    for chunk in x_signature.split(","):
        if "=" not in chunk:
            continue
        key, _, value = chunk.partition("=")
        parts[key.strip()] = value.strip()

    ts = parts.get("ts")
    received_hash = parts.get("v1")
    if not ts or not received_hash:
        return False

    manifest = f"id:{data_id or ''};request-id:{x_request_id or ''};ts:{ts};"
    expected_hash = hmac.new(
        settings.MERCADOPAGO_WEBHOOK_SECRET.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_hash, received_hash)


async def create_payment_preference(db: AsyncSession, order: Order) -> dict[str, Any]:
    """Crea la preferencia de pago para una orden.

    En modo mock (sin token de MercadoPago configurado) devuelve una
    preferencia falsa que apunta a un endpoint local de checkout simulado.
    Con un token real, crea la preferencia usando el SDK oficial de
    MercadoPago.
    """
    if not settings.MERCADOPAGO_ACCESS_TOKEN:
        return {
            "preference_id": f"mock-pref-{order.id}",
            "init_point": f"/api/payments/mock-checkout/{order.id}",
            "mock": True,
        }

    import mercadopago  # Import diferido: el paquete puede no estar instalado.

    sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

    items = [
        {
            "title": item.product_name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "currency_id": "ARS",
        }
        for item in order.items
    ]

    # Los back_urls y notification_url son placeholders para desarrollo local.
    # En producción se configuran por variables de entorno.
    preference_data = {
        "items": items,
        "back_urls": {
            "success": "http://localhost:5173/checkout/success",
            "failure": "http://localhost:5173/checkout/failure",
            "pending": "http://localhost:5173/checkout/pending",
        },
        "external_reference": str(order.id),
        "notification_url": "http://localhost:8000/api/payments/webhook",
    }

    result = sdk.preference().create(preference_data)
    response = result["response"]

    return {
        "preference_id": response["id"],
        "init_point": response["init_point"],
        "mock": False,
    }


async def _get_order_for_webhook(db: AsyncSession, payment_data: dict[str, Any]) -> Order | None:
    """Busca la orden asociada a un webhook por `external_reference` o `payment_id`."""
    external_reference = payment_data.get("external_reference")
    payment_id = payment_data.get("payment_id")

    order: Order | None = None

    if external_reference:
        try:
            order_id = uuid.UUID(str(external_reference))
        except ValueError:
            order_id = None
        if order_id is not None:
            order = await db.get(Order, order_id)

    if order is None and payment_id:
        stmt = select(Order).where(Order.payment_id == payment_id)
        order = (await db.execute(stmt)).scalar_one_or_none()

    return order


async def process_webhook(db: AsyncSession, payment_data: dict[str, Any]) -> None:
    """Procesa una notificación de pago (webhook de MercadoPago o del mock local).

    El formato real de los webhooks de MercadoPago requiere validarse
    contra su documentación (incluye `topic`/`type` y `data.id`, y suele
    requerir una consulta adicional a la API de pagos para obtener el
    estado real). Para simplificar, este módulo acepta un formato ya
    normalizado: `{"external_reference": str, "status": "approved" |
    "rejected" | "pending", "payment_id": str}`, que es el mismo formato
    que usa `mock_approve_payment`.

    No lanza excepciones ante orden inexistente: sólo lo loguea, ya que
    MercadoPago reintenta el webhook si la respuesta indica un error.
    """
    order = await _get_order_for_webhook(db, payment_data)

    if order is None:
        logger.warning(
            "Webhook de pago recibido para una orden inexistente: %s", payment_data
        )
        return

    payment_status = payment_data.get("status")

    if payment_status == "approved":
        order.payment_status = PaymentStatus.APPROVED
        order.status = OrderStatus.CONFIRMED
    elif payment_status == "rejected":
        order.payment_status = PaymentStatus.REJECTED
    elif payment_status == "pending":
        order.payment_status = PaymentStatus.PENDING

    order.payment_id = payment_data.get("payment_id")

    await db.commit()


async def mock_approve_payment(db: AsyncSession, order_id: uuid.UUID) -> Order:
    """Simula la aprobación de un pago (para el checkout mock sin MercadoPago real).

    Llama internamente a `process_webhook` con un payload de pago aprobado
    y devuelve la orden ya actualizada.
    """
    await process_webhook(
        db,
        {
            "external_reference": str(order_id),
            "status": "approved",
            "payment_id": f"mock-{order_id}",
        },
    )

    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")

    return order
