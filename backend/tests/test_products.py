"""Tests del catálogo de productos: listado público, detalle y CRUD admin."""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_brand, create_category, create_product, refresh
from app.models.product import Product


class TestListProducts:
    async def test_list_products_public_no_auth(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        await create_product(db_session, name="Mouse")
        await create_product(db_session, name="Teclado")

        resp = await client.get("/api/products")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert len(body["items"]) == 2
        assert body["page"] == 1

    async def test_list_products_filters_by_search(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        await create_product(db_session, name="Notebook Gamer")
        await create_product(db_session, name="Mouse Inalámbrico")

        resp = await client.get("/api/products", params={"search": "Gamer"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Notebook Gamer"

    async def test_list_products_filters_by_category(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        cat_a = await create_category(db_session, name="Periféricos")
        cat_b = await create_category(db_session, name="Notebooks")
        await create_product(db_session, name="Mouse", category_id=cat_a.id)
        await create_product(db_session, name="Notebook", category_id=cat_b.id)

        resp = await client.get("/api/products", params={"category_id": str(cat_a.id)})

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Mouse"

    async def test_list_products_filters_by_brand(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        brand_a = await create_brand(db_session, name="Logitech")
        brand_b = await create_brand(db_session, name="Dell")
        await create_product(db_session, name="Mouse MX", brand_id=brand_a.id)
        await create_product(db_session, name="XPS 13", brand_id=brand_b.id)

        resp = await client.get("/api/products", params={"brand_id": str(brand_a.id)})

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Mouse MX"

    async def test_list_products_filters_by_price_range(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        await create_product(db_session, name="Barato", price=Decimal("500.00"))
        await create_product(db_session, name="Medio", price=Decimal("5000.00"))
        await create_product(db_session, name="Caro", price=Decimal("50000.00"))

        resp = await client.get(
            "/api/products", params={"min_price": "1000", "max_price": "10000"}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Medio"

    async def test_inactive_products_not_in_public_list(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        await create_product(db_session, name="Activo", is_active=True)
        await create_product(db_session, name="Inactivo", is_active=False)

        resp = await client.get("/api/products")

        assert resp.status_code == 200
        body = resp.json()
        names = [item["name"] for item in body["items"]]
        assert "Activo" in names
        assert "Inactivo" not in names
        assert body["total"] == 1


class TestGetProductBySlug:
    async def test_get_product_by_slug_returns_full_detail(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        category = await create_category(db_session, name="Audio")
        brand = await create_brand(db_session, name="Sony")
        product = await create_product(
            db_session,
            name="Auriculares",
            slug="auriculares-sony",
            category_id=category.id,
            brand_id=brand.id,
        )

        resp = await client.get(f"/api/products/{product.slug}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Auriculares"
        assert body["category"]["name"] == "Audio"
        assert body["brand"]["name"] == "Sony"
        assert body["images"] == []
        assert body["variants"] == []

    async def test_get_product_by_slug_not_found_returns_404(self, client: AsyncClient) -> None:
        resp = await client.get("/api/products/no-existe-este-producto")

        assert resp.status_code == 404

    async def test_get_inactive_product_by_slug_returns_404(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, slug="descontinuado", is_active=False)

        resp = await client.get(f"/api/products/{product.slug}")

        assert resp.status_code == 404


class TestCreateProduct:
    async def test_create_product_without_auth_returns_401(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/products",
            json={"name": "Nuevo", "slug": "nuevo-producto", "price": "100.00"},
        )

        assert resp.status_code == 401

    async def test_create_product_as_customer_returns_403(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.post(
            "/api/products",
            json={"name": "Nuevo", "slug": "nuevo-producto-2", "price": "100.00"},
            headers=auth_headers,
        )

        assert resp.status_code == 403

    async def test_create_product_as_admin_succeeds(
        self, client: AsyncClient, admin_headers: dict
    ) -> None:
        # BUG REAL DE LA APP (no arreglado acá, ver reporte del test-runner):
        # `product_service.create_product` construye el `Product` en
        # memoria, hace `db.add()` + `commit()` + `refresh(product)` (sin
        # `attribute_names`, que sólo refresca columnas, no relaciones) y
        # lo devuelve. El router hace luego
        # `ProductResponse.model_validate(product)`, y `ProductResponse`
        # incluye `images`/`variants` (relaciones nunca eager-cargadas acá,
        # a diferencia de `get_product_by_slug`/`get_product_by_id`, que sí
        # usan `selectinload`). Acceder a esas relaciones dispara un lazy
        # load síncrono fuera de un contexto async activo, y revienta con
        # `MissingGreenlet: greenlet_spawn has not been called`. Esto NO es
        # un problema de SQLite: el mecanismo (lazy-load fuera de un
        # `await`) es el mismo contra PostgreSQL. En la práctica,
        # `POST /api/products` devuelve 500 en vez de 201 al crear un
        # producto nuevo.
        resp = await client.post(
            "/api/products",
            json={
                "name": "Monitor 27 pulgadas",
                "slug": "monitor-27",
                "price": "150000.00",
                "cost_price": "90000.00",
                "stock": 15,
            },
            headers=admin_headers,
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Monitor 27 pulgadas"
        assert body["stock"] == 15


class TestUpdateProduct:
    async def test_update_product_as_admin_succeeds(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, name="Viejo nombre")

        resp = await client.put(
            f"/api/products/{product.id}",
            json={"name": "Nuevo nombre", "price": "9999.00"},
            headers=admin_headers,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Nuevo nombre"
        assert Decimal(body["price"]) == Decimal("9999.00")

    async def test_update_product_as_customer_returns_403(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        resp = await client.put(
            f"/api/products/{product.id}",
            json={"name": "Hackeado"},
            headers=auth_headers,
        )

        assert resp.status_code == 403


class TestDeleteProduct:
    async def test_delete_product_soft_deletes(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, name="A eliminar")

        resp = await client.delete(f"/api/products/{product.id}", headers=admin_headers)
        assert resp.status_code == 200

        # El soft delete no debe borrar la fila: se verifica vía el endpoint
        # admin por id (que sí trae inactivos), no vía el listado público.
        admin_detail = await client.get(
            f"/api/products/id/{product.id}", headers=admin_headers
        )
        assert admin_detail.status_code == 200
        assert admin_detail.json()["is_active"] is False

        db_product = await refresh(db_session, Product, product.id)
        assert db_product.is_active is False

    async def test_delete_product_without_auth_returns_401(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        resp = await client.delete(f"/api/products/{product.id}")

        assert resp.status_code == 401
