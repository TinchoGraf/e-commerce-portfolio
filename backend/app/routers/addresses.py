"""Endpoints de direcciones de usuario.

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.address_service`` y arma la respuesta.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.address import AddressCreate, AddressResponse, AddressUpdate
from app.schemas.common import MessageResponse
from app.services import address_service

router = APIRouter(tags=["addresses"])


@router.get("", response_model=list[AddressResponse])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AddressResponse]:
    """Lista todas las direcciones del usuario autenticado."""
    addresses = await address_service.list_addresses(db, current_user.id)
    return [AddressResponse.model_validate(address) for address in addresses]


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    """Busca una dirección propia del usuario autenticado por id."""
    address = await address_service.get_address(db, current_user.id, address_id)
    return AddressResponse.model_validate(address)


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    """Crea una dirección para el usuario autenticado."""
    address = await address_service.create_address(db, current_user.id, data)
    return AddressResponse.model_validate(address)


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    """Actualiza parcialmente una dirección propia del usuario autenticado."""
    address = await address_service.update_address(db, current_user.id, address_id, data)
    return AddressResponse.model_validate(address)


@router.delete("/{address_id}", response_model=MessageResponse)
async def delete_address(
    address_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Elimina una dirección propia del usuario autenticado."""
    await address_service.delete_address(db, current_user.id, address_id)
    return MessageResponse(message="Dirección eliminada correctamente")
