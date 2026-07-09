import clsx from 'clsx';

export default function VariantSelector({ variants = [], selectedVariantId, onSelect, className }) {
  if (!variants.length) return null;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-ink">Variante</span>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const outOfStock = variant.stock === 0;
          const selected = variant.id === selectedVariantId;
          return (
            <button
              key={variant.id}
              type="button"
              disabled={outOfStock}
              onClick={() => onSelect(variant.id)}
              aria-pressed={selected}
              className={clsx(
                'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-ink-soft/25 text-ink hover:border-brand-400',
                outOfStock &&
                  'cursor-not-allowed border-ink-soft/15 text-ink-soft/40 line-through hover:border-ink-soft/15',
              )}
            >
              {variant.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
