"""Endpoint de métricas del panel de administración (dashboard).

El endpoint NO contiene lógica de negocio: sólo llama al service
correspondiente y devuelve la response mapeada al schema Pydantic.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.dashboard import DashboardMetricsResponse
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("", response_model=DashboardMetricsResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> DashboardMetricsResponse:
    """Obtiene las métricas del dashboard: resumen, ventas, top productos,
    stock bajo y órdenes recientes (sólo admin).
    """
    return await dashboard_service.get_dashboard_metrics(db)
