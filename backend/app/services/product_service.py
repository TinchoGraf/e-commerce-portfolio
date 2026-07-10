"""Lógica de negocio de productos: catálogo, imágenes y variantes.

Los endpoints (routers) NO deben contener lógica de negocio: sólo llaman
a las funciones de este módulo y devuelven su resultado.
"""

import math
import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.schemas.product import (
    ProductCreate,
    ProductImageCreate,
    ProductListResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)
from app.utils.slug import generate_slug

# Columnas válidas para ordenar el listado de productos.
_SORT_COLUMNS: dict[str, Any] = {
    "name": Product.name,
    "price": Product.price,
    "created_at": Product.created_at,
    "avg_rating": Product.avg_rating,
    "review_count": Product.review_count,
}


def to_list_response(product: Product) -> ProductListResponse:
    """Mapea un `Product` ORM a `ProductListResponse`, calculando `primary_image_url`.

    Toma la imagen marcada como `is_primary=True`, o la primera imagen
    disponible si ninguna lo está, o `None` si el producto no tiene imágenes.
    Requiere que `product.images` ya esté precargado (`selectinload`).
    """
    images = list(product.images) if product.images else []
    primary_image = next((img for img in images if img.is_primary), None)
    primary_image_url = primary_image.url if primary_image else (images[0].url if images else None)

    return ProductListResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        price=product.price,
        compare_at_price=product.compare_at_price,
        is_featured=product.is_featured,
        avg_rating=product.avg_rating,
        review_count=product.review_count,
        stock=product.stock,
        primary_image_url=primary_image_url,
    )


