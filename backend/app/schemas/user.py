"""Schemas Pydantic de usuario y autenticación."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.utils.constants import UserRole


class UserCreate(BaseModel):
    """Datos requeridos para registrar un nuevo usuario."""

    email: EmailStr
    password: str
    first_name: str
    last_name: str


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
