import clsx from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

export default function DataTable({
  columns,
  data,
  isLoading,
  emptyMessage = 'No hay datos para mostrar.',
  onSort,
  sortBy,
  sortDirection,
  keyField = 'id',
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-surface shadow-sm">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl bg-surface shadow-sm">
        <EmptyState title="Sin resultados" description={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-soft/10">
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={clsx(
                  'px-4 py-3 text-left font-semibold text-ink-soft',
                  column.sortable && 'cursor-pointer select-none hover:text-ink',
                )}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortBy === column.key && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[keyField]}
              className="border-b border-ink-soft/10 last:border-none hover:bg-surface-alt"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-ink">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
