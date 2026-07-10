"""Tests del carrito de compras."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_product


class TestAddToCart:
    async def test_add_item_requires_auth(self, client: AsyncClient, db_session: AsyncSession) -> None:
        product = await create_product(db_session)

        resp = await client.post("/api/cart/items", json={"product_id": str(product.id), "quantity": 1})

        assert resp.status_code == 401

    async def test_add_item_succeeds(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=10)

        resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=auth_headers,
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["product_id"] == str(product.id)
        assert body["quantity"] == 2

    async def test_add_same_product_twice_sums_quantity(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=10)

        await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=auth_headers,
        )
        resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 3},
            headers=auth_headers,
        )

        assert resp.status_code == 201
        assert resp.json()["quantity"] == 5

        cart = await client.get("/api/cart", headers=auth_headers)
        assert cart.json()["item_count"] == 5
        assert len(cart.json()["items"]) == 1

    async def test_add_quantity_exceeding_stock_fails(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=3)

        resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 5},
            headers=auth_headers,
        )

        assert resp.status_code == 400


class TestUpdateCartItem:
    async def test_update_quantity_to_zero_removes_item(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=10)
        add_resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=auth_headers,
        )
        item_id = add_resp.json()["id"]

        resp = await client.put(
            f"/api/cart/items/{item_id}", json={"quantity": 0}, headers=auth_headers
        )

        assert resp.status_code == 200
        assert "message" in resp.json()

        cart = await client.get("/api/cart", headers=auth_headers)
        assert cart.json()["items"] == []

    async def test_update_quantity_above_stock_fails(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=5)
        add_resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=auth_headers,
        )
        item_id = add_resp.json()["id"]

        resp = await client.put(
            f"/api/cart/items/{item_id}", json={"quantity": 100}, headers=auth_headers
        )

        assert resp.status_code == 400


class TestGetCart:
    async def test_get_cart_returns_items_with_product_data(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, name="Webcam", stock=10)
        await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
            headers=auth_headers,
        )

        resp = await client.get("/api/cart", headers=auth_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"][0]["product_name"] == "Webcam"
        assert "unit_price" in body["items"][0]
        assert "line_total" in body["items"][0]

    async def test_get_cart_without_auth_returns_401(self, client: AsyncClient) -> None:
        resp = await client.get("/api/cart")

        assert resp.status_code == 401


class TestClearCart:
    async def test_clear_cart_empties_it(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=10)
        await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
            headers=auth_headers,
        )

        resp = await client.delete("/api/cart", headers=auth_headers)

        assert resp.status_code == 200
        cart = await client.get("/api/cart", headers=auth_headers)
        assert cart.json()["items"] == []
        assert cart.json()["item_count"] == 0

    async def test_clear_cart_without_auth_returns_401(self, client: AsyncClient) -> None:
        resp = await client.delete("/api/cart")

        assert resp.status_code == 401


class TestCartOwnership:
    async def test_user_cannot_see_another_users_cart_items(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
            headers=auth_headers,
        )

        other_cart = await client.get("/api/cart", headers=second_auth_headers)

        assert other_cart.status_code == 200
        assert other_cart.json()["items"] == []

    async def test_user_cannot_modify_another_users_cart_item(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        add_resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
            headers=auth_headers,
        )
        item_id = add_resp.json()["id"]

        resp = await client.put(
            f"/api/cart/items/{item_id}",
            json={"quantity": 5},
            headers=second_auth_headers,
        )

        assert resp.status_code == 404

    async def test_user_cannot_delete_another_users_cart_item(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        add_resp = await client.post(
            "/api/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
            headers=auth_headers,
        )
        item_id = add_resp.json()["id"]

        resp = await client.delete(f"/api/cart/items/{item_id}", headers=second_auth_headers)

        assert resp.status_code == 404
