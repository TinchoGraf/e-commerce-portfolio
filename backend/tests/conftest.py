"""Fixtures compartidas de toda la suite de tests del backend.

IMPORTANTE sobre el orden de este archivo: las variables de entorno se
setean ANTES de importar cualquier cosa de `app`, porque `app.config.Settings`
no tiene defaults para `DATABASE_URL`/`SECRET_KEY`/`CORS_ORIGINS` (son
obligatorios desde un `.env` real en producción/desarrollo). Esto permite
correr la suite completa sin necesitar un `.env` ni PostgreSQL: se usa
SQLite en memoria vía `aiosqlite`.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:5173"]')
os.environ.setdefault("MERCADOPAGO_ACCESS_TOKEN", "")
os.environ.setdefault("MERCADOPAGO_WEBHOOK_SECRET", "")
os.environ.setdefault("DEBUG", "false")

import uuid  # noqa: E402
from collections.abc import AsyncGenerator  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from decimal import Decimal  # noqa: E402
from typing import Any  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlalchemy.sql.sqltypes import Uuid as SqlaUuid  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.address import Address  # noqa: E402
from app.models.brand import Brand  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.coupon import Coupon  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.user import User  # noqa: E402
from app.utils.constants import UserRole  # noqa: E402

# ---------------------------------------------------------------------------
# Parche de compatibilidad SQLite para columnas `postgresql.UUID(as_uuid=True)`
# ---------------------------------------------------------------------------
# Todos los modelos ORM usan `sqlalchemy.dialects.postgresql.UUID(as_uuid=True)`
# como PK/FK (ver `app/models/base.py` y compañía). Contra PostgreSQL real
# (con asyncpg) esto funciona sin problema aunque se compare la columna
# contra un `str` (por ejemplo, `app/dependencies/auth.py::get_current_user`
# hace `User.id == user_id` con `user_id: str`, el "sub" crudo del JWT): el
# driver nativo de Postgres castea el string a UUID en el propio motor.
#
# Bajo SQLite, `dialect.supports_native_uuid` es `False`, así que
# `sqlalchemy.types.Uuid.bind_processor` (la clase base de la que hereda
# `postgresql.UUID`) usa una rama "character_based_uuid" que asume que el
# valor Python ya es una instancia real de `uuid.UUID` y llama `value.hex`
# directamente. Si se le pasa un `str` (como el "sub" del JWT), explota con
# `AttributeError: 'str' object has no attribute 'hex'`.
#
# Esto NO es un bug de la aplicación (nunca se ejecuta ese código contra
# SQLite en producción), es puramente una incompatibilidad del backend de
# testing elegido. Se parchea acá, sólo para el proceso de tests, para que
# el bind_processor acepte también `str` (convirtiéndolo a `uuid.UUID` antes
# de delegar en el processor original), replicando el mismo comportamiento
# tolerante que ya tiene Postgres/asyncpg en producción.
_original_uuid_bind_processor = SqlaUuid.bind_processor


def _tolerant_uuid_bind_processor(self, dialect):  # type: ignore[no-untyped-def]
    processor = _original_uuid_bind_processor(self, dialect)
    if processor is None or not self.as_uuid:
        return processor

    def _process(value: Any) -> Any:
        if isinstance(value, str):
            value = uuid.UUID(value)
        return processor(value)

    return _process


SqlaUuid.bind_processor = _tolerant_uuid_bind_processor

# ---------------------------------------------------------------------------
# Parche de compatibilidad SQLite para columnas `onupdate=func.now()`
# ---------------------------------------------------------------------------
# `TimestampMixin.updated_at` (ver `app/models/base.py`) usa
# `onupdate=func.now()`, un valor calculado por el servidor de base de
# datos. Tras un UPDATE, SQLAlchemy no conoce ese valor del lado Python y
# lo deja "expirado" hasta el próximo acceso. Contra PostgreSQL/asyncpg en
# producción esto no genera ningún problema porque el mapper usa
# `eager_defaults="auto"` (default de SQLAlchemy 2.0), que aprovecha
# `RETURNING` para traer ese valor en el mismo UPDATE. Se probó
# empíricamente que, con el driver `aiosqlite`, ese mismo mecanismo
# `"auto"` NO dispara el post-fetch tras un UPDATE (a pesar de que el
# dialecto sqlite sí soporta `UPDATE ... RETURNING`), dejando `updated_at`
# expirado. Cuando un endpoint arma la respuesta con
# `SomeSchema.model_validate(orm_obj)` fuera de un `await` (como hace
# Pydantic al serializar), acceder a ese atributo expirado dispara un
# intento de lazy-load síncrono que revienta con
# `MissingGreenlet: greenlet_spawn has not been called`.
#
# Esto NO es un bug de la aplicación: nunca ocurre contra Postgres. Se
# fuerza `eager_defaults=True` en todos los mappers sólo para el proceso de
# tests, para que SQLAlchemy siempre haga el post-fetch necesario dentro
# del propio `await session.commit()`, evitando el lazy-load fuera de
# contexto async.
from sqlalchemy.orm import configure_mappers  # noqa: E402

configure_mappers()
for _mapper in Base.registry.mappers:
    _mapper.eager_defaults = True

# ---------------------------------------------------------------------------
# Parche de compatibilidad SQLite para columnas `DateTime(timezone=True)`
# ---------------------------------------------------------------------------
# Todas las columnas de fecha/hora del proyecto usan `DateTime(timezone=True)`
# (ver `app/models/base.py` y `app/models/coupon.py`). Contra PostgreSQL esto
# preserva el offset de timezone de punta a punta. SQLite no tiene un tipo
# nativo de fecha/hora con timezone: el dialecto `sqlite` de SQLAlchemy
# ignora `timezone=True` y guarda/lee siempre datetimes *naive*. Esto rompe
# comparaciones legítimas del código de la app que asumen (correctamente,
# para Postgres) que estos valores vienen con tzinfo, por ejemplo
# `coupon_service.validate_coupon`: `datetime.now(timezone.utc) <
# coupon.valid_from` explota con `TypeError: can't compare offset-naive and
# offset-aware datetimes` si `valid_from` perdió su tzinfo al pasar por
# SQLite.
#
# Esto NO es un bug de la aplicación (no ocurre contra Postgres). Se
# parchea el `result_processor` del tipo `DATETIME` de SQLite, sólo para el
# proceso de tests, para que reatache `tzinfo=UTC` a los datetimes leídos,
# emulando el comportamiento real de Postgres.
from sqlalchemy.dialects.sqlite.base import DATETIME as SqliteDATETIME  # noqa: E402

_original_datetime_result_processor = SqliteDATETIME.result_processor


def _tz_aware_datetime_result_processor(self, dialect, coltype):  # type: ignore[no-untyped-def]
    processor = _original_datetime_result_processor(self, dialect, coltype)
    if processor is None:
        return processor

    def _process(value: Any) -> Any:
        result = processor(value)
        if result is not None and result.tzinfo is None:
            result = result.replace(tzinfo=timezone.utc)
        return result

    return _process


SqliteDATETIME.result_processor = _tz_aware_datetime_result_processor

# ---------------------------------------------------------------------------
# Base de datos de test: SQLite en memoria compartida por toda la sesión de
# tests a través de un único connection pool (`StaticPool`). Esto es
# necesario porque `sqlite+aiosqlite://:memory:` crea una base nueva por
# conexión: sin `StaticPool` la sesión que abre un fixture y la que abre
# `get_db` en cada request HTTP verían bases distintas y vacías entre sí.
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite://"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db() -> AsyncGenerator[None, None]:
    """Crea todas las tablas antes de cada test y las elimina al finalizar.

    Aislamiento total entre tests: cada test arranca con una base vacía.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def reset_middleware_state() -> None:
    """Fuerza a Starlette a reconstruir el stack de middlewares antes de cada test.

    `RateLimiterMiddleware` guarda su contador de requests en memoria
    (`self._requests`) en la instancia que Starlette crea (y cachea) la
    primera vez que se procesa un request contra `app`. Como `app` es un
    único objeto importado una sola vez para toda la sesión de pytest, sin
    este reset los requests de un test se acumularían sobre los del
    siguiente, y un test cualquiera podría empezar a fallar con 429 sin
    ninguna relación con lo que está probando. Poner `app.middleware_stack
    = None` hace que Starlette reconstruya (y por lo tanto reinstancie)
    todos los middlewares -incluido el rate limiter, con su dict vacío- en
    el próximo request de este test.
    """
    app.middleware_stack = None


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Helpers de registro/login
# ---------------------------------------------------------------------------
VALID_PASSWORD = "Testpass123"


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"