async def list_products(
    db: AsyncSession,
    *,
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    search: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    is_featured: bool | None = None,
    is_active: bool | None = True,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Lista productos con filtros, búsqueda, orden y paginación.

    `is_active=True` (default) trae sólo productos activos (uso público).
    Pasar `is_active=None` desactiva ese filtro (uso admin, incluye inactivos).
    `page_size` se limita a un máximo de 100.

    Retorna un dict: `{"items", "total", "page", "page_size", "pages"}`.
    """
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    filters = []
    if is_active is not None:
        filters.append(Product.is_active == is_active)
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if brand_id is not None:
        filters.append(Product.brand_id == brand_id)
    if is_featured is not None:
        filters.append(Product.is_featured == is_featured)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if search:
        term = f"%{search}%"
        filters.append(or_(Product.name.ilike(term), Product.description.ilike(term)))

    sort_column = _SORT_COLUMNS.get(sort_by, Product.created_at)
    order_expr = sort_column.asc() if sort_order == "asc" else sort_column.desc()

    count_stmt = select(func.count()).select_from(Product)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.category),
            selectinload(Product.brand),
        )
        .order_by(order_expr)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if filters:
        stmt = stmt.where(*filters)

    result = await db.execute(stmt)
    items = list(result.scalars().unique().all())

    pages = math.ceil(total / page_size) if page_size else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def get_product_by_slug(db: AsyncSession, slug: str) -> Product:
    """Busca un producto activo por su slug, con imágenes, variantes activas, categoría y marca.

    Lanza 404 si no existe o si está inactivo (uso público: no se muestran productos dados de baja).
    """
    stmt = (
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category),
            selectinload(Product.brand),
        )
        .where(Product.slug == slug, Product.is_active == True)  # noqa: E712
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    # Nota: filtramos las variantes inactivas en Python (no reasignamos la
    # colección mapeada de SQLAlchemy para evitar que, ante un cascade
    # "delete-orphan", se marquen como huérfanas y se borren en un flush
    # posterior). Este endpoint es de sólo lectura.
    product.active_variants = [variant for variant in product.variants if variant.is_active]
    return product


async def get_product_by_id(db: AsyncSession, product_id: uuid.UUID) -> Product:
    """Busca un producto por id, incluyendo inactivos (uso interno/admin)."""
    stmt = (
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category),
            selectinload(Product.brand),
        )
        .where(Product.id == product_id)
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return product


async def create_product(db: AsyncSession, data: ProductCreate) -> Product:
    """Crea un producto nuevo, validando categoría/marca/sku/slug."""
    slug = (data.slug or "").strip() or generate_slug(data.name)

    if data.category_id is not None:
        category = await db.get(Category, data.category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    if data.brand_id is not None:
        brand = await db.get(Brand, data.brand_id)
        if brand is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")

    if data.sku:
        existing_sku = await db.execute(select(Product).where(Product.sku == data.sku))
        if existing_sku.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un producto con el SKU '{data.sku}'",
            )

    existing_slug = await db.execute(select(Product).where(Product.slug == slug))
    if existing_slug.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un producto con el slug '{slug}'",
        )

    payload = data.model_dump(exclude={"slug"})
    product = Product(**payload, slug=slug)
    db.add(product)
    await db.commit()
    # `refresh()` sólo recarga columnas, no relaciones: a diferencia de
    # `update_product` (que parte de `get_product_by_id`, ya con
    # `images`/`variants`/`category`/`brand` precargados vía `selectinload`),
    # acá el producto es nuevo y esas relaciones nunca se cargaron. Como
    # `ProductResponse` las serializa, hay que volver a buscarlo con el
    # mismo `selectinload` que usa el resto del service para evitar un
    # lazy-load síncrono fuera de contexto async (`MissingGreenlet`).
    return await get_product_by_id(db, product.id)


async def update_product(db: AsyncSession, product_id: uuid.UUID, data: ProductUpdate) -> Product:
    """Actualiza parcialmente un producto (sólo los campos enviados)."""
    product = await get_product_by_id(db, product_id)
    updates = data.model_dump(exclude_unset=True)

    if updates.get("category_id") is not None:
        category = await db.get(Category, updates["category_id"])
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    if updates.get("brand_id") is not None:
        brand = await db.get(Brand, updates["brand_id"])
        if brand is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")

    if updates.get("sku") and updates["sku"] != product.sku:
        existing_sku = await db.execute(
            select(Product).where(Product.sku == updates["sku"], Product.id != product_id)
        )
        if existing_sku.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un producto con el SKU '{updates['sku']}'",
            )

    if "slug" in updates:
        new_slug = (updates["slug"] or "").strip()
        if not new_slug:
            updates.pop("slug")
        elif new_slug != product.slug:
            existing_slug = await db.execute(
                select(Product).where(Product.slug == new_slug, Product.id != product_id)
            )
            if existing_slug.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un producto con el slug '{new_slug}'",
                )
            updates["slug"] = new_slug
        else:
            updates.pop("slug")

    for field, value in updates.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    """Da de baja un producto (soft delete: `is_active=False`)."""
    product = await get_product_by_id(db, product_id)
    product.is_active = False
    await db.commit()


async def add_product_image(
    db: AsyncSession, product_id: uuid.UUID, data: ProductImageCreate
) -> ProductImage:
    """Agrega una imagen a la galería de un producto.

    Si `is_primary=True`, desmarca cualquier otra imagen primaria del producto.
    """
    product = await get_product_by_id(db, product_id)

    if data.is_primary:
        await db.execute(
            update(ProductImage)
            .where(ProductImage.product_id == product.id)
            .values(is_primary=False)
        )

    image = ProductImage(product_id=product.id, **data.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


async def delete_product_image(db: AsyncSession, image_id: uuid.UUID) -> None:
    """Elimina definitivamente (hard delete) una imagen de producto."""
    image = await db.get(ProductImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagen no encontrada")
    await db.delete(image)
    await db.commit()


async def add_product_variant(
    db: AsyncSession, product_id: uuid.UUID, data: ProductVariantCreate
) -> ProductVariant:
    """Crea una variante (ej: color/capacidad) para un producto."""
    product = await get_product_by_id(db, product_id)

    if data.sku:
        existing = await db.execute(select(ProductVariant).where(ProductVariant.sku == data.sku))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una variante con el SKU '{data.sku}'",
            )

    variant = ProductVariant(product_id=product.id, **data.model_dump())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


async def update_product_variant(
    db: AsyncSession, variant_id: uuid.UUID, data: ProductVariantUpdate
) -> ProductVariant:
    """Actualiza parcialmente una variante de producto."""
    variant = await db.get(ProductVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante no encontrada")

    updates = data.model_dump(exclude_unset=True)

    if updates.get("sku") and updates["sku"] != variant.sku:
        existing = await db.execute(
            select(ProductVariant).where(
                ProductVariant.sku == updates["sku"], ProductVariant.id != variant_id
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una variante con el SKU '{updates['sku']}'",
            )

    for field, value in updates.items():
        setattr(variant, field, value)

    await db.commit()
    await db.refresh(variant)
    return variant


async def delete_product_variant(db: AsyncSession, variant_id: uuid.UUID) -> None:
    """Da de baja una variante (soft delete: `is_active=False`)."""
    variant = await db.get(ProductVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante no encontrada")
    variant.is_active = False
    await db.commit()
