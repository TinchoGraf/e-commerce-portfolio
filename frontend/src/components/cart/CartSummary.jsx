import { useState } from 'react';
import clsx from 'clsx';
import { Tag } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { formatPrice } from '../../utils/formatters';

export default function CartSummary({
  subtotal,
  shippingCost,
  discount = 0,
  total,
  couponCode,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
  isApplyingCoupon = false,
  couponError,
  className,
}) {
  const [inputCode, setInputCode] = useState('');

  function handleApply(event) {
    event.preventDefault();
    if (!inputCode.trim()) return;
    onApplyCoupon(inputCode.trim());
  }

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 rounded-xl border border-ink-soft/10 bg-white p-5',
        className,
      )}
    >
      <h2 className="font-display text-lg font-semibold text-ink">Resumen del pedido</h2>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>Subtotal</span>
          <span className="text-ink">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span>Envío</span>
          <span className={clsx(shippingCost === 0 && 'font-medium text-emerald-700')}>
            {shippingCost === 0 ? 'Envío gratis' : formatPrice(shippingCost)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento{couponCode ? ` (${couponCode})` : ''}</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-ink-soft/10 pt-3">
        <span className="font-semibold text-ink">Total</span>
        <span className="font-display text-xl font-bold text-ink">{formatPrice(total)}</span>
      </div>

      {couponCode ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            <Tag size={14} />
            {couponCode}
          </span>
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700"
          >
            Quitar
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex gap-2">
          <Input
            placeholder="Código de cupón"
            value={inputCode}
            onChange={(event) => setInputCode(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" loading={isApplyingCoupon}>
            Aplicar
          </Button>
        </form>
      )}

      {couponError && <p className="text-sm text-red-600">{couponError}</p>}

      <Button size="lg" onClick={onCheckout} className="w-full">
        Ir al checkout
      </Button>
    </div>
  );
}