async def register_user(
    client: AsyncClient,
    *,
    email: str | None = None,
    password: str = VALID_PASSWORD,
    first_name: str = "Test",
    last_name: str = "User",
) -> dict[str, Any]:
    """Registra un usuario vía la API y devuelve sus datos + headers de auth."""
    email = email or unique_email()
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    user_data = me.json()

    return {
        "email": email,
        "password": password,
        "token": token,
        "headers": headers,
        "id": user_data["id"],
    }


@pytest_asyncio.fixture
async def test_user(client: AsyncClient) -> dict[str, Any]:
    return await register_user(client)


@pytest.fixture
def auth_headers(test_user: dict[str, Any]) -> dict[str, str]:
    return test_user["headers"]


@pytest_asyncio.fixture
async def second_user(client: AsyncClient) -> dict[str, Any]:
    """Un segundo usuario normal, distinto de `test_user`, para tests de ownership."""
    return await register_user(client, email=unique_email("other"))


@pytest.fixture
def second_auth_headers(second_user: dict[str, Any]) -> dict[str, str]:
    return second_user["headers"]


@pytest_asyncio.fixture
async def admin_user(client: AsyncClient, db_session: AsyncSession) -> dict[str, Any]:
    """Un usuario registrado normalmente y luego promovido a ADMIN directo en la BD.

    Se reutiliza el mismo token emitido en el registro: el JWT sólo
    codifica `sub` (el id de usuario), no el rol, así que sigue siendo
    válido tras el cambio de rol (el rol se resuelve en cada request
    consultando la BD vía `get_current_user`/`get_current_admin`).
    """
    user = await register_user(client, email=unique_email("admin"))

    result = await db_session.execute(select(User).where(User.id == uuid.UUID(user["id"])))
    db_user = result.scalar_one()
    db_user.role = UserRole.ADMIN
    await db_session.commit()

    return user


