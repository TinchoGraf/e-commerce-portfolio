"""Dependencias de autenticación y autorización para los endpoints."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.constants import UserRole
from app.utils.security import decode_token

# NOTA: el import de User se resuelve cuando el modelo exista (siguiente paso).
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Obtiene el usuario autenticado a partir del JWT enviado en el header Authorization.

    Levanta HTTPException 401 si el token es inválido, expiró, o el usuario no existe.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # NOTA: según PROJECT_CONTEXT.md los IDs de User son UUID (default=uuid4),
    # por eso no se castea user_id a int: se compara directamente el string del "sub".
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Valida que el usuario autenticado tenga rol ADMIN.

    Levanta HTTPException 403 si el usuario no es administrador.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permisos suficientes para realizar esta acción",
        )
    return current_user
