"""Modelo de ítem de lista de deseos (wishlist)."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import CreatedAtMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class WishlistItem(Base, UUIDPkMixin, CreatedAtMixin):
    """Producto guardado por un usuario en su lista de deseos. Sin `updated_at`."""

    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_wishlist_item_user_product"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="wishlist_items")
    product: Mapped["Product"] = relationship("Product")

    def __repr__(self) -> str:
        return f"<WishlistItem id={self.id} user_id={self.user_id} product_id={self.product_id}>"
