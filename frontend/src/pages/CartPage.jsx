import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import * as couponsApi from '../api/coupons';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 5000;
const COUPON_STORAGE_KEY = 'techstore_coupon_code';

export default function CartPage() {
  useDocumentTitle('Carrito');

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);

  const storeItems = useCartStore((state) => state.items);
  const isLoading = useCartStore((state) => state.isLoading);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const [pendingQuantities, setPendingQuantities] = useState({});
  const debounceTimers = useRef({});

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const displayItems = storeItems.map((item) => {
    const quantity = pendingQuantities[item.id] ?? item.quantity;
    return { ...item, quantity, lineTotal: quantity * item.unitPrice };
  });

  const subtotal = displayItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingCost = subtotal === 0 ? 0 : subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const discount = Number(appliedCoupon?.discount_amount) || 0;
  const total = Math.max(subtotal + shippingCost - discount, 0);

  useEffect(() => {
    if (!appliedCoupon) return;
    validateCoupon(appliedCoupon.code, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  function handleUpdateQuantity(itemId, quantity) {
    setPendingQuantities((prev) => ({ ...prev, [itemId]: quantity }));

    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
    }

    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        await updateItemQuantity(itemId, quantity);
      } catch {
        addToast('No se pudo actualizar la cantidad', 'error');
      } finally {
        setPendingQuantities((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    }, 500);
  }

  async function handleRemove(itemId) {
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
      delete debounceTimers.current[itemId];
    }
    try {
      await removeItem(itemId);
    } catch {
      addToast('No se pudo eliminar el producto', 'error');
    }
  }

  async function validateCoupon(code, { silent = false } = {}) {
    if (!isAuthenticated) {
      setCouponError('Iniciá sesión para aplicar un cupón.');
      return;
    }

    if (!silent) setIsApplyingCoupon(true);
    setCouponError('');

    try {
      const response = await couponsApi.validateCoupon({ code }, { subtotal });
      if (response.data.valid) {
        setAppliedCoupon({ code: response.data.coupon.code, discount_amount: response.data.discount_amount });
        localStorage.setItem(COUPON_STORAGE_KEY, response.data.coupon.code);
        if (!silent) addToast('Cupón aplicado correctamente', 'success');
      } else {
        setAppliedCoupon(null);
        localStorage.removeItem(COUPON_STORAGE_KEY);
        setCouponError(response.data.message || 'El cupón no es válido.');
      }
    } catch {
      setAppliedCoupon(null);
      localStorage.removeItem(COUPON_STORAGE_KEY);
      setCouponError('No se pudo validar el cupón.');
    } finally {
      if (!silent) setIsApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
    localStorage.removeItem(COUPON_STORAGE_KEY);
  }

  function handleCheckout() {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  }

  if (isLoading && storeItems.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (storeItems.length === 0) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={ShoppingCart}
          title="Tu carrito está vacío"
          description="Agregá productos para empezar tu compra."
          action={
            <Button as={Link} to="/catalogo">
              Ir al catálogo
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink sm:text-3xl">
        Carrito de compras
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-xl border border-ink-soft/10 bg-white p-4 sm:p-5 lg:w-[65%] lg:flex-none">
          {displayItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <CartSummary
          subtotal={subtotal}
          shippingCost={shippingCost}
          discount={discount}
          total={total}
          couponCode={appliedCoupon?.code}
          onApplyCoupon={validateCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          onCheckout={handleCheckout}
          isApplyingCoupon={isApplyingCoupon}
          couponError={couponError}
          className="lg:sticky lg:top-20 lg:w-[35%]"
        />
      </div>
    </div>
  );
}
