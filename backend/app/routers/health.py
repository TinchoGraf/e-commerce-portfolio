"""Endpoint de health check."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Devuelve el estado de salud de la API."""
    return {"status": "ok", "version": "0.1.0"}
