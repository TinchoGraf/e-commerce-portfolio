# API — TechStore

Documentación de referencia de la API REST de TechStore. Todos los endpoints
están agrupados bajo el prefijo `/api`.

> La documentación interactiva completa (Swagger/OpenAPI), generada
> automáticamente por FastAPI con el detalle de los 65+ endpoints, request/
> response schemas y la posibilidad de probarlos en vivo, está disponible en
> `http://localhost:8000/docs` con el backend levantado. Este documento cubre
> los flujos y endpoints principales para tener una referencia rápida sin
> necesidad de levantar el servidor.

## Índice

- [Autenticación](#autenticación)
- [Endpoints por recurso](#endpoints-por-recurso)
- [Flujo de checkout](#flujo-de-checkout)
- [Códigos de error comunes](#códigos-de-error-comunes)

---

## Autenticación

TechStore usa autenticación basada en **JWT** (JSON Web Tokens).

### 1. Registrarse

```
POST /api/auth/register
```

**Request body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula
y un número.

**Respuesta exitosa (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Iniciar sesión

```
POST /api/auth/login
```

**Request body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. Usar el token

Todas las rutas protegidas requieren el header `Authorization` con el
esquema `Bearer`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

El token expira según `ACCESS_TOKEN_EXPIRE_MINUTES` (por defecto **60
minutos**, configurable vía variable de entorno). Al expirar, el usuario debe
volver a autenticarse con `/api/auth/login`.

### 4. Obtener el usuario actual

```
GET /api/auth/me
```

Requiere token válido. Devuelve los datos del usuario autenticado
(`id`, `email`, `first_name`, `last_name`, `phone`, `role`, `is_active`,
`created_at`).

### Roles

Existen dos roles: `customer` (por defecto) y `admin`. Los endpoints bajo
`/api/admin/*` y las operaciones de CRUD administrativas (crear/editar/borrar
productos, categorías, marcas, cupones, cambiar estado de pedidos, gestionar
usuarios) requieren rol `admin`.

---

## Endpoints por recurso

### Auth (`/api/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registrar un nuevo usuario | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Datos del usuario autenticado | Sí |

### Health (`/api`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Chequeo de estado de la API | No |

### Products (`/api/products`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/products` | Listado con filtros, búsqueda y paginación | No |
| GET | `/api/products/{slug}` | Detalle de producto por slug (catálogo público) | No |
| GET | `/api/products/id/{product_id}` | Detalle de producto por id (uso admin) | Admin |
| POST | `/api/products` | Crear producto | Admin |
| PUT | `/api/products/{product_id}` | Editar producto | Admin |
| DELETE | `/api/products/{product_id}` | Dar de baja (soft delete) | Admin |
| POST | `/api/products/{product_id}/images` | Agregar imagen | Admin |
| DELETE | `/api/products/{product_id}/images/{image_id}` | Eliminar imagen | Admin |
| POST | `/api/products/{product_id}/variants` | Agregar variante | Admin |
| PUT | `/api/products/{product_id}/variants/{variant_id}` | Editar variante | Admin |
| DELETE | `/api/products/{product_id}/variants/{variant_id}` | Eliminar variante | Admin |

**Ejemplo — listado con filtros:**

```
GET /api/products?category_id=<uuid>&brand_id=<uuid>&min_price=10000&max_price=100000&search=auricular&sort_by=price&sort_order=asc&page=1&page_size=20
```

Parámetros disponibles: `category_id`, `brand_id`, `search`, `min_price`,
`max_price`, `is_featured`, `include_inactive` (solo admin), `sort_by`,
`sort_order`, `page`, `page_size` (máx. 100).

**Respuesta (200):**
```json
{
  "items": [
    {
      "id": "3f1c...",
      "name": "Auriculares Sony WH-1000XM5",
      "slug": "auriculares-sony-wh-1000xm5",
      "price": "189999.00",
      "compare_at_price": "219999.00",
      "avg_rating": 4.5,
      "review_count": 12,
      "stock": 8,
      "is_featured": true,
      "images": [{ "url": "https://placehold.co/...", "is_primary": true }]
    }
  ],
  "total": 20,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

### Categories (`/api/categories`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/categories` | Árbol de categorías (con subcategorías) | No |
| POST | `/api/categories` | Crear categoría | Admin |
| PUT | `/api/categories/{category_id}` | Editar categoría | Admin |
| DELETE | `/api/categories/{category_id}` | Dar de baja (soft delete) | Admin |

### Brands (`/api/brands`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/brands` | Listado de marcas | No |
| GET | `/api/brands/{brand_id}` | Detalle de marca | No |
| POST | `/api/brands` | Crear marca | Admin |
| PUT | `/api/brands/{brand_id}` | Editar marca | Admin |
| DELETE | `/api/brands/{brand_id}` | Dar de baja (soft delete) | Admin |

### Cart (`/api/cart`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/cart` | Ver resumen del carrito | Sí |
| POST | `/api/cart/items` | Agregar ítem | Sí |
| PUT | `/api/cart/items/{item_id}` | Actualizar cantidad | Sí |
| DELETE | `/api/cart/items/{item_id}` | Quitar ítem | Sí |
| DELETE | `/api/cart` | Vaciar carrito | Sí |

### Wishlist (`/api/wishlist`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/wishlist` | Ver favoritos | Sí |
| POST | `/api/wishlist` | Agregar producto | Sí |
| DELETE | `/api/wishlist/{item_id}` | Quitar producto | Sí |

### Reviews (`/api/reviews`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/reviews/product/{product_id}` | Listar reseñas de un producto (paginado) | No |
| POST | `/api/reviews` | Crear reseña (1-5 estrellas) | Sí |
| PUT | `/api/reviews/{review_id}` | Editar reseña propia | Sí |
| DELETE | `/api/reviews/{review_id}` | Borrar reseña propia | Sí |

### Coupons (`/api/coupons`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/coupons/validate` | Validar un cupón contra el subtotal del carrito | Sí |
| GET | `/api/coupons` | Listado de cupones | Admin |
| POST | `/api/coupons` | Crear cupón | Admin |
| PUT | `/api/coupons/{coupon_id}` | Editar cupón | Admin |
| DELETE | `/api/coupons/{coupon_id}` | Dar de baja (soft delete) | Admin |

### Addresses (`/api/addresses`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/addresses` | Listar direcciones propias | Sí |
| POST | `/api/addresses` | Crear dirección | Sí |
| PUT | `/api/addresses/{address_id}` | Editar dirección | Sí |
| DELETE | `/api/addresses/{address_id}` | Eliminar dirección | Sí |

### Orders (`/api/orders`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/orders` | Crear orden a partir del carrito (checkout) | Sí |
| GET | `/api/orders` | Listar pedidos propios (paginado) | Sí |
| GET | `/api/orders/{order_id}` | Detalle de un pedido propio | Sí |
| GET | `/api/orders/admin/all` | Listar todos los pedidos (con filtros y búsqueda) | Admin |
| PUT | `/api/orders/admin/{order_id}` | Cambiar estado de un pedido | Admin |

**Ejemplo — crear orden (checkout):**

```
POST /api/orders
Authorization: Bearer <token>
```

**Request body:**
```json
{
  "shipping_address_id": "9c2b1a...",
  "coupon_code": "DESCUENTO10"
}
```

`coupon_code` es opcional. El backend toma los ítems del carrito actual del
usuario, valida stock, aplica el cupón (si corresponde) y crea la orden en
una única transacción.

**Respuesta exitosa (201):**
```json
{
  "id": "a1b2c3...",
  "order_number": "TS-20260711-0001",
  "status": "pending",
  "payment_status": "pending",
  "subtotal": "189999.00",
  "discount": "18999.90",
  "total": "171000.00",
  "shipping_address_snapshot": {
    "street": "Av. Siempreviva 742",
    "city": "Buenos Aires",
    "province": "CABA",
    "zip_code": "1000"
  },
  "items": [
    {
      "product_name": "Auriculares Sony WH-1000XM5",
      "unit_price": "189999.00",
      "quantity": 1
    }
  ]
}
```

### Payments (`/api/payments`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/payments/{order_id}/create` | Crear preferencia de pago (MercadoPago o mock) | Sí |
| POST | `/api/payments/webhook` | Webhook de notificaciones de MercadoPago (valida firma HMAC-SHA256) | No (firma) |
| POST | `/api/payments/mock-checkout/{order_id}` | Aprobar el pago de una orden en modo mock | Sí |

### Dashboard (`/api/admin/dashboard`)

Un único endpoint que devuelve todas las métricas del panel admin en una sola
respuesta anidada (no hay sub-rutas separadas por sección):

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/admin/dashboard` | Métricas del dashboard: resumen, ventas de los últimos 30 días, top productos, stock bajo y pedidos recientes | Admin |

Ejemplo de response (`DashboardMetricsResponse`):
```json
{
  "summary": {
    "total_revenue": 12500000.00,
    "total_orders": 48,
    "pending_orders": 5,
    "total_customers": 32,
    "total_products": 20
  },
  "recent_sales": [
    { "date": "2026-07-10", "revenue": 950000.00, "orders": 2 }
  ],
  "top_products": [
    { "product_id": "...", "product_name": "iPhone 15", "total_sold": 14, "revenue": 13300000.00 }
  ],
  "low_stock_products": [
    { "id": "...", "name": "Galaxy S24", "sku": "SAM-GS24-256", "stock": 3, "low_stock_threshold": 5 }
  ],
  "recent_orders": [
    { "id": "...", "order_number": "TS-20260711-0001", "customer_name": "Ada Administradora", "total": 950000.00, "status": "pending", "created_at": "2026-07-11T10:00:00Z" }
  ]
}
```

### Users (`/api/admin/users`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/admin/users` | Listado paginado de usuarios | Admin |
| GET | `/api/admin/users/{user_id}` | Detalle de usuario | Admin |
| PUT | `/api/admin/users/{user_id}/role` | Cambiar rol | Admin |
| PUT | `/api/admin/users/{user_id}/status` | Activar/desactivar | Admin |

---

## Flujo de checkout

1. **Carrito**: el usuario agrega productos con `POST /api/cart/items`. El
   carrito se sincroniza entre el estado local (Zustand) y el backend; al
   loguearse, el carrito local se fusiona con el del backend.
2. **Validar dirección**: el usuario selecciona o crea una dirección de envío
   (`POST /api/addresses` si no tiene una guardada).
3. **Crear la orden**: `POST /api/orders` con `shipping_address_id` y,
   opcionalmente, `coupon_code`. El backend valida stock, calcula el
   subtotal, aplica el descuento del cupón (si es válido) y persiste un
   snapshot inmutable de la dirección y los datos del producto en el momento
   de la compra. La orden queda en estado `pending`.
4. **Pago**:
   - Con MercadoPago configurado: `POST /api/payments/{order_id}/create`
     genera una preferencia de pago y redirige al checkout de MercadoPago.
     La confirmación llega vía `POST /api/payments/webhook`, validado con
     firma HMAC-SHA256.
   - Sin `MERCADOPAGO_ACCESS_TOKEN` configurado (modo mock): se llama a
     `POST /api/payments/mock-checkout/{order_id}`, que aprueba el pago
     inmediatamente sin necesidad de credenciales reales.
5. **Confirmación**: una vez aprobado el pago, la orden pasa a
   `payment_status: "approved"` y el usuario es redirigido a la pantalla de
   éxito (`/checkout/exito` en el frontend), donde puede ver el detalle del
   pedido con `GET /api/orders/{order_id}`.

---

## Códigos de error comunes

| Código | Significado | Ejemplo de causa |
|--------|-------------|-------------------|
| 401 | No autenticado | Token ausente, inválido o expirado |
| 403 | Sin permisos | Usuario `customer` intentando acceder a un endpoint `admin` |
| 404 | No encontrado | Producto, orden o recurso inexistente / dado de baja |
| 422 | Error de validación | Datos de entrada inválidos |
| 429 | Demasiadas solicitudes | Rate limiting (100 req/min general, 10 req/min en auth) |

**Formato de error de validación (422):**

Todos los errores de validación de request (`RequestValidationError`) se
devuelven con un formato consistente:

```json
{
  "detail": "Error de validación en los datos enviados",
  "errors": [
    {
      "type": "value_error",
      "loc": ["body", "password"],
      "msg": "Value error, La contraseña debe tener al menos 8 caracteres",
      "input": "123"
    }
  ]
}
```

**Formato de error genérico (401/403/404/400):**

```json
{
  "detail": "Email o contraseña incorrectos"
}
```

**Formato de error de rate limiting (429):**

```json
{
  "detail": "Demasiadas solicitudes. Intentá de nuevo en unos minutos."
}
```

---

Para el detalle completo de request/response schemas de cada endpoint
(incluyendo los que no están listados aquí), probar directamente en
`http://localhost:8000/docs`.
