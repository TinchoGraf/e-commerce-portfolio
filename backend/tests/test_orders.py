"""Tests de órdenes de compra: checkout, consulta y administración.

Éstos son los tests más críticos de la suite: verifican que el stock se
descuente/devuelva correctamente, que el carrito se vacíe tras el checkout,
que los cupones se apliquen bien, y que las transiciones de estado respeten
`order_service.VALID_TRANSITIONS`.
"""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_address_for_user, create_coupon_in_db, create_product, refresh
from app.models.product import Product


async def _add_to_cart(client: AsyncClient, headers: dict, product_id, quantity: int = 1) -> None:
    resp = await client.post(
        "/api/cart/items",
        json={"product_id": str(product_id), "quantity": quantity},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text


class TestCreateOrder:
    async def test_create_order_with_empty_cart_returns_400(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        address = await create_address_for_user(db_session, test_user["id"])

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id)},
            headers=auth_headers,
        )

        assert resp.status_code == 400

    async def test_create_order_with_insufficient_stock_returns_400(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, stock=5)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=2)

        # Bajamos el stock por debajo de lo que ya está en el carrito,
        # simulando que otro checkout se lo llevó mientras tanto.
        product.stock = 1
        db_session.add(product)
        await db_session.commit()

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id)},
            headers=auth_headers,
        )

        assert resp.status_code == 400

    async def test_create_order_success(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, price=Decimal("1000.00"), stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=3)

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id)},
            headers=auth_headers,
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "PENDING"
        assert body["payment_status"] == "PENDING"
        assert len(body["items"]) == 1
        assert body["items"][0]["quantity"] == 3
        assert Decimal(body["subtotal"]) == Decimal("3000.00")

        db_product = await refresh(db_session, Product, product.id)
        assert db_product.stock == 7

        cart = await client.get("/api/cart", headers=auth_headers)
        assert cart.json()["items"] == []

    async def test_create_order_with_valid_coupon_applies_discount(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, price=Decimal("1000.00"), stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=2)
        coupon = await create_coupon_in_db(
            db_session, code="DESC10", discount_type="percentage", discount_value=Decimal("10")
        )

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id), "coupon_code": coupon.code},
            headers=auth_headers,
        )

        assert resp.status_code == 201
        body = resp.json()
        assert Decimal(body["subtotal"]) == Decimal("2000.00")
        assert Decimal(body["discount_amount"]) == Decimal("200.00")

    async def test_create_order_with_expired_coupon_fails(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        from datetime import datetime, timedelta, timezone

        product = await create_product(db_session, price=Decimal("1000.00"), stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=1)
        coupon = await create_coupon_in_db(
            db_session,
            code="VENCIDO",
            valid_from=datetime.now(timezone.utc) - timedelta(days=10),
            valid_until=datetime.now(timezone.utc) - timedelta(days=1),
        )

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id), "coupon_code": coupon.code},
            headers=auth_headers,
        )

        assert resp.status_code == 400

    async def test_create_order_with_nonexistent_coupon_fails(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session, price=Decimal("1000.00"), stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=1)

        resp = await client.post(
            "/api/orders",
            json={"shipping_address_id": str(address.id), "coupon_code": "NOEXISTE"},
            headers=auth_headers,
        )

        assert resp.status_code == 404


class TestListOrders:
    async def test_list_my_orders_returns_only_own(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_user: dict,
        second_auth_headers: dict,
        second_user: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        my_address = await create_address_for_user(db_session, test_user["id"])
        other_address = await create_address_for_user(db_session, second_user["id"])

        await _add_to_cart(client, auth_headers, product.id, quantity=1)
        await client.post(
            "/api/orders", json={"shipping_address_id": str(my_address.id)}, headers=auth_headers
        )

        await _add_to_cart(client, second_auth_headers, product.id, quantity=1)
        await client.post(
            "/api/orders",
            json={"shipping_address_id": str(other_address.id)},
            headers=second_auth_headers,
        )

        resp = await client.get("/api/orders", headers=auth_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1

    async def test_cannot_view_another_users_order_detail(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_user: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=1)
        order_resp = await client.post(
            "/api/orders", json={"shipping_address_id": str(address.id)}, headers=auth_headers
        )
        order_id = order_resp.json()["id"]

        resp = await client.get(f"/api/orders/{order_id}", headers=second_auth_headers)

        assert resp.status_code == 404

    async def test_admin_can_list_all_orders(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_user: dict,
        admin_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session, stock=10)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=1)
        await client.post(
            "/api/orders", json={"shipping_address_id": str(address.id)}, headers=auth_headers
        )

        resp = await client.get("/api/orders/admin/all", headers=admin_headers)

        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    async def test_list_all_orders_as_customer_returns_403(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get("/api/orders/admin/all", headers=auth_headers)

        assert resp.status_code == 403


class TestUpdateOrderStatus:
    async def _create_order(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession, stock: int = 10
    ):
        product = await create_product(db_session, stock=stock)
        address = await create_address_for_user(db_session, test_user["id"])
        await _add_to_cart(client, auth_headers, product.id, quantity=1)
        resp = await client.post(
            "/api/orders", json={"shipping_address_id": str(address.id)}, headers=auth_headers
        )
        assert resp.status_code == 201
        return resp.json(), product

    async def test_valid_transition_pending_to_confirmed(
        self, client: AsyncClient, auth_headers: dict, admin_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        order, _ = await self._create_order(client, auth_headers, test_user, db_session)

        resp = await client.put(
            f"/api/orders/admin/{order['id']}", json={"status": "CONFIRMED"}, headers=admin_headers
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "CONFIRMED"

    async def test_invalid_transition_returns_400(
        self, client: AsyncClient, auth_headers: dict, admin_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        order, _ = await self._create_order(client, auth_headers, test_user, db_session)

        # PENDING -> DELIVERED no está permitido (ver VALID_TRANSITIONS).
        resp = await client.put(
            f"/api/orders/admin/{order['id']}", json={"status": "DELIVERED"}, headers=admin_headers
        )

        assert resp.status_code == 400

    async def test_update_order_status_as_customer_returns_403(
        self, client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        order, _ = await self._create_order(client, auth_headers, test_user, db_session)

        resp = await client.put(
            f"/api/orders/admin/{order['id']}", json={"status": "CONFIRMED"}, headers=auth_headers
        )

        assert resp.status_code == 403

    async def test_cancel_order_restores_stock(
        self, client: AsyncClient, auth_headers: dict, admin_headers: dict, test_user: dict, db_session: AsyncSession
    ) -> None:
        order, product = await self._create_order(client, auth_headers, test_user, db_session, stock=10)

        stock_after_purchase = await refresh(db_session, Product, product.id)
        assert stock_after_purchase.stock == 9

        resp = await client.put(
            f"/api/orders/admin/{order['id']}", json={"status": "CANCELLED"}, headers=admin_headers
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

        stock_after_cancel = await refresh(db_session, Product, product.id)
        assert stock_after_cancel.stock == 10
