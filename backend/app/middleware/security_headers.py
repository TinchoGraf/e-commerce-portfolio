"""Middleware que agrega headers de seguridad HTTP estándar."""

from starlette.types import ASGIApp, Receive, Scope, Send


class SecurityHeadersMiddleware:
    """Agrega headers de seguridad a todas las respuestas HTTP."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                security_headers = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
                ]
                existing = list(message.get("headers", []))
                existing.extend(security_headers)
                message["headers"] = existing
            await send(message)

        await self.app(scope, receive, send_with_headers)
