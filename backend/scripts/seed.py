"""Script de seed: puebla la base de datos con datos de ejemplo para TechStore.

Es idempotente: puede correrse múltiples veces sin duplicar registros (se
verifica existencia por email/slug/sku/code antes de cada insert).

Uso (desde `backend/`, con el entorno virtual activado y las variables de
entorno configuradas -ya sea vía `.env` local o las del contenedor Docker-):

    python -m scripts.seed
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import quote_plus

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.brand import Brand
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.utils.constants import UserRole
from app.utils.security import hash_password
from app.utils.slug import generate_slug

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")

ADMIN_EMAIL = "admin@techstore.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_FIRST_NAME = "Ada"
ADMIN_LAST_NAME = "Administradora"

PLACEHOLDER_BASE_URL = "https://placehold.co/600x600/e2e8f0/64748b?text="


def placeholder_url(product_name: str) -> str:
    """Genera una URL de imagen placeholder con el nombre del producto URL-encoded."""
    return f"{PLACEHOLDER_BASE_URL}{quote_plus(product_name)}"


@dataclass
class SeedStats:
    """Contador simple de creados vs. ya existentes, para el resumen final."""

    created: int = 0
    existing: int = 0
    details: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Datos de categorías (con subcategorías reales bajo "Audio")
# ---------------------------------------------------------------------------

CATEGORIES_DATA: list[dict] = [
    {
        "name": "Smartphones",
        "description": "Teléfonos inteligentes de última generación.",
        "display_order": 1,
    },
    {
        "name": "Notebooks",
        "description": "Notebooks y laptops para trabajo, estudio y gaming.",
        "display_order": 2,
    },
    {
        "name": "Tablets",
        "description": "Tablets para productividad y entretenimiento.",
        "display_order": 3,
    },
    {
        "name": "Audio",
        "description": "Auriculares, parlantes y equipos de audio.",
        "display_order": 4,
        "children": [
            {
                "name": "Auriculares",
                "description": "Auriculares in-ear, over-ear y con cancelación de ruido.",
                "display_order": 1,
            },
            {
                "name": "Parlantes",
                "description": "Parlantes portátiles y de escritorio.",
                "display_order": 2,
            },
        ],
    },
    {
        "name": "Accesorios",
        "description": "Mouses, teclados y accesorios en general.",
        "display_order": 5,
    },
    {
        "name": "Gaming",
        "description": "Equipos y periféricos pensados para gamers.",
        "display_order": 6,
    },
    {
        "name": "Smartwatches",
        "description": "Relojes inteligentes y wearables.",
        "display_order": 7,
    },
    {
        "name": "Monitores",
        "description": "Monitores para trabajo, diseño y gaming.",
        "display_order": 8,
    },
]

# ---------------------------------------------------------------------------
# Datos de marcas
# ---------------------------------------------------------------------------

BRANDS_DATA: list[str] = ["Apple", "Samsung", "Sony", "Xiaomi", "Logitech", "Asus"]

# ---------------------------------------------------------------------------
# Datos de productos. `category` y `brand` referencian por nombre (se resuelven
# a sus IDs reales una vez creadas/encontradas las categorías y marcas).
# ---------------------------------------------------------------------------

PRODUCTS_DATA: list[dict] = [
    {
        "name": "iPhone 15",
        "sku": "APL-IPH15-128",
        "category": "Smartphones",
        "brand": "Apple",
        "short_description": "El iPhone 15 con chip A16 Bionic y cámara de 48MP.",
        "description": (
            "iPhone 15 de 128GB con pantalla Super Retina XDR, chip A16 Bionic, "
            "cámara principal de 48MP y conector USB-C."
        ),
        "price": Decimal("950000"),
        "compare_at_price": Decimal("1050000"),
        "stock": 25,
        "is_featured": True,
    },
    {
        "name": "iPhone 15 Pro Max",
        "sku": "APL-IPH15PM",
        "category": "Smartphones",
        "brand": "Apple",
        "short_description": "El tope de gama de Apple, con titanio y chip A17 Pro.",
        "description": (
            "iPhone 15 Pro Max con chasis de titanio, chip A17 Pro, zoom óptico 5x "
            "y grabación de video en ProRes."
        ),
        "price": Decimal("1850000"),
        "stock": 10,
        "is_featured": True,
        "variants": [
            {
                "name": "256GB - Titanio Natural",
                "sku": "APL-IPH15PM-256-NAT",
                "attributes": {"storage": "256GB", "color": "Titanio Natural"},
                "price_adjustment": Decimal("0"),
                "stock": 8,
            },
            {
                "name": "256GB - Titanio Azul",
                "sku": "APL-IPH15PM-256-BLU",
                "attributes": {"storage": "256GB", "color": "Titanio Azul"},
                "price_adjustment": Decimal("0"),
                "stock": 5,
            },
            {
                "name": "512GB - Titanio Natural",
                "sku": "APL-IPH15PM-512-NAT",
                "attributes": {"storage": "512GB", "color": "Titanio Natural"},
                "price_adjustment": Decimal("250000"),
                "stock": 3,
            },
            {
                "name": "512GB - Titanio Azul",
                "sku": "APL-IPH15PM-512-BLU",
                "attributes": {"storage": "512GB", "color": "Titanio Azul"},
                "price_adjustment": Decimal("250000"),
                "stock": 2,
            },
        ],
    },
    {
        "name": "Galaxy S24",
        "sku": "SAM-GS24-256",
        "category": "Smartphones",
        "brand": "Samsung",
        "short_description": "Galaxy S24 con inteligencia artificial integrada.",
        "description": (
            "Samsung Galaxy S24 de 256GB, pantalla Dynamic AMOLED 2X y funciones "
            "de Galaxy AI para edición de fotos y traducción en tiempo real."
        ),
        "price": Decimal("890000"),
        "compare_at_price": Decimal("950000"),
        "stock": 3,
        "low_stock_threshold": 5,
        "is_featured": False,
    },
    {
        "name": "Redmi Note 13",
        "sku": "XMI-RN13-128",
        "category": "Smartphones",
        "brand": "Xiaomi",
        "short_description": "Gama media con excelente relación precio-calidad.",
        "description": (
            "Xiaomi Redmi Note 13 con pantalla AMOLED de 120Hz, batería de "
            "5000mAh y cámara principal de 108MP."
        ),
        "price": Decimal("320000"),
        "stock": 40,
        "is_featured": False,
    },
    {
        "name": "MacBook Air M3",
        "sku": "APL-MBA-M3-256",
        "category": "Notebooks",
        "brand": "Apple",
        "short_description": "Ultraliviana, silenciosa y con gran autonomía.",
        "description": (
            "MacBook Air con chip Apple M3, 8GB de RAM unificada, pantalla "
            "Liquid Retina de 13.6\" y hasta 18 horas de batería."
        ),
        "price": Decimal("2100000"),
        "compare_at_price": Decimal("2300000"),
        "stock": 8,
        "is_featured": True,
        "variants": [
            {
                "name": "256GB - Gris Espacial",
                "sku": "APL-MBA-M3-256-GRY",
                "attributes": {"storage": "256GB", "color": "Gris Espacial"},
                "price_adjustment": Decimal("0"),
                "stock": 5,
            },
            {
                "name": "256GB - Plata",
                "sku": "APL-MBA-M3-256-SLV",
                "attributes": {"storage": "256GB", "color": "Plata"},
                "price_adjustment": Decimal("0"),
                "stock": 4,
            },
            {
                "name": "512GB - Gris Espacial",
                "sku": "APL-MBA-M3-512-GRY",
                "attributes": {"storage": "512GB", "color": "Gris Espacial"},
                "price_adjustment": Decimal("350000"),
                "stock": 2,
            },
        ],
    },
    {
        "name": "Vivobook 15",
        "sku": "ASU-VB15-512",
        "category": "Notebooks",
        "brand": "Asus",
        "short_description": "Notebook versátil para trabajo y estudio.",
        "description": (
            "Asus Vivobook 15 con procesador Intel Core i5, 16GB de RAM, "
            "SSD de 512GB y pantalla Full HD de 15.6\"."
        ),
        "price": Decimal("780000"),
        "stock": 15,
        "is_featured": False,
    },
    {
        "name": "Galaxy Book4",
        "sku": "SAM-GB4-512",
        "category": "Notebooks",
        "brand": "Samsung",
        "short_description": "Notebook premium con pantalla AMOLED.",
        "description": (
            "Samsung Galaxy Book4 con procesador Intel Core i7, 16GB de RAM y "
            "pantalla AMOLED de 15.6\" con colores vibrantes."
        ),
        "price": Decimal("1150000"),
        "stock": 2,
        "low_stock_threshold": 5,
        "is_featured": False,
    },
    {
        "name": "iPad Air",
        "sku": "APL-IPADAIR-256",
        "category": "Tablets",
        "brand": "Apple",
        "short_description": "Potencia y portabilidad con chip M2.",
        "description": (
            "iPad Air de 256GB con chip M2, compatible con Apple Pencil Pro y "
            "pantalla Liquid Retina de 10.9\"."
        ),
        "price": Decimal("980000"),
        "stock": 12,
        "is_featured": True,
    },
    {
        "name": "Galaxy Tab S9",
        "sku": "SAM-TABS9-256",
        "category": "Tablets",
        "brand": "Samsung",
        "short_description": "Tablet premium con S Pen incluido.",
        "description": (
            "Samsung Galaxy Tab S9 de 256GB, resistencia al agua IP68 y "
            "S Pen incluido sin costo adicional."
        ),
        "price": Decimal("870000"),
        "stock": 6,
        "is_featured": False,
    },
    {
        "name": "WH-1000XM5",
        "sku": "SNY-WH1000XM5",
        "category": "Auriculares",
        "brand": "Sony",
        "short_description": "Los auriculares con cancelación de ruido líderes del mercado.",
        "description": (
            "Sony WH-1000XM5 con cancelación de ruido líder de la industria, "
            "30 horas de batería y sonido Hi-Res."
        ),
        "price": Decimal("450000"),
        "compare_at_price": Decimal("520000"),
        "stock": 20,
        "is_featured": True,
        "variants": [
            {
                "name": "Negro",
                "sku": "SNY-WH1000XM5-BLK",
                "attributes": {"color": "Negro"},
                "price_adjustment": Decimal("0"),
                "stock": 12,
            },
            {
                "name": "Plata",
                "sku": "SNY-WH1000XM5-SLV",
                "attributes": {"color": "Plata"},
                "price_adjustment": Decimal("0"),
                "stock": 8,
            },
        ],
    },
    {
        "name": "G435 Lightspeed",
        "sku": "LOG-G435",
        "category": "Auriculares",
        "brand": "Logitech",
        "short_description": "Auriculares gamer inalámbricos livianos.",
        "description": (
            "Logitech G435 Lightspeed, auriculares inalámbricos livianos con "
            "conexión dual Bluetooth y Lightspeed."
        ),
        "price": Decimal("110000"),
        "stock": 30,
        "is_featured": False,
    },
    {
        "name": "SRS-XB100",
        "sku": "SNY-SRSXB100",
        "category": "Parlantes",
        "brand": "Sony",
        "short_description": "Parlante portátil compacto y resistente al agua.",
        "description": (
            "Sony SRS-XB100, parlante portátil con sonido EXTRA BASS, "
            "resistencia al agua IP67 y hasta 16 horas de batería."
        ),
        "price": Decimal("150000"),
        "stock": 4,
        "low_stock_threshold": 5,
        "is_featured": False,
    },
    {
        "name": "Mi Portable Speaker",
        "sku": "XMI-MIPS",
        "category": "Parlantes",
        "brand": "Xiaomi",
        "short_description": "Parlante portátil con gran autonomía de batería.",
        "description": (
            "Xiaomi Mi Portable Speaker, sonido de 360°, resistencia al agua "
            "IPX7 y hasta 13 horas de reproducción."
        ),
        "price": Decimal("130000"),
        "stock": 18,
        "is_featured": False,
    },
    {
        "name": "MX Master 3S",
        "sku": "LOG-MXM3S",
        "category": "Accesorios",
        "brand": "Logitech",
        "short_description": "El mouse ergonómico preferido por profesionales.",
        "description": (
            "Logitech MX Master 3S, mouse inalámbrico ergonómico con scroll "
            "electromagnético y sensor de 8000 DPI."
        ),
        "price": Decimal("180000"),
        "stock": 22,
        "is_featured": True,
    },
    {
        "name": "K380 Multi-Device",
        "sku": "LOG-K380",
        "category": "Accesorios",
        "brand": "Logitech",
        "short_description": "Teclado compacto multi-dispositivo.",
        "description": (
            "Logitech K380, teclado inalámbrico compacto compatible con "
            "hasta 3 dispositivos vía Bluetooth."
        ),
        "price": Decimal("120000"),
        "stock": 16,
        "is_featured": False,
    },
    {
        "name": "ROG Strix G16",
        "sku": "ASU-ROGSTRIXG16",
        "category": "Gaming",
        "brand": "Asus",
        "short_description": "Notebook gamer de alto rendimiento.",
        "description": (
            "Asus ROG Strix G16 con procesador Intel Core i7, 16GB de RAM, "
            "placa de video RTX 4060 y pantalla de 165Hz."
        ),
        "price": Decimal("2450000"),
        "compare_at_price": Decimal("2600000"),
        "stock": 5,
        "is_featured": True,
    },
    {
        "name": "G Pro X Superlight",
        "sku": "LOG-GPROXSL",
        "category": "Gaming",
        "brand": "Logitech",
        "short_description": "Mouse gamer ultraliviano de nivel profesional.",
        "description": (
            "Logitech G Pro X Superlight, mouse inalámbrico gamer de menos de "
            "63 gramos, usado por jugadores profesionales de esports."
        ),
        "price": Decimal("210000"),
        "stock": 1,
        "low_stock_threshold": 5,
        "is_featured": False,
    },
    {
        "name": "Apple Watch Series 9",
        "sku": "APL-AWS9-41",
        "category": "Smartwatches",
        "brand": "Apple",
        "short_description": "El smartwatch más completo del ecosistema Apple.",
        "description": (
            "Apple Watch Series 9 con chip S9, pantalla Retina Always-On y "
            "funciones avanzadas de salud y actividad física."
        ),
        "price": Decimal("650000"),
        "compare_at_price": Decimal("720000"),
        "stock": 14,
        "is_featured": True,
        "variants": [
            {
                "name": "41mm - Medianoche",
                "sku": "APL-AWS9-41-MID",
                "attributes": {"size": "41mm", "color": "Medianoche"},
                "price_adjustment": Decimal("0"),
                "stock": 6,
            },
            {
                "name": "45mm - Medianoche",
                "sku": "APL-AWS9-45-MID",
                "attributes": {"size": "45mm", "color": "Medianoche"},
                "price_adjustment": Decimal("40000"),
                "stock": 5,
            },
            {
                "name": "41mm - Plata",
                "sku": "APL-AWS9-41-SLV",
                "attributes": {"size": "41mm", "color": "Plata"},
                "price_adjustment": Decimal("0"),
                "stock": 3,
            },
        ],
    },
    {
        "name": "Galaxy Watch6",
        "sku": "SAM-GW6-40",
        "category": "Smartwatches",
        "brand": "Samsung",
        "short_description": "Smartwatch con monitoreo avanzado de salud.",
        "description": (
            "Samsung Galaxy Watch6 con seguimiento de sueño, composición "
            "corporal y pantalla Super AMOLED de alto brillo."
        ),
        "price": Decimal("480000"),
        "stock": 9,
        "is_featured": False,
    },
    {
        "name": "TUF Gaming VG27",
        "sku": "ASU-TUFVG27",
        "category": "Monitores",
        "brand": "Asus",
        "short_description": "Monitor gamer Full HD de 165Hz.",
        "description": (
            "Asus TUF Gaming VG27, monitor de 27\" Full HD con 165Hz de "
            "refresco y tecnología FreeSync Premium."
        ),
        "price": Decimal("520000"),
        "stock": 7,
        "is_featured": False,
    },
]

# ---------------------------------------------------------------------------
# Datos de cupones
# ---------------------------------------------------------------------------

COUPONS_DATA: list[dict] = [
    {
        "code": "DESCUENTO10",
        "description": "10% de descuento en toda la tienda.",
        "discount_type": "percentage",
        "discount_value": Decimal("10"),
        "min_purchase_amount": None,
        "max_discount_amount": None,
        "usage_limit": None,
        "per_user_limit": 1,
    },
    {
        "code": "BIENVENIDO",
        "description": "$5000 de descuento de bienvenida.",
        "discount_type": "fixed",
        "discount_value": Decimal("5000"),
        "min_purchase_amount": None,
        "max_discount_amount": None,
        "usage_limit": None,
        "per_user_limit": 1,
    },
    {
        "code": "TECHVIP",
        "description": "20% de descuento en compras mayores a $100.000.",
        "discount_type": "percentage",
        "discount_value": Decimal("20"),
        "min_purchase_amount": Decimal("100000"),
        "max_discount_amount": None,
        "usage_limit": None,
        "per_user_limit": 1,
    },
]


async def seed_admin(session: AsyncSession) -> SeedStats:
    """Crea el usuario administrador de ejemplo si no existe (busca por email)."""
    stats = SeedStats()

    result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
    existing = result.scalar_one_or_none()

    if existing is not None:
        stats.existing += 1
        logger.info("Usuario admin ya existe: %s", ADMIN_EMAIL)
        return stats

    admin = User(
        email=ADMIN_EMAIL,
        hashed_password=hash_password(ADMIN_PASSWORD),
        first_name=ADMIN_FIRST_NAME,
        last_name=ADMIN_LAST_NAME,
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    stats.created += 1
    logger.info("Usuario admin creado: %s", ADMIN_EMAIL)
    return stats


async def seed_categories(session: AsyncSession) -> tuple[dict[str, Category], SeedStats]:
    """Crea las categorías (y subcategorías) de ejemplo si no existen.

    Devuelve un diccionario `nombre -> Category` con TODAS las categorías
    (top-level y subcategorías) para poder resolver `category_id` al crear
    productos.
    """
    stats = SeedStats()
    categories_by_name: dict[str, Category] = {}

    for cat_data in CATEGORIES_DATA:
        children = cat_data.get("children", [])
        parent = await _get_or_create_category(session, cat_data, parent_id=None, stats=stats)
        categories_by_name[parent.name] = parent

        for child_data in children:
            child = await _get_or_create_category(
                session, child_data, parent_id=parent.id, stats=stats
            )
            categories_by_name[child.name] = child

    return categories_by_name, stats


async def _get_or_create_category(
    session: AsyncSession, data: dict, parent_id, stats: SeedStats
) -> Category:
    """Busca una categoría por nombre o slug; la crea si no existe."""
    slug = generate_slug(data["name"])

    result = await session.execute(
        select(Category).where(or_(Category.name == data["name"], Category.slug == slug))
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        stats.existing += 1
        logger.info("Categoría ya existe: %s", data["name"])
        return existing

    category = Category(
        name=data["name"],
        slug=slug,
        description=data.get("description"),
        parent_id=parent_id,
        display_order=data.get("display_order", 0),
        is_active=True,
    )
    session.add(category)
    await session.commit()
    stats.created += 1
    logger.info("Categoría creada: %s", data["name"])
    return category


async def seed_brands(session: AsyncSession) -> tuple[dict[str, Brand], SeedStats]:
    """Crea las marcas de ejemplo si no existen."""
    stats = SeedStats()
    brands_by_name: dict[str, Brand] = {}

    for name in BRANDS_DATA:
        slug = generate_slug(name)
        result = await session.execute(
            select(Brand).where(or_(Brand.name == name, Brand.slug == slug))
        )
        existing = result.scalar_one_or_none()

        if existing is not None:
            stats.existing += 1
            logger.info("Marca ya existe: %s", name)
            brands_by_name[name] = existing
            continue

        brand = Brand(name=name, slug=slug, is_active=True)
        session.add(brand)
        await session.commit()
        stats.created += 1
        logger.info("Marca creada: %s", name)
        brands_by_name[name] = brand

    return brands_by_name, stats


async def seed_products(
    session: AsyncSession, categories_by_name: dict[str, Category], brands_by_name: dict[str, Brand]
) -> SeedStats:
    """Crea los productos de ejemplo (con imágenes y variantes) si no existen."""
    stats = SeedStats()

    for data in PRODUCTS_DATA:
        slug = generate_slug(data["name"])
        sku = data["sku"]

        result = await session.execute(
            select(Product).where(or_(Product.slug == slug, Product.sku == sku))
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            stats.existing += 1
            logger.info("Producto ya existe: %s", data["name"])
            continue

        category = categories_by_name.get(data["category"])
        brand = brands_by_name.get(data["brand"])

        product = Product(
            name=data["name"],
            slug=slug,
            description=data.get("description"),
            short_description=data.get("short_description"),
            price=data["price"],
            compare_at_price=data.get("compare_at_price"),
            cost_price=(data["price"] * Decimal("0.65")).quantize(Decimal("1")),
            sku=sku,
            stock=data["stock"],
            low_stock_threshold=data.get("low_stock_threshold", 5),
            category_id=category.id if category else None,
            brand_id=brand.id if brand else None,
            is_active=True,
            is_featured=data.get("is_featured", False),
        )
        session.add(product)
        await session.flush()  # asigna product.id sin cerrar la transacción

        image = ProductImage(
            product_id=product.id,
            url=placeholder_url(data["name"]),
            alt_text=data["name"],
            display_order=0,
            is_primary=True,
        )
        session.add(image)

        for variant_data in data.get("variants", []):
            variant = ProductVariant(
                product_id=product.id,
                name=variant_data["name"],
                sku=variant_data.get("sku"),
                price_adjustment=variant_data.get("price_adjustment", Decimal("0")),
                stock=variant_data["stock"],
                attributes=variant_data["attributes"],
                is_active=True,
            )
            session.add(variant)

        await session.commit()
        stats.created += 1
        logger.info("Producto creado: %s", data["name"])

    return stats


async def seed_coupons(session: AsyncSession) -> SeedStats:
    """Crea los cupones de ejemplo si no existen (busca por code)."""
    stats = SeedStats()
    valid_from = datetime.now(timezone.utc)
    valid_until = valid_from + timedelta(days=365)

    for data in COUPONS_DATA:
        result = await session.execute(select(Coupon).where(Coupon.code == data["code"]))
        existing = result.scalar_one_or_none()
        if existing is not None:
            stats.existing += 1
            logger.info("Cupón ya existe: %s", data["code"])
            continue

        coupon = Coupon(
            code=data["code"],
            description=data.get("description"),
            discount_type=data["discount_type"],
            discount_value=data["discount_value"],
            min_purchase_amount=data.get("min_purchase_amount"),
            max_discount_amount=data.get("max_discount_amount"),
            usage_limit=data.get("usage_limit"),
            per_user_limit=data.get("per_user_limit", 1),
            valid_from=valid_from,
            valid_until=valid_until,
            is_active=True,
        )
        session.add(coupon)
        await session.commit()
        stats.created += 1
        logger.info("Cupón creado: %s", data["code"])

    return stats


async def main() -> None:
    """Punto de entrada: corre todos los pasos de seed en orden y en la misma sesión."""
    async with AsyncSessionLocal() as session:
        admin_stats = await seed_admin(session)
        categories_by_name, category_stats = await seed_categories(session)
        brands_by_name, brand_stats = await seed_brands(session)
        product_stats = await seed_products(session, categories_by_name, brands_by_name)
        coupon_stats = await seed_coupons(session)

    print("\n" + "=" * 60)
    print("RESUMEN DE SEED - TechStore")
    print("=" * 60)
    print(f"Usuario admin:  {admin_stats.created} creado(s), {admin_stats.existing} ya existía(n)")
    print(f"Categorías:     {category_stats.created} creada(s), {category_stats.existing} ya existía(n)")
    print(f"Marcas:         {brand_stats.created} creada(s), {brand_stats.existing} ya existía(n)")
    print(f"Productos:      {product_stats.created} creado(s), {product_stats.existing} ya existía(n)")
    print(f"Cupones:        {coupon_stats.created} creado(s), {coupon_stats.existing} ya existía(n)")
    print("=" * 60)
    print("Credenciales del usuario admin:")
    print(f"  Email:    {ADMIN_EMAIL}")
    print(f"  Password: {ADMIN_PASSWORD}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
