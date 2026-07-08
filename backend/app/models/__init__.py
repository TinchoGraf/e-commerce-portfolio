"""Importa todos los modelos ORM para que queden registrados en `Base.metadata`.

Esto es lo que permite que Alembic (ver `alembic/env.py`, que hace
`import app.models`) detecte todas las tablas para el autogenerate.
"""

from app.models.address import Address
from app.models.brand import Brand
from app.models.cart import CartItem
from app.models.category import Category
from app.models.coupon import Coupon, CouponUsage
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.models.review import Review
from app.models.user import User
from app.models.wishlist import WishlistItem

__all__ = [
    "Address",
    "Brand",
    "CartItem",
    "Category",
    "Coupon",
    "CouponUsage",
    "Order",
    "OrderItem",
    "Product",
    "ProductImage",
    "ProductVariant",
    "Review",
    "User",
    "WishlistItem",
]
