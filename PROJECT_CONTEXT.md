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
1. Cimientos: schema de BD completo, estructura FastAPI, auth JWT (register/login/me) — DONE
2. Core del negocio (productos, categorías, marcas, carrito, checkout, pagos) — DONE
3. Frontend (React/Vite/Tailwind)
4. Órdenes, checkout, cupones, reviews, wishlist (nota: gran parte ya se adelantó en Fase 2)
5. Rate limiting, seguridad avanzada
6. Deploy (Docker, CI/CD)

## Estado actual
- **Fase 1 completada**: estructura de carpetas del backend FastAPI, 14 modelos SQLAlchemy 2.0
  (users, categories, brands, products, product_images, product_variants, addresses, cart_items,
  orders, order_items, reviews, wishlist_items, coupons, coupon_usage), schemas Pydantic base,
  auth JWT (register/login/me) y migración inicial de Alembic.
- **Fase 2 completada**: capa de servicios completa (`app/services/`: product, category, brand,
  cart, wishlist, review, coupon, address, order, payment) y 12 routers registrados en `main.py`
  (55 endpoints en total). Fixes aplicados de Fase 1: validación de password en `UserCreate`,
  índice parcial en `cart_items` para evitar duplicados con `variant_id IS NULL`, `graphify-out/`
  excluido del repo.

### Endpoints implementados (prefix `/api`)
- `auth`: register, login, me
- `products`: listado con filtros/paginación, detalle por slug, CRUD admin, imágenes, variantes
- `categories`: árbol de categorías, CRUD admin
- `brands`: listado, detalle, CRUD admin
- `cart`: ver resumen, agregar/actualizar/quitar ítem, vaciar
- `wishlist`: ver, agregar, quitar
- `reviews`: listar por producto (paginado), crear, editar, borrar
- `coupons`: validar contra subtotal, CRUD admin
- `addresses`: CRUD del usuario autenticado
- `orders`: checkout (crear orden), listar propias, detalle, admin (listar todas / cambiar estado)
- `payments`: crear preferencia de pago (MercadoPago o mock si no hay token), webhook, mock-checkout

### Flujo de checkout (`order_service.create_order`)
Transacción única (un solo `commit`, rollback ante cualquier error): valida carrito no vacío →
valida dirección de envío (ownership) → por cada ítem valida producto/variante activos y stock
suficiente, calcula `unit_price` = precio + ajuste de variante → si hay cupón, lo valida y calcula
descuento → `shipping_cost` hardcodeado (gratis sobre $50000, sino $5000) → genera `order_number`
secuencial del día (`TS-YYYYMMDD-XXXX`) → crea la orden y sus items → descuenta stock → registra
uso de cupón → vacía el carrito → commit. `cart_service.clear_cart` y
`coupon_service.record_coupon_usage` solo hacen `flush` (no `commit` propio) para no romper la
atomicidad de este flujo — si algún otro código llama a esas funciones de forma standalone, el
caller es responsable de comitear.

Pagos: si `MERCADOPAGO_ACCESS_TOKEN` no está seteado, `payment_service` cae a un modo mock
(`/api/payments/mock-checkout/{order_id}`) que aprueba el pago sin depender de credenciales reales,
para que el checkout completo se pueda demostrar en el portfolio.

- **Próximo paso: Fase 3** — Frontend (React/Vite/Tailwind).

## Decisiones de arquitectura
- SQLAlchemy 2.0 estilo moderno (`mapped_column`), no legacy `Column()`.
- Todos los IDs son UUID con `default=uuid4`.
- Async end-to-end en el backend: `asyncpg` + `AsyncSession`.
- Snapshots inmutables en `orders`/`order_items` (dirección de envío, precio y nombre del producto
  al momento de la compra) para no depender de cambios futuros en `products`/`addresses`.
- Cache desnormalizado de rating (`avg_rating`, `review_count`) en `products` para evitar
  agregaciones costosas en listados.
- Arquitectura en capas: routers (HTTP) → services (lógica de negocio + queries) → models. Los
  routers no contienen SQLAlchemy ni reglas de negocio.
- Soft delete (`is_active=False`) para products, categories, brands, variants y coupons; hard
  delete solo para product_images y para operaciones explícitas del usuario (cart items, addresses,
  wishlist items).
