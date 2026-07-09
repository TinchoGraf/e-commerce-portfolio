import clsx from 'clsx';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 py-16 px-4 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold text-ink">{title}</h3>}
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
