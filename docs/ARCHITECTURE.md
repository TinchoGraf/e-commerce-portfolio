# Arquitectura — TechStore

Este documento describe la arquitectura backend en capas, las decisiones
técnicas tomadas durante el desarrollo y la estructura de carpetas completa
del proyecto.

## Índice

- [Diagrama de capas](#diagrama-de-capas)
- [Responsabilidad de cada capa](#responsabilidad-de-cada-capa)
- [Decisiones técnicas](#decisiones-técnicas)
- [Estructura de carpetas](#estructura-de-carpetas)

---

## Diagrama de capas

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                        │
│  Pages → Components → API modules (axios) → stores (Zustand)      │
└───────────────────────────────┬────────────────────────────────────┘
                                │  HTTP / JSON
                                │  Authorization: Bearer <JWT>
┌───────────────────────────────▼────────────────────────────────────┐
│                          Middlewares                               │
│  RateLimiterMiddleware · SecurityHeadersMiddleware · CORS           │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                   Routers (app/routers/)                          │
│  Reciben la request HTTP, validan con Pydantic (schemas),          │
│  resuelven dependencias (auth), llaman a un service y devuelven    │
│  la respuesta ya mapeada a un schema de salida.                    │
│  NO contienen SQL ni reglas de negocio.                            │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                   Services (app/services/)                        │
│  Lógica de negocio: validaciones, cálculos, transacciones,          │
│  queries SQLAlchemy contra los models.                              │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                   Models (app/models/)                            │
│  SQLAlchemy 2.0 (async, `mapped_column`). 14 modelos.               │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                       PostgreSQL 16                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Responsabilidad de cada capa

### Routers (`app/routers/`)

**Qué hacen:** reciben la request HTTP, dejan que Pydantic valide el body
(schemas de `app/schemas/`), resuelven dependencias vía `Depends` (por
ejemplo `get_current_user`, `get_current_admin`, `get_db`), llaman a la
función correspondiente del service y devuelven la respuesta mapeada al
schema de salida declarado en `response_model`.

**Qué NO deben hacer:** no contienen sentencias SQL/SQLAlchemy directas, no
implementan reglas de negocio (cálculo de totales, validaciones de stock,
transiciones de estado de pedidos, etc.) ni manejan transacciones de base de
datos más allá de lo que ya resuelve el service. Si un router empieza a
acumular lógica de negocio, esa lógica debería moverse al service
correspondiente.

### Services (`app/services/`)

**Qué hacen:** contienen toda la lógica de negocio del dominio: cálculo de
subtotales/descuentos, validación de stock, aplicación de cupones, manejo de
transiciones de estado de órdenes, generación de snapshots inmutables,
consultas y agregaciones SQLAlchemy, y el manejo de transacciones (commit/
rollback) cuando una operación involucra múltiples pasos (por ejemplo, crear
una orden implica descontar stock, calcular totales y persistir los ítems en
una sola transacción).

**Qué NO deben hacer:** no conocen detalles del protocolo HTTP (status
codes, headers) más allá de levantar `HTTPException` cuando corresponde; no
dependen del framework de routing.

### Models (`app/models/`)

**Qué hacen:** definen el esquema de la base de datos usando SQLAlchemy 2.0
(`mapped_column`, tipado moderno) y las relaciones entre las 14 entidades del
dominio (users, categories, brands, products, product_images,
product_variants, addresses, cart_items, orders, order_items, reviews,
wishlist_items, coupons, coupon_usage).

**Qué NO deben hacer:** no contienen lógica de negocio; son la
representación de la estructura de datos, no de comportamiento.

---

## Decisiones técnicas

### 1. Snapshots inmutables en órdenes

`orders` y `order_items` guardan una copia congelada (snapshot) de la
dirección de envío, el precio y el nombre del producto en el momento exacto
de la compra, en vez de referenciar únicamente los IDs de `products` y
`addresses`.

**Por qué:** sin este snapshot, si un administrador edita el precio de un
producto meses después de una venta, el historial de esa orden mostraría el
precio nuevo en vez del precio real que pagó el cliente — rompiendo la
integridad contable e histórica de los pedidos. Lo mismo aplica si un
usuario edita o borra una dirección: la orden debe seguir mostrando la
dirección exacta a la que se envió ese pedido, incluso si esa dirección ya
no existe en `addresses`. El snapshot desacopla el historial de compras de
cualquier cambio futuro en los datos "vivos".

### 2. Soft delete

Los modelos `products`, `categories`, `brands`, `product_variants` y
`coupons` usan un flag `is_active` en vez de eliminar filas físicamente
(`DELETE`). El hard delete se reserva para `product_images` y para
operaciones explícitas iniciadas directamente por el usuario sobre sus
propios datos transitorios: ítems de carrito, direcciones y ítems de
wishlist.

**Por qué:** productos, categorías, marcas, variantes y cupones suelen estar
referenciados por `order_items` u otras entidades históricas. Si se
borraran físicamente, cualquier orden pasada que los referencie quedaría con
una foreign key rota o requeriría lógica adicional para tolerar
referencias nulas. Marcarlos como inactivos permite "darlos de baja" del
catálogo público sin perder la trazabilidad de pedidos históricos que los
mencionan. Las imágenes de producto y los datos transitorios del usuario
(carrito, direcciones, wishlist), en cambio, no tienen ese requisito de
historial y se eliminan directamente.

### 3. Rating cacheado

`products.avg_rating` y `products.review_count` son campos desnormalizados
que se recalculan cada vez que se crea, edita o borra una reseña, en vez de
calcularse "al vuelo" con un `AVG`/`COUNT` sobre la tabla `reviews` en cada
request.

**Por qué:** el listado del catálogo se consulta constantemente (cada visita
a `/catalogo`, cada filtro, cada página). Calcular `AVG(rating)` y
`COUNT(*)` agrupando por producto en cada una de esas consultas sería una
agregación cara que escala mal con el volumen de reseñas. Cachear el
resultado en la fila del producto convierte esa lectura en un simple
`SELECT` sin joins ni agregaciones adicionales, a costa de un recálculo
puntual (barato) cada vez que cambia una reseña.

### 4. Two-tier rate limiting

Middleware propio (`RateLimiterMiddleware`) que implementa una ventana
deslizante en memoria por dirección IP, con dos niveles: 100 requests/minuto
para el tráfico general de la API y 10 requests/minuto específicamente para
los endpoints de autenticación (`/api/auth/login`, `/api/auth/register`).

**Por qué:** los endpoints de autenticación son el objetivo típico de
ataques de fuerza bruta (probar contraseñas o crear cuentas masivamente). Un
límite más estricto en esa superficie reduce el riesgo sin afectar la
experiencia normal de navegación del catálogo, que puede requerir más
requests por minuto (paginación, filtros). Implementarlo en memoria (sin
Redis ni un servicio externo) mantiene el proyecto simple de levantar y
desplegar, a costa de que el límite es por instancia del proceso (aceptable
para el alcance de este proyecto).

### 5. Modo mock de pagos

`payment_service` verifica si `MERCADOPAGO_ACCESS_TOKEN` está configurado.
Si no lo está, en vez de fallar o requerir credenciales de MercadoPago,
expone un endpoint mock (`POST /api/payments/mock-checkout/{order_id}`) que
aprueba el pago directamente.

**Por qué:** este es un proyecto de portfolio. Requerir que cualquiera que
quiera probarlo tenga que crear una cuenta de MercadoPago y configurar
credenciales de sandbox sería una barrera de entrada innecesaria para
demostrar el flujo de checkout completo (carrito → dirección → orden →
pago → confirmación). El modo mock permite que el proyecto funcione
"out of the box" con `docker compose up`, y a la vez la integración real con
MercadoPago sigue disponible y funcional apenas se configura el token.

### 6. Arquitectura en capas

Separación estricta routers → services → models (ver diagrama arriba).

**Por qué:** mantener los routers "delgados" (sin SQL ni reglas de negocio)
hace que la lógica de negocio sea testeable de forma aislada (los tests
pueden invocar servicios directamente sin pasar por HTTP), evita duplicar
validaciones cuando un mismo flujo se dispara desde múltiples endpoints, y
facilita razonar sobre dónde vive cada responsabilidad al leer el código.

### 7. JWT + bcrypt, UUIDs y headers de seguridad

Autenticación stateless con JWT (`python-jose`) y contraseñas hasheadas con
bcrypt (`passlib`). Todos los modelos usan UUID como clave primaria en vez de
enteros autoincrementales. `SecurityHeadersMiddleware` agrega headers HTTP
de seguridad (`X-Frame-Options`, `Strict-Transport-Security`, entre otros)
a todas las respuestas.

**Por qué:** JWT evita mantener estado de sesión en el servidor. Los UUID
como clave primaria evitan que un atacante pueda enumerar recursos
secuencialmente (`/api/products/1`, `/api/products/2`, ...) y facilitan
generar IDs desde el cliente o en sistemas distribuidos sin colisiones. Los
headers de seguridad son una capa adicional de defensa contra ataques
comunes (clickjacking, downgrade a HTTP) con costo de implementación
mínimo.

---

## Estructura de carpetas

### Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py          # FastAPI app, middlewares, registro de routers
│   ├── config.py        # Settings (pydantic-settings, lee .env)
│   ├── database.py       # engine async, AsyncSessionLocal, Base
│   ├── models/            # 14 modelos SQLAlchemy 2.0
│   ├── schemas/            # Pydantic schemas (request/response)
│   ├── services/           # lógica de negocio (12 servicios)
│   ├── routers/            # endpoints HTTP (14 routers)
│   ├── middleware/          # rate_limiter, security_headers
│   ├── dependencies/         # auth (get_current_user, get_current_admin)
│   └── utils/               # security (hash/JWT), slug, constants, order_number
├── scripts/
│   └── seed.py            # carga datos de ejemplo (categorías, marcas, productos, cupones, admin)
├── alembic/               # migraciones de base de datos
├── tests/                 # 81 tests con pytest (SQLite in-memory)
├── requirements.txt        # dependencias de producción
├── requirements-dev.txt     # + pytest, pytest-asyncio, aiosqlite
├── Dockerfile
└── .env.example
```

Los 14 modelos: `users`, `categories` (auto-referencial, árbol),
`brands`, `products`, `product_images`, `product_variants`, `addresses`,
`cart_items`, `orders`, `order_items`, `reviews`, `wishlist_items`,
`coupons`, `coupon_usage`.

Los 14 routers registrados en `app/main.py` (todos bajo prefijo `/api`):
`auth`, `health`, `products`, `categories`, `brands`, `cart`, `wishlist`,
`reviews`, `coupons`, `addresses`, `orders`, `payments`, `dashboard`
(`/api/admin/dashboard`), `users` (`/api/admin/users`).

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── api/          # 13 módulos, uno por recurso (axios + interceptor JWT en client.js)
│   ├── components/     # ui/, product/, cart/, checkout/, auth/, layout/, admin/
│   ├── pages/          # páginas públicas + pages/admin/ (lazy-loaded)
│   ├── stores/          # Zustand: authStore, cartStore, toastStore
│   ├── hooks/           # useDocumentTitle
│   └── utils/           # formatters, validators, orderStatus
├── public/
├── Dockerfile           # multi-stage: build con Node, sirve con Nginx
└── nginx.conf
```

Rutas públicas: `/`, `/catalogo`, `/categoria/:slug`, `/producto/:slug`,
`/carrito`, `/login`, `/registro`, `/checkout` (protegida),
`/checkout/exito`, `/perfil` (protegida), `/pedidos` (protegida),
`/pedidos/:id` (protegida), `/favoritos` (protegida), `*` → 404.

Rutas del panel admin (`/admin`, lazy-loaded con `React.lazy` + `Suspense`):
`/admin` (Dashboard), `/admin/productos`, `/admin/productos/nuevo`,
`/admin/productos/:id/editar`, `/admin/categorias`, `/admin/marcas`,
`/admin/pedidos`, `/admin/cupones`, `/admin/usuarios`.
