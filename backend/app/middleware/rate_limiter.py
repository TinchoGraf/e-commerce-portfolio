"""Rate limiting middleware.

TODO (Fase 5): implementar rate limiting real (por ejemplo con slowapi o
un middleware custom basado en Redis). Por ahora este módulo es un
placeholder para no bloquear el desarrollo de las fases iniciales.
"""

from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Receive, Scope, Send


class RateLimiterMiddleware:
    """Placeholder de middleware de rate limiting (sin lógica todavía)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # TODO: implementar límite de requests por IP/usuario en Fase 5.
        await self.app(scope, receive, send)
