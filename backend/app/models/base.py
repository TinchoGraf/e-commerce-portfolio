"""Mixins comunes reutilizados por todos los modelos ORM.

Estos mixins NO redefinen `Base` (que vive en `app.database` y no debe
tocarse); simplemente aportan columnas repetidas (id, created_at,
updated_at) a las clases que los combinan junto con `Base`.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPkMixin:
    """Agrega una primary key `id` de tipo UUID con default `uuid4`."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class TimestampMixin:
    """Agrega `created_at` y `updated_at` con manejo automático de fechas."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CreatedAtMixin:
    """Agrega solo `created_at`, para tablas de detalle/snapshot sin updated_at."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
