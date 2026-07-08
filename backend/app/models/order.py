"""Modelos de orden de compra y sus ítems (snapshot de productos comprados)."""

import uuid
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import CreatedAtMixin, TimestampMixin, UUIDPkMixin
from app.utils.constants import OrderStatus, PaymentStatus

if TYPE_CHECKING:
    from app.models.coupon import Coupon, CouponUsage
    from app.models.product import Product
    from app.models.product_variant import ProductVariant
    from app.models.user import User


class Order(Base, UUIDPkMixin, TimestampMixin):
    """Orden de compra realizada por un usuario, con snapshot de dirección y totales."""

    __tablename__ = "orders"

    order_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), default=OrderStatus.PENDING, nullable=False
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.PENDING, nullable=False
    )
    # Snapshot de la dirección de envío al momento de la compra (independiente de `addresses`).
    shipping_address_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    shipping_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True
    )
    payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    coupon: Mapped["Coupon | None"] = relationship("Coupon", back_populates="orders")
    coupon_usage: Mapped[list["CouponUsage"]] = relationship(
        "CouponUsage", back_populates="order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} order_number={self.order_number!r} status={self.status}>"


class OrderItem(Base, UUIDPkMixin, CreatedAtMixin):
    """Ítem de una orden: snapshot del producto comprado (nombre/sku) al momento de la compra."""

    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True
    )
    # Snapshots: se preservan aunque el producto original cambie o se desactive.
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relaciones
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
    variant: Mapped["ProductVariant | None"] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} order_id={self.order_id} product_name={self.product_name!r}>"
