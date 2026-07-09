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
3. Frontend (React/Vite/Tailwind) — DONE (3A + 3B + 3C)
4. Panel de administración
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

- **Fase 3 completada** (React 19 / Vite / Tailwind v4), dividida en 3 partes:
  - **3A**: setup del proyecto (Vite+React+Tailwind v4, react-router-dom, axios, zustand, lucide-react,
    clsx), capa de API (`src/api/`: 11 módulos por recurso + `client.js` con interceptor JWT), stores
    Zustand (`authStore`, `cartStore` con soporte local/backend dual, `toastStore`), componentes UI
    base (`Button`, `Input`, `Badge`, `Spinner`, `EmptyState`, `StarRating`, `Pagination`, `Toast`),
    `ProductCard`/`ProductGrid`, `ProtectedRoute`, layout (`Header` sticky + `Footer` + `Layout`),
    `HomePage` (hero, categorías, destacados, banner promo, nuevos) y `NotFoundPage`. Paleta propia
    (neutro cálido + acento violeta/índigo + acento secundario coral/naranja) y tipografía Space
    Grotesk (headings) + Inter (body), configuradas en el `@theme` de `src/index.css` (Tailwind v4
    CSS-first, sin `tailwind.config.js`).
  - **3B**: páginas core — `CatalogPage` (filtros por URL con `useSearchParams`, sidebar de
    categorías/marcas/precio, orden, paginación), `ProductPage` (galería, selector de variantes,
    reviews, wishlist toggle), `CartPage` (debounce + optimistic update de cantidad, cupón, resumen),
    `LoginPage`/`RegisterPage` con merge de carrito local→backend al autenticar. Componentes nuevos:
    `ProductGallery`, `VariantSelector`, `ReviewList`/`ReviewForm`, `CartItem`/`CartSummary`,
    `LoginForm`/`RegisterForm`.
  - **3C**: páginas secundarias — checkout multi-step (`AddressStep`/`ReviewStep`/`PaymentStep` vía
    `CheckoutPage`, con `CheckoutSuccessPage` post-pago), `ProfilePage` (datos de cuenta + gestión de
    direcciones), `OrdersPage`/`OrderDetailPage` (historial y detalle con snapshot de dirección de
    envío), `WishlistPage` (con workaround client-side por el gap de `WishlistItemResponse`, ver
    abajo). Cierre con pasada de UX/accesibilidad: fixes de contraste AA, navegación por teclado
    (Escape en dropdowns), ARIA en tabs/botones-ícono, áreas táctiles 44×44px, scroll-to-top en
    cambio de ruta, `prefers-reduced-motion`, "vaciar carrito" y "eliminar reseña propia" agregados.

### Rutas del frontend
`/` (Home), `/catalogo`, `/categoria/:slug`, `/producto/:slug`, `/carrito`, `/login`, `/registro`,
`/checkout` (protegida), `/checkout/exito`, `/perfil` (protegida), `/pedidos` (protegida),
`/pedidos/:id` (protegida), `/favoritos` (protegida), `*` → 404.

### Gaps de datos conocidos en el backend (pendientes, no bloquean Fase 3)
Encontrados durante la Fase 3 — el service ya precarga las relaciones ORM necesarias, pero el schema
Pydantic de respuesta no las expone, así que el frontend no puede mostrarlas aunque existan en la DB:
- `ProductResponse` (`app/schemas/product.py`) no expone `images`, `variants`, `category`, `brand`
  anidados → `ProductPage` no puede renderizar galería real ni selector de variantes.
- `WishlistItemResponse` (`app/schemas/wishlist.py`) solo expone `{id, user_id, product_id,
  created_at}`, sin datos del producto → `WishlistPage` resuelve con un workaround (`GET
  /products?page_size=100` y cruce por id en el cliente), que no escala más allá de un catálogo
  chico. Tampoco existe `GET /products/{id}` (solo por `slug`).
- Ambos quedaron pendientes de decisión del usuario para una futura fase de fixes de backend.

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
