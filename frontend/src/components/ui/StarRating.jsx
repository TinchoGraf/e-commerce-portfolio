import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

const STAR_INDEXES = [0, 1, 2, 3, 4];

function starFillPercent(rating, index) {
  const diff = rating - index;
  if (diff >= 1) return 100;
  if (diff <= 0) return 0;
  return Math.round(diff * 100);
}

export default function StarRating({
  rating,
  count,
  value,
  onChange,
  size = 18,
  className,
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const isInput = typeof onChange === 'function';

  if (isInput) {
    const active = hoverValue || value || 0;
    return (
      <div className={clsx('inline-flex items-center gap-1', className)}>
        {STAR_INDEXES.map((index) => {
          const starValue = index + 1;
          const filled = starValue <= active;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              onMouseLeave={() => setHoverValue(0)}
              className="cursor-pointer text-accent-500"
              aria-label={`Calificar con ${starValue} estrella${starValue > 1 ? 's' : ''}`}
            >
              <Star
                size={size}
                fill={filled ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
    );
  }

  const safeRating = Number(rating) || 0;

  return (
    <div className={clsx('inline-flex items-center gap-1.5', className)}>
      <div className="inline-flex items-center gap-0.5 text-accent-500">
        {STAR_INDEXES.map((index) => {
          const percent = starFillPercent(safeRating, index);
          return (
            <span key={index} className="relative inline-block" style={{ width: size, height: size }}>
              <Star size={size} strokeWidth={1.5} className="absolute inset-0 text-ink-soft/30" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${percent}%` }}
              >
                <Star size={size} strokeWidth={1.5} fill="currentColor" />
              </span>
            </span>
          );
        })}
      </div>
      {typeof count === 'number' && (
        <span className="text-sm text-ink-soft">({count} reseñas)</span>
      )}
    </div>
  );
}
