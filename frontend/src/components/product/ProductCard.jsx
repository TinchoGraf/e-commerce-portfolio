import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';
import { formatPrice, calculateDiscountPercent } from '../../utils/formatters';

export default function ProductCard({ product, actions, className }) {
  const discountPercent = calculateDiscountPercent(product.price, product.compare_at_price);
  const outOfStock = product.stock <= 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className={clsx(
        'group flex flex-col overflow-hidden rounded-xl border border-ink-soft/10 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-alt">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft/50">
            <ImageOff size={36} strokeWidth={1.5} />
            <span className="text-xs font-medium">TechStore</span>
          </div>
        )}
        {discountPercent > 0 && (
          <Badge variant="orange" className="absolute left-3 top-3">
            -{discountPercent}%
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <Badge variant="red">Sin stock</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-ink">{product.name}</h3>

        <StarRating rating={product.avg_rating} count={product.review_count} size={14} />

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-semibold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price > product.price && (
            <span className="text-sm text-ink-soft line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {!outOfStock && product.stock <= 5 && (
          <span className="text-xs font-medium text-accent-700">
            Últimas {product.stock} unidades
          </span>
        )}

        {actions && (
          <div onClick={(event) => event.stopPropagation()} className="mt-2 flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </Link>
  );
}
