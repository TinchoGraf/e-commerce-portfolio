"""Modelo de marca de productos."""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.product import Product


class Brand(Base, UUIDPkMixin, TimestampMixin):
    """Marca/fabricante de productos (ej: Apple, Samsung, Logitech)."""

    __tablename__ = "brands"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    products: Mapped[list["Product"]] = relationship("Product", back_populates="brand")

    def __repr__(self) -> str:
        return f"<Brand id={self.id} name={self.name!r}>"
