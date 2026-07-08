"""Endpoints de órdenes de compra (checkout, consulta y administración).

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.order_service`` y arma la respuesta.

NOTA sobre el orden de declaración: como el prefix completo es
``/api/orders``, las rutas hijas son ``""``, ``"/admin/all"``,
``"/admin/{order_id}"`` y ``"/{order_id}"``. Las rutas ``/admin/*`` se
declaran ANTES que ``/{order_id}`` para evitar cualquier ambigüedad de
matching por parte de FastAPI (aunque en este caso puntual los paths no
colisionan literalmente, se respeta como buena práctica general para
rutas con un segmento fijo vs. un path param al mismo nivel).
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin, get_current_user
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderDetailResponse,
    OrderUpdate,
    PaginatedOrderResponse,
)
from app.services import order_service
from app.utils.constants import OrderStatus, PaymentStatus, UserRole

router = APIRouter(tags=["orders"])


@router.post("", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """Crea una orden a partir del carrito actual del usuario autenticado (checkout).

    ``order_service.create_order`` ya maneja su propia transacción
    (commit/rollback interno), por lo que este endpoint no comitea de nuevo.
    Cualquier `HTTPException` del service (carrito vacío, stock insuficiente,
    cupón inválido, etc.) se propaga tal cual.
    """
    order = await order_service.create_order(db, current_user.id, data)
    return OrderDetailResponse.model_validate(order)


@router.get("", response_model=PaginatedOrderResponse)
async def list_my_orders(
    page: int = 1,
    page_size: int = 20,
    status: OrderStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedOrderResponse:
    """Lista paginada de las órdenes del usuario autenticado."""
    result = await order_service.list_user_orders(
        db, current_user.id, page=page, page_size=page_size, status=status
    )
    return PaginatedOrderResponse.model_validate(result)


@router.get("/admin/all", response_model=PaginatedOrderResponse)
async def list_all_orders(
    page: int = 1,
    page_size: int = 20,
    status: OrderStatus | None = None,
    payment_status: PaymentStatus | None = None,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedOrderResponse:
    """Lista paginada de todas las órdenes, filtrable por estado y estado de pago (uso admin)."""
    result = await order_service.list_all_orders(
        db, page=page, page_size=page_size, status=status, payment_status=payment_status
    )
    return PaginatedOrderResponse.model_validate(result)


@router.put("/admin/{order_id}", response_model=OrderDetailResponse)
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """Actualiza el estado (u otros campos administrativos) de una orden (uso admin).

    ``order_service.update_order_status`` ya comitea internamente.
    """
    order = await order_service.update_order_status(db, order_id, data)
    return OrderDetailResponse.model_validate(order)


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """Busca una orden por id, propia del usuario autenticado (o cualquiera si es admin)."""
    order = await order_service.get_order(
        db, current_user.id, order_id, is_admin=(current_user.role == UserRole.ADMIN)
    )
    return OrderDetailResponse.model_validate(order)
