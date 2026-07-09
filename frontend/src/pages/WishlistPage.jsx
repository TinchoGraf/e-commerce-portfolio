import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartOff, ShoppingCart } from 'lucide-react';
import * as wishlistApi from '../api/wishlist';
import ProductGrid from '../components/product/ProductGrid';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useCartStore } from '../stores/cartStore';
import { useToastStore } from '../stores/toastStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function WishlistPage() {
  useDocumentTitle('Favoritos');
  const addItem = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    wishlistApi
      .getWishlist()
      .then((response) => {
        if (!isMounted) return;
        setProducts(response.data.map((item) => item.product));
      })
      .catch(() => {
        if (isMounted) setProducts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRemove(product) {
    setRemovingIds((prev) => ({ ...prev, [product.id]: true }));
    try {
      await wishlistApi.removeFromWishlist(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      addToast('Producto removido de favoritos', 'success');
    } catch {
      addToast('No se pudo quitar el producto de favoritos', 'error');
    } finally {
      setRemovingIds((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
  }

  async function handleAddToCart(product) {
    try {
      await addItem(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.primary_image_url,
          price: Number(product.price),
        },
        null,
        1,
      );
      addToast('Producto agregado al carrito', 'success');
    } catch {
      addToast('No se pudo agregar el producto al carrito', 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink sm:text-3xl">Favoritos</h1>

      {products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Tu lista de favoritos está vacía"
          description="Guardá los productos que te interesan para encontrarlos fácilmente."
          action={
            <Button as={Link} to="/catalogo">
              Ir al catálogo
            </Button>
          }
        />
      ) : (
        <ProductGrid
          products={products}
          renderActions={(product) => (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={product.stock <= 0}
                onClick={() => handleAddToCart(product)}
              >
                <ShoppingCart size={14} />
                Agregar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Quitar de favoritos"
                loading={!!removingIds[product.id]}
                onClick={() => handleRemove(product)}
              >
                <HeartOff size={14} />
              </Button>
            </>
          )}
        />
      )}
    </div>
  );
}
