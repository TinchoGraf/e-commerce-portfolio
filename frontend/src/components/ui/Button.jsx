import clsx from 'clsx';
import Spinner from './Spinner';

const VARIANT_CLASSES = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-surface-alt text-ink hover:bg-brand-100 active:bg-brand-200 disabled:text-ink-soft',
  outline:
    'border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100 disabled:border-brand-200 disabled:text-brand-200',
  ghost:
    'text-ink hover:bg-surface-alt active:bg-brand-100 disabled:text-ink-soft',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
};

const SIZE_CLASSES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-base px-4 py-2.5 gap-2',
  lg: 'text-lg px-6 py-3 gap-2.5',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}) {
  return (
    <Component
      disabled={Component === 'button' ? disabled || loading : undefined}
      aria-disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </Component>
  );
}
