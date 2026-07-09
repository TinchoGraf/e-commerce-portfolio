import clsx from 'clsx';

const VARIANT_CLASSES = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-accent-100 text-accent-600',
  blue: 'bg-sky-100 text-sky-700',
  purple: 'bg-brand-100 text-brand-700',
};

export default function Badge({ variant = 'blue', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
