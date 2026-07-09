import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildPageList(currentPage, totalPages) {
  const pages = [];
  const delta = 1;
  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);
  if (rangeStart > 2) pages.push('ellipsis-start');
  for (let page = rangeStart; page <= rangeEnd; page++) {
    pages.push(page);
  }
  if (rangeEnd < totalPages - 1) pages.push('ellipsis-end');
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav
      className={clsx('flex items-center justify-center gap-1.5', className)}
      aria-label="Paginación"
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface-alt disabled:cursor-not-allowed disabled:text-ink-soft/40 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>

      {pages.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={clsx(
              'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-brand-600 text-white'
                : 'text-ink hover:bg-surface-alt',
            )}
          >
            {page}
          </button>
        ) : (
          <span key={`${page}-${index}`} className="px-1 text-ink-soft">
            …
          </span>
        ),
      )}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface-alt disabled:cursor-not-allowed disabled:text-ink-soft/40 disabled:hover:bg-transparent"
      >
        Siguiente
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
