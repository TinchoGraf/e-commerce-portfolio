import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ImageOff } from 'lucide-react';
import clsx from 'clsx';
import { formatPrice } from '../../utils/formatters';

export default function CartItem({ item, onUpdateQuantity, onRemove, className }) {
  return (
    <div className={clsx('flex gap-3 border-b border-ink-soft/10 py-4 last:border-0 sm:gap-4', className)}>
      <Link
        to={`/producto/${item.productSlug}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-alt sm:h-24 sm:w-24"
      >
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-soft/40">
            <ImageOff size={24} strokeWidth={1.5} />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-2 min-w-0">
        <div>
          <Link
            to={`/producto/${item.productSlug}`}
            className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand-600 sm:text-base"
          >
            {item.productName}
          </Link>
          {item.variantName && <p className="text-xs text-ink-soft">{item.variantName}</p>}
          <p className="mt-1 text-sm text-ink-soft">{formatPrice(item.unitPrice)} c/u</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-ink-soft/20">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              aria-label="Disminuir cantidad"
              disabled={item.quantity <= 1}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink hover:bg-surface-alt disabled:cursor-not-allowed disabled:text-ink-soft/40"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-medium text-ink">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              aria-label="Aumentar cantidad"
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink hover:bg-surface-alt"
            >
              <Plus size={14} />
            </button>
          </div>

          <span className="font-display text-sm font-semibold text-ink sm:text-base">
            {formatPrice(item.lineTotal)}
          </span>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label="Eliminar del carrito"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink-soft hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
