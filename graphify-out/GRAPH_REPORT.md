# Graph Report - e-commerce portfolio  (2026-07-08)

## Corpus Check
- 44 files · ~6,311 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 251 nodes · 377 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b2ee800`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `User` - 22 edges
2. `Base` - 18 edges
3. `UUIDPkMixin` - 16 edges
4. `Product` - 15 edges
5. `TimestampMixin` - 14 edges
6. `Order` - 14 edges
7. `OrderItem` - 14 edges
8. `UserRole` - 12 edges
9. `Coupon` - 10 edges
10. `CouponUsage` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Connection` --uses--> `Base`  [INFERRED]
  backend/alembic/env.py → backend/app/database.py
- `Address` --uses--> `Base`  [INFERRED]
  backend/app/models/address.py → backend/app/database.py
- `User` --uses--> `Base`  [INFERRED]
  backend/app/models/user.py → backend/app/database.py
- `get_current_user()` --calls--> `decode_token()`  [INFERRED]
  backend/app/dependencies/auth.py → backend/app/utils/security.py
- `AsyncSession` --uses--> `User`  [INFERRED]
  backend/app/dependencies/auth.py → backend/app/models/user.py

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.29
Nodes (6): Decisiones de arquitectura, Descripción, Estado actual, Fases planificadas, Stack tecnológico, TechStore — Contexto del proyecto

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (36): Base, Clase base declarativa para todos los modelos ORM., DeclarativeBase, CreatedAtMixin, Mixins comunes reutilizados por todos los modelos ORM.  Estos mixins NO redefine, Agrega una primary key `id` de tipo UUID con default `uuid4`., Agrega `created_at` y `updated_at` con manejo automático de fechas., Agrega solo `created_at`, para tablas de detalle/snapshot sin updated_at. (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): BaseModel, AddressCreate, AddressResponse, AddressUpdate, Schemas Pydantic de direcciones., BrandCreate, BrandResponse, BrandUpdate (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (27): Enum, OrderCreate, OrderItemResponse, OrderResponse, OrderUpdate, Schemas Pydantic de órdenes de compra y sus ítems., Datos mínimos para crear una orden a partir del carrito actual., Actualización administrativa del estado de una orden. (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (25): Any, AsyncSession, User, Cuenta de usuario: puede ser un cliente (CUSTOMER) o un administrador (ADMIN)., User, login(), Endpoints de autenticación: registro, login y usuario actual., Registra un nuevo usuario.      Valida que el email no esté ya registrado, hashe (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (20): do_run_migrations(), Configuración de entorno de Alembic para migraciones asíncronas., Run migrations in 'offline' mode.      This configures the context with just a U, Ejecuta las migraciones usando una conexión sincrónica (run_sync)., Crea un engine asíncrono y ejecuta las migraciones en modo 'online'., Run migrations in 'online' mode usando un engine asíncrono., run_async_migrations(), run_migrations_offline() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (13): get_db(), Configuración de la conexión asíncrona a la base de datos con SQLAlchemy 2.0., Dependency de FastAPI que provee una sesión de base de datos por request.      C, AsyncSession, Modelo de marca de productos., Modelo de ítem de carrito de compras., Modelo de categoría de productos, con soporte de jerarquía (self-referencial)., Modelo de imagen de producto (galería). (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (8): ASGIApp, RateLimiterMiddleware, Rate limiting middleware.  TODO (Fase 5): implementar rate limiting real (por ej, Placeholder de middleware de rate limiting (sin lógica todavía)., # TODO: implementar límite de requests por IP/usuario en Fase 5., Receive, Scope, Send

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (7): AsyncSession, User, get_current_admin(), get_current_user(), Dependencias de autenticación y autorización para los endpoints., Obtiene el usuario autenticado a partir del JWT enviado en el header Authorizati, Valida que el usuario autenticado tenga rol ADMIN.      Levanta HTTPException 40

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (3): Address, Modelo de dirección de envío/facturación de un usuario., Dirección de un usuario, utilizada para envíos.

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): health_check(), Endpoint de health check., Devuelve el estado de salud de la API.

## Knowledge Gaps
- **15 isolated node(s):** `AsyncSession`, `Request`, `RequestValidationError`, `JSONResponse`, `ASGIApp` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 4` to `Community 1`, `Community 3`, `Community 6`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Why does `UserRole` connect `Community 3` to `Community 8`, `Community 4`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `Base` connect `Community 1` to `Community 9`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `User` (e.g. with `AsyncSession` and `User`) actually correct?**
  _`User` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `Base` (e.g. with `Connection` and `Address`) actually correct?**
  _`Base` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `UUIDPkMixin` (e.g. with `Address` and `Brand`) actually correct?**
  _`UUIDPkMixin` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `Product` (e.g. with `Brand` and `CartItem`) actually correct?**
  _`Product` has 12 INFERRED edges - model-reasoned connections that need verification._