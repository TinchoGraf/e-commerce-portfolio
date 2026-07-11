# TechStore

### E-commerce completo de productos de tecnología

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

TechStore es un e-commerce full-stack de productos de tecnología con catálogo,
carrito, checkout con pagos, autenticación y un panel de administración completo.
Proyecto de portfolio pensado para demostrar una arquitectura backend en capas,
un frontend React moderno y buenas prácticas de seguridad, testing y
containerización.

---

## Vista previa

> Para generar las capturas: levantá el proyecto con Docker (ver sección de
> instalación), cargá el seed de datos y tomá screenshots de las pantallas
> principales guardándolas en `docs/screenshots/`.

| | |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Catálogo](docs/screenshots/catalogo.png) |
| ![Producto](docs/screenshots/producto.png) | ![Checkout](docs/screenshots/checkout.png) |
| ![Admin Dashboard](docs/screenshots/admin-dashboard.png) | |

---

## Stack tecnológico

**Backend**
- Python 3.12 + FastAPI
- SQLAlchemy 2.0 (async, `mapped_column`) + asyncpg
- Alembic (migraciones)
- Autenticación JWT (`python-jose`) + `passlib` (bcrypt)
- Pydantic v2 + `pydantic-settings`

**Frontend**
- React 19 + Vite
- Tailwind CSS v4 (CSS-first, sin `tailwind.config.js`)
- Zustand (estado global)
- React Router v7
- Axios + lucide-react

**Base de datos e infraestructura**
- PostgreSQL 16
- Docker + Docker Compose
- Nginx (build multi-stage para servir el frontend)

**Pagos**
- MercadoPago (sandbox), con modo mock integrado: si no hay
  `MERCADOPAGO_ACCESS_TOKEN` configurado, el checkout aprueba el pago
  automáticamente vía `/api/payments/mock-checkout/{order_id}`.

**Testing**
- pytest + pytest-asyncio + aiosqlite — 81 tests, corren contra SQLite en
  memoria (no requieren PostgreSQL levantado).

---

## Funcionalidades

### Tienda pública
- Catálogo con filtros (categoría, marca, precio, búsqueda) y paginación
- Página de producto con galería de imágenes y selector de variantes
  (color / almacenamiento / tamaño)
- Carrito persistente (local + backend, con merge automático al loguearse)
- Checkout multi-paso: dirección → revisión → pago (MercadoPago o mock)
- Autenticación JWT (registro, login, perfil)
- Gestión de direcciones de envío
- Historial de pedidos con detalle y snapshot de la dirección usada
- Reseñas de productos con calificación (1-5 estrellas)
- Lista de favoritos (wishlist)
- Cupones de descuento aplicables en el carrito

### Panel de administración (`/admin`)
- Dashboard con métricas: ventas de los últimos 30 días (gráfico de barras
  SVG), top 10 productos más vendidos, alertas de stock bajo, últimos pedidos
- Gestión de productos: CRUD completo con imágenes y variantes
- Gestión de categorías (árbol con subcategorías) y marcas
- Gestión de pedidos: cambio de estado con transiciones válidas, filtros y
  búsqueda
- Gestión de cupones
- Gestión de usuarios: cambio de rol, activar/desactivar

---

## Instalación rápida con Docker

```bash
# 1. Clonar el repositorio
git clone https://github.com/TinchoGraf/e-commerce-portfolio.git
cd e-commerce-portfolio

# 2. Crear el archivo de configuración
cp backend/.env.example backend/.env

# 3. Levantar todo con Docker
docker compose up --build

# 4. (En otra terminal) Cargar datos de ejemplo
docker compose exec backend python -m scripts.seed

# 5. Abrir en el navegador
# Tienda: http://localhost:3000
# API:    http://localhost:8000/docs
```

`docker compose up` levanta 3 servicios: `db` (PostgreSQL 16), `backend`
(FastAPI en el puerto 8000) y `frontend` (Nginx en el puerto 3000). El backend
corre `alembic upgrade head` automáticamente antes de arrancar `uvicorn`.

**Credenciales de admin (creadas por el seed):**

```
Email:    admin@techstore.com
Password: Admin123!
```

> Estas credenciales son solo para desarrollo/demo. No usar en producción.

Para desarrollo con hot-reload, renombrá
`docker-compose.override.yml.example` a `docker-compose.override.yml` antes
de levantar los contenedores.

---

## Instalación manual (sin Docker)

### Requisitos previos
- Python >= 3.12
- Node.js >= 18
- PostgreSQL >= 16

### Backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # Linux / macOS

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env y ajustar DATABASE_URL para apuntar a tu PostgreSQL local

# Aplicar migraciones
alembic upgrade head

# Cargar datos de ejemplo (opcional)
python -m scripts.seed

# Levantar el servidor en modo desarrollo
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000` y la documentación
interactiva en `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

---

## Testing

