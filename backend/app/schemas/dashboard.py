"""Schemas Pydantic de métricas del panel de administración (dashboard)."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.utils.constants import OrderStatus


class DashboardSummary(BaseModel):
    """Métricas resumen del negocio para las tarjetas principales del dashboard."""

    total_revenue: Decimal
    total_orders: int
    pending_orders: int
    total_customers: int
    total_products: int


class DailySales(BaseModel):
    """Ventas agregadas de un día (últimos 30 días)."""

    date: date
    revenue: Decimal
    orders: int


class TopProduct(BaseModel):
    """Producto entre los más vendidos, por cantidad de unidades."""

    product_id: uuid.UUID
    product_name: str
    total_sold: int
    revenue: Decimal


class LowStockProduct(BaseModel):
    """Producto activo con stock igual o por debajo de su umbral mínimo."""

    id: uuid.UUID
    name: str
    sku: str | None = None
    stock: int
    low_stock_threshold: int


class RecentOrder(BaseModel):
    """Orden reciente con el nombre del cliente ya resuelto."""

    id: uuid.UUID
    order_number: str
    customer_name: str
    total: Decimal
    status: OrderStatus
    created_at: datetime


class DashboardMetricsResponse(BaseModel):
    """Respuesta completa del endpoint de métricas del dashboard."""

    summary: DashboardSummary
    recent_sales: list[DailySales]
    top_products: list[TopProduct]
    low_stock_products: list[LowStockProduct]
    recent_orders: list[RecentOrder]
