"""Lógica de negocio de reseñas de producto.

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import math
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.utils.constants import OrderStatus

# Columnas válidas para ordenar el listado de reseñas (siempre desc).
_SORT_COLUMNS: dict[str, Any] = {
    "created_at": Review.created_at,
    "rating": Review.rating,
}


async def list_reviews_for_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
) -> dict[str, Any]:
    """Lista las reseñas aprobadas de un producto, paginadas.

    Sólo incluye reseñas con `is_approved=True` (uso público). Precarga
    `user` (vía `selectinload`) para que el router/schema pueda armar el
    nombre mostrado ("Nombre L."). `sort_by` puede ser "created_at" o
    "rating" (default "created_at"), siempre en orden descendente.

    Retorna un dict: `{"items", "total", "page", "page_size", "pages"}`.
    """
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    sort_column = _SORT_COLUMNS.get(sort_by, Review.created_at)
    order_expr = sort_column.desc()

    filters = (Review.product_id == product_id, Review.is_approved == True)  # noqa: E712

    count_stmt = select(func.count()).select_from(Review).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Review)
        .options(selectinload(Review.user))
        .where(*filters)
        .order_by(order_expr)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
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


async def _recalculate_product_rating(db: AsyncSession, product_id: uuid.UUID) -> None:
    """Recalcula `avg_rating` y `review_count` de un producto según sus reseñas aprobadas."""
    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product_id, Review.is_approved == True  # noqa: E712
        )
    )
    avg, count = result.one()

    product = await db.get(Product, product_id)
    if product is None:
        return

    product.avg_rating = round(float(avg), 2) if avg else 0
    product.review_count = count
    await db.commit()


async def _get_owned_review(db: AsyncSession, user_id: uuid.UUID, review_id: uuid.UUID) -> Review:
    """Busca una reseña por id validando que pertenezca al usuario. 404 si no existe o no es suya."""
    review = await db.get(Review, review_id)
    if review is None or review.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reseña no encontrada")
    return review


async def create_review(db: AsyncSession, user_id: uuid.UUID, data: ReviewCreate) -> Review:
    """Crea una reseña de un usuario sobre un producto.

    Valida que el producto exista y que el usuario no tenga ya una reseña
    para ese producto (409). Determina `is_verified_purchase` buscando si
    el usuario tiene una orden entregada (`DELIVERED`) que incluya el
    producto. Recalcula `avg_rating`/`review_count` del producto al finalizar.
    """
    product = await db.get(Product, data.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    existing_stmt = select(Review).where(
        Review.user_id == user_id, Review.product_id == data.product_id
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya dejaste una reseña para este producto",
        )

    verified_stmt = (
        select(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            OrderItem.product_id == data.product_id,
            Order.user_id == user_id,
            Order.status == OrderStatus.DELIVERED,
        )
        .limit(1)
    )
    verified_result = (await db.execute(verified_stmt)).scalar_one_or_none()
    is_verified_purchase = verified_result is not None

    review = Review(
        user_id=user_id,
        product_id=data.product_id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_verified_purchase=is_verified_purchase,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    await _recalculate_product_rating(db, data.product_id)

    await db.refresh(review, attribute_names=["user"])
    return review


async def update_review(
    db: AsyncSession, user_id: uuid.UUID, review_id: uuid.UUID, data: ReviewUpdate
) -> Review:
    """Actualiza parcialmente una reseña (sólo el autor puede editarla).

    Si `data.rating` viene y difiere del valor actual, recalcula
    `avg_rating`/`review_count` del producto.
    """
    review = await _get_owned_review(db, user_id, review_id)

    updates = data.model_dump(exclude_unset=True)
    rating_changed = "rating" in updates and updates["rating"] != review.rating

    for field, value in updates.items():
        setattr(review, field, value)

    await db.commit()
    await db.refresh(review)

    if rating_changed:
        await _recalculate_product_rating(db, review.product_id)
        await db.refresh(review)

    await db.refresh(review, attribute_names=["user"])
    return review


async def delete_review(
    db: AsyncSession, user_id: uuid.UUID, review_id: uuid.UUID, is_admin: bool = False
) -> None:
    """Elimina una reseña (sólo el autor o un admin pueden hacerlo).

    Recalcula `avg_rating`/`review_count` del producto luego de eliminar.
    """
    if is_admin:
        review = await db.get(Review, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reseña no encontrada")
    else:
        review = await _get_owned_review(db, user_id, review_id)

    product_id = review.product_id
    await db.delete(review)
    await db.commit()

    await _recalculate_product_rating(db, product_id)
