"""Generación de números de orden secuenciales."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order


async def generate_order_number(db: AsyncSession) -> str:
    """Genera un número de orden secuencial del día: TS-YYYYMMDD-XXXX."""
    today = date.today()
    prefix = f"TS-{today.strftime('%Y%m%d')}-"
    result = await db.execute(
        select(func.count(Order.id)).where(Order.order_number.like(f"{prefix}%"))
    )
    count = result.scalar_one()
    return f"{prefix}{(count + 1):04d}"