@pytest.fixture
def admin_headers(admin_user: dict[str, Any]) -> dict[str, str]:
    return admin_user["headers"]


# ---------------------------------------------------------------------------
# Helpers de datos (creación directa en BD para el "Arrange" de los tests,
# evitando pasar por el flujo completo del panel admin cuando no es lo que
# se está testeando).
# ---------------------------------------------------------------------------
async def create_category(db_session: AsyncSession, *, name: str | None = None, **kwargs: Any) -> Category:
    suffix = uuid.uuid4().hex[:8]
    name = name or f"Category {suffix}"
    category = Category(name=name, slug=f"category-{suffix}", **kwargs)
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


async def create_brand(db_session: AsyncSession, *, name: str | None = None, **kwargs: Any) -> Brand:
    suffix = uuid.uuid4().hex[:8]
    name = name or f"Brand {suffix}"
    brand = Brand(name=name, slug=f"brand-{suffix}", **kwargs)
    db_session.add(brand)
    await db_session.commit()
    await db_session.refresh(brand)
    return brand


async def create_product(
    db_session: AsyncSession,
    *,
    name: str | None = None,
    slug: str | None = None,
    price: Decimal = Decimal("1000.00"),
    stock: int = 10,
    is_active: bool = True,
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    **kwargs: Any,
) -> Product:
    suffix = uuid.uuid4().hex[:8]
    name = name or f"Product {suffix}"
    slug = slug or f"product-{suffix}"
    product = Product(
        name=name,
        slug=slug,
        price=price,
        stock=stock,
        is_active=is_active,
        category_id=category_id,
        brand_id=brand_id,
        **kwargs,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product


async def refresh(db_session: AsyncSession, model: type, obj_id: Any) -> Any:
    """Vuelve a leer una fila desde la BD, ignorando el identity map de la
    sesión (`populate_existing`), para ver cambios comiteados por otra
    sesión (por ejemplo, la que abrió un request HTTP a través de `get_db`).
    """
    stmt = select(model).where(model.id == obj_id).execution_options(populate_existing=True)
    result = await db_session.execute(stmt)
    return result.scalar_one()


async def create_address_for_user(
    db_session: AsyncSession, user_id: uuid.UUID, **kwargs: Any
) -> Address:
    defaults: dict[str, Any] = {
        "street": "Av. Siempre Viva",
        "number": "742",
        "city": "Springfield",
        "state": "Buenos Aires",
        "zip_code": "1000",
        "country": "Argentina",
        "is_default": True,
    }
    defaults.update(kwargs)
    address = Address(user_id=user_id, **defaults)
    db_session.add(address)
    await db_session.commit()
    await db_session.refresh(address)
    return address


async def create_coupon_in_db(
    db_session: AsyncSession,
    *,
    code: str | None = None,
    discount_type: str = "percentage",
    discount_value: Decimal = Decimal("10"),
    valid_from: datetime | None = None,
    valid_until: datetime | None = None,
    **kwargs: Any,
) -> Coupon:
    code = code or f"COUPON{uuid.uuid4().hex[:8].upper()}"
    valid_from = valid_from or (datetime.now(timezone.utc) - timedelta(days=1))
    valid_until = valid_until or (datetime.now(timezone.utc) + timedelta(days=30))
    coupon = Coupon(
        code=code,
        discount_type=discount_type,
        discount_value=discount_value,
        valid_from=valid_from,
        valid_until=valid_until,
        **kwargs,
    )
    db_session.add(coupon)
    await db_session.commit()
    await db_session.refresh(coupon)
    return coupon
