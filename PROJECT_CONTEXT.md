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
4. Panel de administración — DONE (4A + 4B)
5. Calidad y seguridad (rate limiting, seguridad avanzada) — próximo paso
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
- **Fixes post-Fase 3** (detectados construyendo el frontend, resueltos después de 3C):
  `ProductResponse` ahora incluye `images`, `variants`, `category` y `brand` anidados (antes sólo
  tenía campos escalares, aunque el service ya precargaba esas relaciones); el detalle público
  (`GET /products/{slug}`) filtra `variants` a sólo las activas. `WishlistItemResponse` ahora
  incluye `product: ProductListResponse` anidado (antes sólo `{id, user_id, product_id,
  created_at}`). Se extrajo `product_service.to_list_response()` como helper compartido (antes vivía
  duplicado como función privada del router de products) para armar ese `ProductListResponse` con
  `primary_image_url` calculado, reusado ahora también por el router de wishlist. De paso se corrigió
  un double-commit en `POST /wishlist` (mismo patrón que ya se había arreglado en el router de
  products al principio de la Fase 3A).

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
    envío), `WishlistPage`. Cierre con pasada de UX/accesibilidad: fixes de contraste AA, navegación
    por teclado (Escape en dropdowns), ARIA en tabs/botones-ícono, áreas táctiles 44×44px,
    scroll-to-top en cambio de ruta, `prefers-reduced-motion`, "vaciar carrito" y "eliminar reseña
    propia" agregados.
  - **Post-3C**: fix de dos gaps de datos del backend detectados durante la Fase 3 (ver Fase 2 más
    abajo) — `ProductResponse` y `WishlistItemResponse` ahora devuelven sus relaciones anidadas.
    `ProductPage` ya no necesita fallback a placeholder para galería/variantes y ya no resuelve la
    categoría del breadcrumb con un fetch aparte; `WishlistPage` ya no usa el workaround de
    `GET /products?page_size=100` — consume `item.product` directo de `GET /wishlist`.

### Rutas del frontend
`/` (Home), `/catalogo`, `/categoria/:slug`, `/producto/:slug`, `/carrito`, `/login`, `/registro`,
`/checkout` (protegida), `/checkout/exito`, `/perfil` (protegida), `/pedidos` (protegida),
`/pedidos/:id` (protegida), `/favoritos` (protegida), `*` → 404.

- **Fase 4 completada** (panel de administración), dividida en 2 partes:
  - **4A**: backend — `dashboard_service.py` (`GET /api/admin/dashboard`: resumen, ventas últimos 30
    días agrupadas por día, top 10 productos vendidos por cantidad, stock bajo, últimos 10 pedidos) y
    `user_service.py` (`GET/PUT /api/admin/users`: listado paginado con filtros, detalle, cambio de
    rol y activar/desactivar, ambos bloqueando auto-modificación del admin logueado). Ajuste a
    `GET /api/products` para exponer `include_inactive` (uso admin) y nuevo `GET /api/products/id/{id}`
    (detalle completo por id, incluye inactivos e imágenes/variantes, necesario porque el endpoint
    público sólo resuelve por slug y sólo activos). Frontend: layout admin independiente
    (`AdminLayout`/`AdminSidebar` responsive con drawer mobile/`AdminGuard` por rol), componentes
    reutilizables (`StatsCard`, `DataTable`, `FormModal`), `AdminDashboardPage` (gráfico de barras SVG
    hecho a mano, sin librerías de charts) y CRUD completo de productos (`AdminProductsPage` +
    `AdminProductFormPage` con gestión de imágenes y variantes).
  - **4B**: resto de las páginas admin, reutilizando los componentes de 4A: `AdminCategoriesPage`
    (árbol raíz+hijos aplanado con indentación), `AdminBrandsPage`, `AdminOrdersPage` (filtros por
    estado/pago/búsqueda por número de orden, modal de detalle con dirección/items/desglose, cambio
    de estado restringido a las transiciones válidas de `order_service.VALID_TRANSITIONS`),
    `AdminCouponsPage` (estado activo/expirado/inactivo calculado client-side), `AdminUsersPage`
    (cambio de rol y activar/desactivar, deshabilitado sobre el propio admin logueado). Ajustes de
    backend acompañando: `include_inactive` expuesto también en `GET /api/categories` y
    `GET /api/brands` (los services ya lo soportaban, sólo faltaba el query param del router); `OrderResponse`
    ahora incluye `customer_name`/`customer_email` (completados manualmente en el router desde
    `Order.user` precargado con `selectinload`, no son atributos directos del modelo) y
    `GET /api/orders/admin/all` acepta `search` (filtra por `order_number`). Cierre con una pasada de
    ui-ux-advisor que unificó inconsistencias entre las páginas construidas por agentes distintos en
    paralelo (colores de Badge para "inactivo", estilo de checkboxes custom, padding de selects,
    confirmación al cancelar un pedido, header fijo en el modal de detalle de pedido).

### Rutas del panel admin (`/admin`, layout propio con `AdminGuard`+`AdminLayout`)
`/admin` (Dashboard), `/admin/productos`, `/admin/productos/nuevo`, `/admin/productos/:id/editar`,
`/admin/categorias`, `/admin/marcas`, `/admin/pedidos`, `/admin/cupones`, `/admin/usuarios`.

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
