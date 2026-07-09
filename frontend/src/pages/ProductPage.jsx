import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Minus, Plus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import * as productsApi from '../api/products';
import * as categoriesApi from '../api/categories';
import * as wishlistApi from '../api/wishlist';
import ProductGallery from '../components/product/ProductGallery';
import VariantSelector from '../components/product/VariantSelector';
import ReviewList from '../components/product/ReviewList';
import ReviewForm from '../components/product/ReviewForm';
import StarRating from '../components/ui/StarRating';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useToastStore } from '../stores/toastStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice, calculateDiscountPercent } from '../utils/formatters';

function findCategoryInTree(categories, categoryId) {
  for (const category of categories) {
    if (category.id === categoryId) return category;
    if (category.children?.length) {
      const found = findCategoryInTree(category.children, categoryId);
      if (found) return found;
    }
  }
  return null;
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addItem = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [breadcrumbCategory, setBreadcrumbCategory] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [addError, setAddError] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);

  useDocumentTitle(product?.name);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    setSelectedVariantId(null);
    setQuantity(1);
    setActiveTab('description');

    productsApi
      .getProductBySlug(slug)
      .then((response) => {
        if (!isMounted) return;
        setProduct(response.data);
      })
      .catch(() => {
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!product?.category_id) {
      setBreadcrumbCategory(null);
      return;
    }
    let isMounted = true;
    categoriesApi
      .getCategories()
      .then((response) => {
        if (isMounted) setBreadcrumbCategory(findCategoryInTree(response.data, product.category_id));
      })
      .catch(() => {
        if (isMounted) setBreadcrumbCategory(null);
      });
    return () => {
      isMounted = false;
    };
  }, [product?.category_id]);

  useEffect(() => {
    if (!isAuthenticated || !product) {
      setIsWishlisted(false);
      return;
    }
    let isMounted = true;
    wishlistApi
      .getWishlist()
      .then((response) => {
        if (isMounted) {
          setIsWishlisted(response.data.some((item) => item.product_id === product.id));
        }
      })
      .catch(() => {
        if (isMounted) setIsWishlisted(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, product]);

  const variants = product?.variants ?? product?.active_variants ?? [];
  const images = product?.images ?? [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || null;

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    const adjustment = selectedVariant ? Number(selectedVariant.price_adjustment) : 0;
    return Number(product.price) + adjustment;
  }, [product, selectedVariant]);

  const displayStock = selectedVariant ? selectedVariant.stock : product?.stock ?? 0;
  const discountPercent = product
    ? calculateDiscountPercent(displayPrice, product.compare_at_price)
    : 0;

  useEffect(() => {
    if (activeTab !== 'reviews') return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  function refetchProduct() {
    productsApi
      .getProductBySlug(slug)
      .then((response) => setProduct(response.data))
      .catch(() => {});
  }

  function handleReviewSubmitted() {
    setReviewsRefreshKey((key) => key + 1);
    refetchProduct();
  }

  function scrollToReviews() {
    setActiveTab('reviews');
  }

  async function handleAddToCart() {
    setAddError('');

    if (variants.length > 0 && !selectedVariant) {
      setAddError('Elegí una variante antes de agregar al carrito.');
      return;
    }
    if (displayStock <= 0) return;

    const cartProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: images[0]?.url ?? null,
      price: Number(product.price),
    };
    const cartVariant = selectedVariant
      ? {
          id: selectedVariant.id,
          name: selectedVariant.name,
          price: Number(product.price) + Number(selectedVariant.price_adjustment),
        }
      : null;

    try {
      await addItem(cartProduct, cartVariant, quantity);
      addToast('Producto agregado al carrito', 'success');
    } catch {
      addToast('No se pudo agregar el producto al carrito', 'error');
    }
  }

  async function handleToggleWishlist() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/producto/${slug}`);
      return;
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await wishlistApi.removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        await wishlistApi.addToWishlist({ product_id: product.id });
        setIsWishlisted(true);
      }
    } catch {
      addToast('No se pudo actualizar tu lista de deseos', 'error');
    } finally {
      setWishlistLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Producto no encontrado"
          description="El producto que buscás no existe o ya no está disponible."
          action={
            <Button as={Link} to="/catalogo">
              Volver al catálogo
            </Button>
          }
        />
      </div>
    );
  }

  const stockBadge =
    displayStock <= 0
      ? { variant: 'red', label: 'Sin stock' }
      : displayStock <= (product.low_stock_threshold ?? 5)
        ? { variant: 'orange', label: `Últimas ${displayStock} unidades` }
        : { variant: 'green', label: 'En stock' };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        <Link to="/" className="hover:text-brand-600">
          Home
        </Link>
        <ChevronRight size={14} />
        {breadcrumbCategory && (
          <>
            <Link to={`/categoria/${breadcrumbCategory.slug}`} className="hover:text-brand-600">
              {breadcrumbCategory.name}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} productName={product.name} />

        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{product.name}</h1>

          <button
            type="button"
            onClick={scrollToReviews}
            aria-label={`Ver ${product.review_count} reseñas`}
            className="w-fit cursor-pointer"
          >
            <StarRating rating={product.avg_rating} count={product.review_count} />
          </button>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-ink">
              {formatPrice(displayPrice)}
            </span>
            {product.compare_at_price > displayPrice && (
              <span className="text-lg text-ink-soft line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
            {discountPercent > 0 && <Badge variant="orange">-{discountPercent}% OFF</Badge>}
          </div>

          <VariantSelector
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelect={setSelectedVariantId}
          />

          <Badge variant={stockBadge.variant} className="w-fit">
            {stockBadge.label}
          </Badge>

          <div className="flex items-center gap-1 rounded-lg border border-ink-soft/20 w-fit">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Disminuir cantidad"
              disabled={quantity <= 1}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink hover:bg-surface-alt disabled:cursor-not-allowed disabled:text-ink-soft/40"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-sm font-medium text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(displayStock || 1, q + 1))}
              aria-label="Aumentar cantidad"
              disabled={quantity >= displayStock}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink hover:bg-surface-alt disabled:cursor-not-allowed disabled:text-ink-soft/40"
            >
              <Plus size={16} />
            </button>
          </div>

          {addError && <p className="text-sm text-red-600">{addError}</p>}

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              disabled={displayStock <= 0}
              onClick={handleAddToCart}
              className="flex-1 sm:flex-none"
            >
              Agregar al carrito
            </Button>
            <button
              type="button"
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-pressed={isWishlisted}
              className="cursor-pointer rounded-lg border border-ink-soft/20 p-3 text-ink hover:bg-surface-alt disabled:cursor-not-allowed"
            >
              <Heart
                size={20}
                fill={isWishlisted ? 'currentColor' : 'none'}
                className={isWishlisted ? 'text-accent-600' : ''}
              />
            </button>
          </div>

          {product.sku && <span className="text-xs text-ink-soft">SKU: {product.sku}</span>}
        </div>
      </div>

      <div className="mt-14">
        <div role="tablist" aria-label="Información del producto" className="flex gap-6 border-b border-ink-soft/10">
          <button
            type="button"
            role="tab"
            id="tab-description"
            aria-selected={activeTab === 'description'}
            aria-controls="panel-description"
            onClick={() => setActiveTab('description')}
            className={clsx(
              'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
              activeTab === 'description'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            Descripción
          </button>
          <button
            type="button"
            role="tab"
            id="tab-reviews"
            aria-selected={activeTab === 'reviews'}
            aria-controls="reviews"
            onClick={() => setActiveTab('reviews')}
            className={clsx(
              'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
              activeTab === 'reviews'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            Reseñas ({product.review_count})
          </button>
        </div>

        {activeTab === 'description' && (
          <div
            id="panel-description"
            role="tabpanel"
            aria-labelledby="tab-description"
            className="max-w-3xl py-6 text-sm leading-relaxed text-ink-soft"
          >
            {product.description || product.short_description || 'Sin descripción disponible.'}
          </div>
        )}

        <div
          id="reviews"
          role="tabpanel"
          aria-labelledby="tab-reviews"
          className={clsx('flex flex-col gap-8 py-6', activeTab !== 'reviews' && 'hidden')}
        >
          <ReviewList
            productId={product.id}
            avgRating={Number(product.avg_rating)}
            reviewCount={product.review_count}
            refreshKey={reviewsRefreshKey}
            className="max-w-3xl"
          />
          {isAuthenticated && (
            <ReviewForm productId={product.id} onSubmit={handleReviewSubmitted} className="max-w-3xl" />
          )}
        </div>
      </div>
    </div>
  );
}
