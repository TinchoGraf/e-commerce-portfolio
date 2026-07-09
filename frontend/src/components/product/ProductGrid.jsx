import clsx from 'clsx';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, renderActions, className }) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          actions={renderActions ? renderActions(product) : undefined}
        />
      ))}
    </div>
  );
}
