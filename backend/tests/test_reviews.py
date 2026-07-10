"""Tests de reseñas de producto."""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_product, refresh
from app.models.product import Product


class TestCreateReview:
    async def test_create_review_succeeds(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        resp = await client.post(
            "/api/reviews",
            json={"product_id": str(product.id), "rating": 5, "title": "Excelente", "comment": "Muy bueno"},
            headers=auth_headers,
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["rating"] == 5
        assert body["is_verified_purchase"] is False
        assert "user_name" in body

    async def test_create_review_without_auth_returns_401(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 4}
        )

        assert resp.status_code == 401

    async def test_cannot_create_duplicate_review_same_product(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        first = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 5}, headers=auth_headers
        )
        assert first.status_code == 201

        second = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 2}, headers=auth_headers
        )

        assert second.status_code == 409

    async def test_invalid_rating_returns_422(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)

        resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 10}, headers=auth_headers
        )

        assert resp.status_code == 422


class TestProductRatingRecalculation:
    async def test_avg_rating_updates_after_create(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session)

        await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 4}, headers=auth_headers
        )
        await client.post(
            "/api/reviews",
            json={"product_id": str(product.id), "rating": 2},
            headers=second_auth_headers,
        )

        db_product = await refresh(db_session, Product, product.id)
        assert db_product.review_count == 2
        assert Decimal(str(db_product.avg_rating)) == Decimal("3.0")

    async def test_avg_rating_updates_after_edit(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)
        create_resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 2}, headers=auth_headers
        )
        review_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/reviews/{review_id}", json={"rating": 5}, headers=auth_headers
        )
        assert resp.status_code == 200

        db_product = await refresh(db_session, Product, product.id)
        assert Decimal(str(db_product.avg_rating)) == Decimal("5.0")

    async def test_avg_rating_updates_after_delete(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ) -> None:
        product = await create_product(db_session)
        create_resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 3}, headers=auth_headers
        )
        review_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/reviews/{review_id}", headers=auth_headers)
        assert resp.status_code == 200

        db_product = await refresh(db_session, Product, product.id)
        assert db_product.review_count == 0
        assert Decimal(str(db_product.avg_rating)) == Decimal("0")


class TestReviewOwnership:
    async def test_only_author_can_edit_own_review(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session)
        create_resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 3}, headers=auth_headers
        )
        review_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/reviews/{review_id}", json={"rating": 1}, headers=second_auth_headers
        )

        assert resp.status_code == 404

    async def test_non_author_cannot_delete_review(
        self,
        client: AsyncClient,
        auth_headers: dict,
        second_auth_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session)
        create_resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 3}, headers=auth_headers
        )
        review_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/reviews/{review_id}", headers=second_auth_headers)

        assert resp.status_code == 404

    async def test_admin_can_delete_any_review(
        self,
        client: AsyncClient,
        auth_headers: dict,
        admin_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        product = await create_product(db_session)
        create_resp = await client.post(
            "/api/reviews", json={"product_id": str(product.id), "rating": 3}, headers=auth_headers
        )
        review_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/reviews/{review_id}", headers=admin_headers)

        assert resp.status_code == 200
