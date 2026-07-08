"""Punto de entrada de la aplicación FastAPI de TechStore."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import (
    addresses,
    auth,
    brands,
    cart,
    categories,
    coupons,
    health,
    orders,
    payments,
    products,
    reviews,
    wishlist,
)

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
app.include_router(products.router, prefix="/api/products")
app.include_router(categories.router, prefix="/api/categories")
app.include_router(brands.router, prefix="/api/brands")
app.include_router(cart.router, prefix="/api/cart")
app.include_router(wishlist.router, prefix="/api/wishlist")
app.include_router(reviews.router, prefix="/api/reviews")
app.include_router(coupons.router, prefix="/api/coupons")
app.include_router(addresses.router, prefix="/api/addresses")
app.include_router(orders.router, prefix="/api/orders")
app.include_router(payments.router, prefix="/api/payments")
