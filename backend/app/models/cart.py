"""Modelo de ítem de carrito de compras."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.product_variant import ProductVariant
    from app.models.user import User


class CartItem(Base, UUIDPkMixin, TimestampMixin):
    """Ítem dentro del carrito de compras de un usuario."""

    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", "variant_id", name="uq_cart_item_user_product_variant"),
        # Los NULL no participan de UniqueConstraint en Postgres: este índice parcial
        # evita duplicados de (user_id, product_id) cuando variant_id es NULL.
        Index(
            "ix_cart_item_user_product_no_variant",
            "user_id",
            "product_id",
            unique=True,
            postgresql_where=text("variant_id IS NULL"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="cart_items")
    product: Mapped["Product"] = relationship("Product")
    variant: Mapped["ProductVariant | None"] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<CartItem id={self.id} user_id={self.user_id} product_id={self.product_id}>"
