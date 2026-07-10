import clsx from 'clsx';

export default function StatsCard({ title, value, icon: Icon, trend, subtitle, iconClassName }) {
  const trendIsPositive = typeof trend === 'string' && trend.startsWith('+');
  const trendIsNegative = typeof trend === 'string' && trend.startsWith('-');

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-soft">{title}</span>
        <span className="font-display text-2xl font-bold text-ink">{value}</span>
        {subtitle && <span className="text-xs text-ink-soft">{subtitle}</span>}
        {trend && (
          <span
            className={clsx(
              'text-xs font-semibold',
              trendIsPositive && 'text-emerald-600',
              trendIsNegative && 'text-red-600',
              !trendIsPositive && !trendIsNegative && 'text-ink-soft',
            )}
          >
            {trend}
          </span>
        )}
      </div>
      {Icon && (
        <div
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600',
            iconClassName,
          )}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