```bash
cd backend

pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

Los 81 tests corren contra **SQLite en memoria** (vía `aiosqlite`), por lo
que no requieren tener PostgreSQL levantado para ejecutarse.

---

## Arquitectura del proyecto

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend (React 19 + Vite)                    │
│   Zustand (estado) · React Router v7 · Tailwind CSS v4        │
└───────────────────────────┬───────────────────────────────────┘
                            │ HTTP / JSON (axios + JWT)
┌───────────────────────────▼───────────────────────────────────┐
│                    API (FastAPI) — routers                    │
│   JWT Auth · Rate Limiting (100 req/min, 10/min en auth)       │
│   Security Headers (X-Frame-Options, HSTS, etc.)               │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                          Services                              │
│         Lógica de negocio + queries SQLAlchemy                │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Models (SQLAlchemy 2.0 async)                │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                       PostgreSQL 16                             │
└─────────────────────────────────────────────────────────────────┘
```

Ver `docs/ARCHITECTURE.md` para el detalle completo de cada capa y las
decisiones técnicas.

**Backend** (`backend/`): `app/models/` (14 modelos), `app/schemas/`
(Pydantic), `app/services/` (12 servicios con la lógica de negocio),
`app/routers/` (14 routers HTTP), `app/middleware/` (rate limiter, security
headers), `app/dependencies/` (auth), `app/utils/` (seguridad, slugs,
constantes). Migraciones en `alembic/`, tests en `tests/`, seed en
`scripts/seed.py`.

**Frontend** (`frontend/`): `src/api/` (13 módulos, uno por recurso),
`src/components/` (ui, product, cart, checkout, auth, layout, admin),
`src/pages/` (páginas públicas + `pages/admin/` lazy-loaded), `src/stores/`
(Zustand: auth, cart, toast), `src/hooks/`, `src/utils/`.

---

## API Endpoints

Referencia rápida de los endpoints más representativos. La documentación
completa e interactiva (Swagger/OpenAPI) de los 65+ endpoints está disponible
en `http://localhost:8000/docs` una vez levantado el backend.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar un nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión y obtener JWT |
| GET | `/api/auth/me` | Datos del usuario autenticado |
| GET | `/api/products` | Listado de productos con filtros y paginación |
| GET | `/api/products/{slug}` | Detalle de producto por slug |
| GET | `/api/categories` | Árbol de categorías |
| GET | `/api/cart` | Resumen del carrito |
| POST | `/api/cart/items` | Agregar ítem al carrito |
| GET | `/api/wishlist` | Lista de favoritos |
| POST | `/api/reviews` | Crear reseña de un producto |
| POST | `/api/coupons/validate` | Validar cupón contra el subtotal |
| POST | `/api/orders` | Crear orden (checkout) |
| GET | `/api/orders` | Listar pedidos propios |
| POST | `/api/payments/{order_id}/create` | Crear preferencia de pago (MercadoPago o mock) |
| GET | `/api/admin/dashboard` | Métricas del dashboard admin |

Ver detalle completo en [`docs/API.md`](docs/API.md).

---

## Decisiones técnicas

- **Snapshots inmutables en órdenes**: `orders`/`order_items` guardan una
  copia congelada de la dirección de envío, el precio y el nombre del
  producto al momento de la compra, para que cambios futuros en
  `products`/`addresses` no afecten pedidos ya realizados.
- **Soft delete**: `is_active=False` para products, categories, brands,
  variants y coupons, preservando la integridad histórica de datos ya
  referenciados en órdenes; hard delete solo para `product_images` y
  operaciones explícitas del usuario (ítems del carrito, direcciones,
  favoritos).
- **Rating cacheado**: `avg_rating`/`review_count` desnormalizados en
  `products` para evitar agregaciones costosas (`AVG`/`COUNT` sobre reviews)
  en cada listado del catálogo.
- **Two-tier rate limiting**: middleware propio con ventana deslizante en
  memoria por IP — 100 req/min general y 10 req/min en endpoints de auth
  (login/register), para mitigar fuerza bruta sin depender de
  infraestructura externa (Redis, etc.).
- **Modo mock de pagos**: si `MERCADOPAGO_ACCESS_TOKEN` no está configurado,
  el servicio de pagos cae automáticamente a un endpoint mock que aprueba el
  pago sin credenciales reales, permitiendo demostrar el flujo completo de
  checkout en el portfolio.
- **Arquitectura en capas**: routers (HTTP, sin SQL) → services (lógica de
  negocio + queries) → models. Los routers no contienen SQLAlchemy directo
  ni reglas de negocio.
- **JWT + bcrypt**, IDs UUID en todos los modelos, headers de seguridad HTTP
  (X-Frame-Options, HSTS, etc.).

Ver el detalle completo del razonamiento en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Próximos pasos

- Upload real de imágenes (actualmente solo se aceptan URLs)
- Emails transaccionales (confirmación de pedido, cambio de estado)
- Búsqueda full-text con `pg_trgm` (evaluado en Fase 5, no agregado: un
  B-tree no acelera `LIKE '%term%'` con wildcard inicial y la extensión no
  está habilitada)
- CI/CD con GitHub Actions
- Deploy a producción (Railway, Fly.io, AWS)
- Locking de stock (`SELECT FOR UPDATE`) en el checkout para eliminar un
  riesgo teórico de overselling bajo checkouts concurrentes (recomendación
  abierta de la auditoría de seguridad de Fase 5)

---

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [`LICENSE`](LICENSE)
para más detalles.

## Autor

**TinchoGraf** — [github.com/TinchoGraf](https://github.com/TinchoGraf)
