"""Endpoints de reseñas de producto.

Este módulo NO contiene lógica de negocio: sólo recibe la request, llama
a las funciones de ``app.services.review_service`` y arma la respuesta.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.review import (
    PaginatedReviewResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    ReviewWithUserResponse,
)
from app.services import review_service
from app.utils.constants import UserRole

router = APIRouter(tags=["reviews"])


def _build_user_name(first_name: str, last_name: str) -> str:
    """Arma el nombre mostrado de una reseña: "Nombre L." (o sólo "Nombre" si no hay apellido)."""
    if not last_name:
        return first_name
    return f"{first_name} {last_name[0]}."


@router.get("/product/{product_id}", response_model=PaginatedReviewResponse)
async def list_product_reviews(
    product_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    db: AsyncSession = Depends(get_db),
) -> PaginatedReviewResponse:
    """Lista paginada de las reseñas aprobadas de un producto. No requiere autenticación."""
    result = await review_service.list_reviews_for_product(
        db, product_id, page=page, page_size=page_size, sort_by=sort_by
    )

    items = [
        ReviewWithUserResponse(
            id=review.id,
            user_id=review.user_id,
            product_id=review.product_id,
            rating=review.rating,
            title=review.title,
            comment=review.comment,
            is_verified_purchase=review.is_verified_purchase,
            is_approved=review.is_approved,
            created_at=review.created_at,
            updated_at=review.updated_at,
            user_name=_build_user_name(review.user.first_name, review.user.last_name),
        )
        for review in result["items"]
    ]

    return PaginatedReviewResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.post("", response_model=ReviewWithUserResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewWithUserResponse:
    """Crea una reseña del usuario autenticado sobre un producto."""
    review = await review_service.create_review(db, current_user.id, data)

    return ReviewWithUserResponse(
        id=review.id,
        user_id=review.user_id,
        product_id=review.product_id,
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        is_verified_purchase=review.is_verified_purchase,
        is_approved=review.is_approved,
        created_at=review.created_at,
        updated_at=review.updated_at,
        user_name=_build_user_name(current_user.first_name, current_user.last_name),
    )


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    """Actualiza parcialmente una reseña propia del usuario autenticado."""
    review = await review_service.update_review(db, current_user.id, review_id, data)
    return ReviewResponse.model_validate(review)


@router.delete("/{review_id}", response_model=MessageResponse)
async def delete_review(
    review_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Elimina una reseña propia del usuario autenticado (o cualquiera si es admin)."""
    await review_service.delete_review(
        db, current_user.id, review_id, is_admin=(current_user.role == UserRole.ADMIN)
    )
    return MessageResponse(message="Reseña eliminada correctamente")
