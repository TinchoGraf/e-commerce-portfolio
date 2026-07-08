# TechStore — Contexto del proyecto

## Descripción
E-commerce completo de productos de tecnología.

## Stack tecnológico
- Backend: Python / FastAPI
- Frontend: React / Vite / Tailwind
- Base de datos: PostgreSQL / SQLAlchemy 2.0 (async, mapped_column) / Alembic
- Auth: JWT (python-jose) + passlib bcrypt
- Pagos: MercadoPago (sandbox)
- Deploy: Docker

## Fases planificadas
1. **Cimientos** (EN CURSO): schema de BD completo, estructura FastAPI, auth JWT (register/login/me)
2. Endpoints core (productos, categorías, marcas, carrito)
3. Frontend (React/Vite/Tailwind)
4. Órdenes, checkout, cupones, reviews, wishlist
5. Pagos (MercadoPago), rate limiting, seguridad
6. Deploy (Docker, CI/CD)

## Estado actual
- **Fase 1 completada**: estructura de carpetas del backend FastAPI, 14 modelos SQLAlchemy 2.0
  (users, categories, brands, products, product_images, product_variants, addresses, cart_items,
  orders, order_items, reviews, wishlist_items, coupons, coupon_usage), schemas Pydantic base,
  auth JWT (register/login/me) y migración inicial de Alembic generados y validados.
- **Próximo paso: Fase 2** — endpoints core (productos, categorías, marcas, carrito).

## Decisiones de arquitectura
- SQLAlchemy 2.0 estilo moderno (`mapped_column`), no legacy `Column()`.
- Todos los IDs son UUID con `default=uuid4`.
- Async end-to-end en el backend: `asyncpg` + `AsyncSession`.
- Snapshots inmutables en `orders`/`order_items` (dirección de envío, precio y nombre del producto
  al momento de la compra) para no depender de cambios futuros en `products`/`addresses`.
- Cache desnormalizado de rating (`avg_rating`, `review_count`) en `products` para evitar
  agregaciones costosas en listados.
