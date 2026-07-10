"""Tests de autenticación: registro, login y usuario actual."""

from httpx import AsyncClient

from tests.conftest import VALID_PASSWORD, register_user, unique_email


class TestRegister:
    async def test_register_success_returns_token(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/auth/register",
            json={
                "email": unique_email(),
                "password": VALID_PASSWORD,
                "first_name": "Ada",
                "last_name": "Lovelace",
            },
        )

        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    async def test_register_duplicate_email_fails(self, client: AsyncClient) -> None:
        email = unique_email()
        first = await client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": VALID_PASSWORD,
                "first_name": "Ada",
                "last_name": "Lovelace",
            },
        )
        assert first.status_code == 201

        second = await client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": VALID_PASSWORD,
                "first_name": "Otra",
                "last_name": "Persona",
            },
        )

        # El servicio real devuelve 400 (ver app/routers/auth.py); se
        # documenta el código exacto acá para que un cambio futuro rompa
        # este test de forma explícita en vez de aceptar silenciosamente
        # cualquier 4xx.
        assert second.status_code == 400
        assert "email" in second.json()["detail"].lower()

    async def test_register_weak_password_returns_422(self, client: AsyncClient) -> None:
        # BUG REAL DE LA APP (no arreglado acá, ver reporte del test-runner):
        # el `field_validator` de `UserCreate.validate_password`
        # (app/schemas/user.py) levanta `ValueError`, que Pydantic v2
        # incluye tal cual (el objeto excepción, no serializado) en
        # `ctx.error` dentro de `exc.errors()`. El handler custom de
        # `RequestValidationError` en `app/main.py` arma la respuesta con
        # `JSONResponse(content={..., "errors": exc.errors()})`, que usa
        # `json.dumps` estándar (no `jsonable_encoder`): serializar ese
        # `ValueError` crudo revienta con `TypeError: Object of type
        # ValueError is not JSON serializable`, devolviendo 500 en vez de
        # 422. Afecta a CUALQUIER validador custom que levante
        # ValueError/AssertionError (también `CouponCreate.check_valid_dates`).
        resp = await client.post(
            "/api/auth/register",
            json={
                "email": unique_email(),
                "password": "weak",
                "first_name": "Ada",
                "last_name": "Lovelace",
            },
        )

        assert resp.status_code == 422

    async def test_register_password_without_uppercase_returns_422(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/auth/register",
            json={
                "email": unique_email(),
                "password": "lowercase123",
                "first_name": "Ada",
                "last_name": "Lovelace",
            },
        )

        assert resp.status_code == 422


class TestLogin:
    async def test_login_success_returns_token(self, client: AsyncClient) -> None:
        user = await register_user(client)

        resp = await client.post(
            "/api/auth/login",
            json={"email": user["email"], "password": user["password"]},
        )

        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password_returns_401(self, client: AsyncClient) -> None:
        user = await register_user(client)

        resp = await client.post(
            "/api/auth/login",
            json={"email": user["email"], "password": "WrongPass123"},
        )

        assert resp.status_code == 401

    async def test_login_nonexistent_user_returns_401(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/auth/login",
            json={"email": unique_email(), "password": VALID_PASSWORD},
        )

        assert resp.status_code == 401


class TestMe:
    async def test_me_with_valid_token_returns_user_data(self, client: AsyncClient) -> None:
        user = await register_user(client)

        resp = await client.get("/api/auth/me", headers=user["headers"])

        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == user["email"]
        assert body["id"] == user["id"]

    async def test_me_without_token_returns_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/auth/me")

        assert resp.status_code == 401

    async def test_me_with_invalid_token_returns_401(self, client: AsyncClient) -> None:
        resp = await client.get(
            "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )

        assert resp.status_code == 401

    async def test_me_response_never_contains_hashed_password(self, client: AsyncClient) -> None:
        user = await register_user(client)

        resp = await client.get("/api/auth/me", headers=user["headers"])

        assert resp.status_code == 200
        body = resp.json()
        assert "hashed_password" not in body
        assert "password" not in body
