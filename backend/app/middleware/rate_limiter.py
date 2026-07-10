"""Rate limiting middleware basado en memoria (por IP)."""

import time
from collections import defaultdict

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class RateLimiterMiddleware:
    """Limita requests por IP usando un bucket de ventana deslizante en memoria."""

    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 100,
        window_seconds: int = 60,
        auth_max_requests: int = 10,
        auth_window_seconds: int = 60,
    ) -> None:
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.auth_max_requests = auth_max_requests
        self.auth_window_seconds = auth_window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded:
            return forwarded.split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _is_auth_path(self, path: str) -> bool:
        return path.startswith("/api/auth/login") or path.startswith("/api/auth/register")

    def _cleanup(self, ip: str, window: int) -> list[float]:
        now = time.time()
        self._requests[ip] = [t for t in self._requests[ip] if now - t < window]
        return self._requests[ip]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        ip = self._get_client_ip(scope)
        path = scope.get("path", "")
        is_auth = self._is_auth_path(path)

        max_req = self.auth_max_requests if is_auth else self.max_requests
        window = self.auth_window_seconds if is_auth else self.window_seconds

        recent = self._cleanup(ip, window)

        if len(recent) >= max_req:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas solicitudes. Intentá de nuevo en unos minutos."},
                headers={"Retry-After": str(window)},
            )
            await response(scope, receive, send)
            return

        self._requests[ip].append(time.time())
        await self.app(scope, receive, send)
