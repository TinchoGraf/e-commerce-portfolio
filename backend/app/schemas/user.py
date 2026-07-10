"""Schemas Pydantic de usuario y autenticación."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.utils.constants import UserRole


class UserCreate(BaseModel):
    """Datos requeridos para registrar un nuevo usuario."""

    email: EmailStr
    password: str
    first_name: str
    last_name: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Valida que la contraseña cumpla requisitos mínimos de seguridad."""
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class UserLogin(BaseModel):
    """Credenciales para iniciar sesión."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Campos editables de un usuario (todos opcionales)."""

    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class UserResponse(BaseModel):
    """Representación pública de un usuario (sin password)."""

    id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Token de acceso JWT devuelto tras registro/login."""

    access_token: str
    token_type: str = "bearer"


class UserAdminResponse(BaseModel):
    """Representación de un usuario para el panel de administración."""

    id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedUserResponse(BaseModel):
    """Respuesta paginada de usuarios para el listado admin."""

    items: list[UserAdminResponse]
    total: int
    page: int
    page_size: int
    pages: int


class UserRoleUpdate(BaseModel):
    """Datos para cambiar el rol de un usuario (uso admin)."""

    role: UserRole


class UserStatusUpdate(BaseModel):
    """Datos para activar/desactivar un usuario (uso admin)."""

    is_active: bool
