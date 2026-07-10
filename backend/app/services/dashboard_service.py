"""Lógica de negocio de métricas del panel de administración (dashboard).

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils.constants import OrderStatus, PaymentStatus, UserRole

# Cantidad de días hacia atrás que se muestran en el gráfico de ventas recientes.
RECENT_SALES_DAYS = 30
# Cantidad máxima de productos más vendidos a mostrar.
TOP_PRODUCTS_LIMIT = 10
# Cantidad máxima de productos con stock bajo a mostrar.
LOW_STOCK_LIMIT = 20
# Cantidad máxima de órdenes recientes a mostrar.
RECENT_ORDERS_LIMIT = 10


async def _get_summary(db: AsyncSession) -> dict[str, Any]:
    """Calcula las métricas resumen: ingresos, órdenes, clientes y productos."""
    revenue_stmt = select(func.coalesce(func.sum(Order.total), 0)).where(
        Order.payment_status == PaymentStatus.APPROVED
    )
    total_revenue = (await db.execute(revenue_stmt)).scalar_one()

    total_orders_stmt = select(func.count()).select_from(Order)
    total_orders = (await db.execute(total_orders_stmt)).scalar_one()

    pending_orders_stmt = (
        select(func.count()).select_from(Order).where(Order.status == OrderStatus.PENDING)
    )
    pending_orders = (await db.execute(pending_orders_stmt)).scalar_one()

    total_customers_stmt = (
        select(func.count()).select_from(User).where(User.role == UserRole.CUSTOMER)
    )
    total_customers = (await db.execute(total_customers_stmt)).scalar_one()

    total_products_stmt = (
        select(func.count()).select_from(Product).where(Product.is_active == True)  # noqa: E712
    )
    total_products = (await db.execute(total_products_stmt)).scalar_one()

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_customers": total_customers,
        "total_products": total_products,
    }


async def _get_recent_sales(db: AsyncSession) -> list[dict[str, Any]]:
    """Ventas de los últimos 30 días agrupadas por día (sólo pagos aprobados)."""
    since = datetime.utcnow() - timedelta(days=RECENT_SALES_DAYS)
    day_column = func.date_trunc("day", Order.created_at).label("day")

    stmt = (
        select(
            day_column,
            func.sum(Order.total).label("revenue"),
            func.count().label("orders"),
        )
        .where(Order.payment_status == PaymentStatus.APPROVED, Order.created_at >= since)
        .group_by(day_column)
        .order_by(day_column)
    )
    result = await db.execute(stmt)

    return [
        {"date": row.day.date(), "revenue": row.revenue, "orders": row.orders}
        for row in result.all()
    ]


async def _get_top_products(db: AsyncSession) -> list[dict[str, Any]]:
    """Top de productos más vendidos por cantidad, usando el snapshot de `OrderItem`."""
    stmt = (
        select(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.total_price).label("revenue"),
        )
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(TOP_PRODUCTS_LIMIT)
    )
    result = await db.execute(stmt)

    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "total_sold": row.total_sold,
            "revenue": row.revenue,
        }
        for row in result.all()
    ]


async def _get_low_stock_products(db: AsyncSession) -> list[dict[str, Any]]:
    """Productos activos con stock igual o por debajo de su umbral mínimo."""
    stmt = (
        select(Product)
        .where(Product.is_active == True, Product.stock <= Product.low_stock_threshold)  # noqa: E712
        .order_by(Product.stock.asc())
        .limit(LOW_STOCK_LIMIT)
    )
    result = await db.execute(stmt)

    return [
        {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "stock": product.stock,
            "low_stock_threshold": product.low_stock_threshold,
        }
        for product in result.scalars().all()
    ]


async def _get_recent_orders(db: AsyncSession) -> list[dict[str, Any]]:
    """Últimas órdenes (cualquier estado), con el nombre del cliente resuelto."""
    customer_name = func.concat(User.first_name, " ", User.last_name).label("customer_name")

    stmt = (
        select(
            Order.id,
            Order.order_number,
            customer_name,
            Order.total,
            Order.status,
            Order.created_at,
        )
        .join(User, User.id == Order.user_id)
        .order_by(Order.created_at.desc())
        .limit(RECENT_ORDERS_LIMIT)
    )
    result = await db.execute(stmt)

    return [
        {
            "id": row.id,
            "order_number": row.order_number,
            "customer_name": row.customer_name,
            "total": row.total,
            "status": row.status,
            "created_at": row.created_at,
        }
        for row in result.all()
    ]


async def get_dashboard_metrics(db: AsyncSession) -> dict[str, Any]:
    """Arma todas las métricas del panel de administración en un único dict.

    Incluye resumen general, ventas de los últimos 30 días, top de productos
    más vendidos, productos con stock bajo y las últimas órdenes recibidas.

    NOTA sobre paralelización: las 5 sub-consultas de abajo se ejecutan
    secuencialmente a propósito, NO con `asyncio.gather`. `db` es una única
    `AsyncSession` inyectada por request (`Depends(get_db)`), y una
    `AsyncSession` de SQLAlchemy no es segura para ejecutar múltiples
    `await db.execute(...)` concurrentes sobre la misma conexión: eso
    típicamente rompe con `InterfaceError: another operation is in
    progress` o corrompe el estado interno de la sesión. Paralelizar esto
    requeriría abrir una sesión/conexión separada por sub-consulta (o un
    engine con pool que lo soporte), lo cual excede el alcance de esta
    revisión. Si el dashboard se vuelve un cuello de botella real, evaluar
    ese rediseño en vez de envolver estas llamadas en `asyncio.gather`.
    """
    return {
        "summary": await _get_summary(db),
        "recent_sales": await _get_recent_sales(db),
        "top_products": await _get_top_products(db),
        "low_stock_products": await _get_low_stock_products(db),
        "recent_orders": await _get_recent_orders(db),
    }
