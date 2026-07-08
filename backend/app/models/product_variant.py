"""Modelo de variante de producto (ej: color, capacidad de almacenamiento)."""

import uuid
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.product import Product


class ProductVariant(Base, UUIDPkMixin, TimestampMixin):
    """Variante de un producto (ej: "256GB - Negro"), con su propio stock y precio ajustado."""

    __tablename__ = "product_variants"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Atributos libres de la variante, ej: {"color": "black", "storage": "256GB"}
    attributes: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    product: Mapped["Product"] = relationship("Product", back_populates="variants")

    def __repr__(self) -> str:
        return f"<ProductVariant id={self.id} name={self.name!r}>"
