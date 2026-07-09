import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import clsx from 'clsx';
import * as addressesApi from '../../api/addresses';
import * as couponsApi from '../../api/coupons';
import * as ordersApi from '../../api/orders';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useCartStore } from '../../stores/cartStore';
import { formatPrice } from '../../utils/formatters';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 5000;
const COUPON_STORAGE_KEY = 'techstore_coupon_code';

function formatAddressLine(address) {
  const parts = [
    `${address.street} ${address.number}`,
    address.floor_apt || null,
    address.city,
    `${address.state} (${address.zip_code})`,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function ReviewStep({ addressId, onNext, onBack, className }) {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const syncWithBackend = useCartStore((state) => state.syncWithBackend);

  const [address, setAddress] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!addressId) return;
    let isMounted = true;
    setIsLoadingAddress(true);
    addressesApi
      .getAddress(addressId)
      .then((response) => {
        if (isMounted) setAddress(response.data);
      })
      .catch(() => {
        if (isMounted) setAddress(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAddress(false);
      });
    return () => {
      isMounted = false;
    };
  }, [addressId]);

  useEffect(() => {
    const savedCode = localStorage.getItem(COUPON_STORAGE_KEY);
    if (savedCode) {
      validateCoupon(savedCode, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shippingCost = subtotal === 0 ? 0 : subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const discount = Number(appliedCoupon?.discount_amount) || 0;
  const total = Math.max(subtotal + shippingCost - discount, 0);

  async function validateCoupon(code, { silent = false } = {}) {
    if (!silent) setIsApplyingCoupon(true);
    setCouponError('');

    try {
      const response = await couponsApi.validateCoupon({ code }, { subtotal });
      if (response.data.valid) {
        setAppliedCoupon({
          code: response.data.coupon.code,
          discount_amount: response.data.discount_amount,
        });
        localStorage.setItem(COUPON_STORAGE_KEY, response.data.coupon.code);
        if (!silent) setCouponInput('');
      } else {
        setAppliedCoupon(null);
        localStorage.removeItem(COUPON_STORAGE_KEY);
        setCouponError(response.data.message || 'El cupón no es válido.');
      }
    } catch {
      setAppliedCoupon(null);
      localStorage.removeItem(COUPON_STORAGE_KEY);
      if (!silent) setCouponError('No se pudo validar el cupón.');
    } finally {
      if (!silent) setIsApplyingCoupon(false);
    }
  }

  function handleApplyCoupon(event) {
    event.preventDefault();
    if (!couponInput.trim()) return;
    validateCoupon(couponInput.trim());
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
    localStorage.removeItem(COUPON_STORAGE_KEY);
  }

  async function handleConfirm() {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const response = await ordersApi.createOrder({
        shipping_address_id: addressId,
        coupon_code: appliedCoupon?.code || null,
        notes: null,
      });
      localStorage.removeItem(COUPON_STORAGE_KEY);
      await syncWithBackend();
      onNext(response.data);
    } catch (error) {
      setSubmitError(
        error.response?.data?.detail || 'No se pudo confirmar el pedido. Intentá de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Dirección de envío</h2>
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Cambiar
          </button>
        </div>
        {isLoadingAddress ? (
          <Spinner size="sm" className="text-brand-600" />
        ) : address ? (
          <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
            <p className="font-medium text-ink">{address.label || 'Dirección'}</p>
            <p className="text-sm text-ink-soft">{formatAddressLine(address)}</p>
            {address.phone && <p className="text-sm text-ink-soft">Tel: {address.phone}</p>}
          </div>
        ) : (
          <p className="text-sm text-red-600">No se pudo cargar la dirección seleccionada.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold text-ink">Tu pedido</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-ink-soft/15 bg-white p-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {item.productName} <span className="text-ink-soft">x{item.quantity}</span>
                </p>
                {item.variantName && <p className="text-xs text-ink-soft">{item.variantName}</p>}
              </div>
              <span className="shrink-0 font-medium text-ink">{formatPrice(item.lineTotal)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold text-ink">Cupón de descuento</h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              <Tag size={14} />
              {appliedCoupon.code}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700"
            >
              Quitar
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <Input
              placeholder="Código de cupón"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" loading={isApplyingCoupon}>
              Aplicar
            </Button>
          </form>
        )}
        {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-ink-soft/15 bg-white p-4 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>Subtotal</span>
          <span className="text-ink">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento ({appliedCoupon.code})</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-soft">
          <span>Envío</span>
          <span className={clsx(shippingCost === 0 && 'font-medium text-emerald-700')}>
            {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
          </span>
        </div>
        <p className="text-xs text-ink-soft">Método de envío: Envío estándar</p>
        <div className="flex items-center justify-between border-t border-ink-soft/10 pt-2">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-display text-xl font-bold text-ink">{formatPrice(total)}</span>
        </div>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
          Volver
        </Button>
        <Button
          size="lg"
          onClick={handleConfirm}
          loading={isSubmitting}
          disabled={!address}
          className="flex-1 sm:flex-none"
        >
          Confirmar y pagar
        </Button>
      </div>
    </div>
  );
}
