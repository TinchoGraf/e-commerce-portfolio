"""Punto de entrada de la aplicación FastAPI de TechStore."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, health

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="API backend de TechStore, un e-commerce de tecnología.",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Maneja errores de validación de request devolviendo un JSON claro y consistente."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Error de validación en los datos enviados",
            "errors": exc.errors(),
        },
    )


app.include_router(auth.router, prefix="/api/auth")
app.include_router(health.router, prefix="/api")
