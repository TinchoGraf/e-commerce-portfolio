"""Enums compartidos por toda la aplicación."""

from enum import Enum


class UserRole(str, Enum):
    """Rol de un usuario dentro del sistema."""

    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


class OrderStatus(str, Enum):
    """Estados posibles de una orden de compra."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    """Estados posibles de un pago."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"
