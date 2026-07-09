import clsx from 'clsx';

export default function Input({
  as: Component = 'input',
  label,
  error,
  type = 'text',
  placeholder,
  className,
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <Component
        id={inputId}
        type={Component === 'input' ? type : undefined}
        placeholder={placeholder}
        rows={Component === 'textarea' ? 4 : undefined}
        className={clsx(
          'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          error ? 'border-red-400' : 'border-ink-soft/25',
          className,
        )}
        {...props}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
