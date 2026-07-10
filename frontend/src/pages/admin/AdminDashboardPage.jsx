import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Clock, Users, Package, Pencil } from 'lucide-react';
import * as adminApi from '../../api/admin';
import StatsCard from '../../components/admin/StatsCard';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatPrice, formatDate } from '../../utils/formatters';
import { getOrderStatusBadge } from '../../utils/orderStatus';

const todayLabel = new Date().toLocaleDateString('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function AdminDashboardPage() {
  useDocumentTitle('Dashboard admin');
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    adminApi
      .getDashboardMetrics()
      .then((response) => {
        if (!isMounted) return;
        setMetrics(response.data);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar las métricas del dashboard.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <EmptyState title="Error" description={error || 'No se pudieron cargar los datos.'} />
    );
  }

  const { summary, recent_sales, top_products, low_stock_products, recent_orders } = metrics;
  const maxRevenue = Math.max(1, ...recent_sales.map((day) => Number(day.revenue) || 0));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Dashboard</h2>
        <p className="text-sm capitalize text-ink-soft">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Ingresos totales"
          value={formatPrice(summary.total_revenue)}
          icon={DollarSign}
        />
        <StatsCard title="Pedidos totales" value={summary.total_orders} icon={ShoppingBag} />
        <StatsCard
          title="Pedidos pendientes"
          value={summary.pending_orders}
          icon={Clock}
          iconClassName={summary.pending_orders > 0 ? 'bg-accent-100 text-accent-700' : undefined}
        />
        <StatsCard title="Clientes" value={summary.total_customers} icon={Users} />
        <StatsCard title="Productos activos" value={summary.total_products} icon={Package} />
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">
          Ventas de los últimos 30 días
        </h3>
        {recent_sales.length === 0 ? (
          <p className="text-sm text-ink-soft">No hay datos de ventas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${recent_sales.length * 20} 140`}
              className="h-40 w-full min-w-[500px]"
              preserveAspectRatio="none"
            >
              {recent_sales.map((day, index) => {
                const revenue = Number(day.revenue) || 0;
                const barHeight = (revenue / maxRevenue) * 110;
                return (
                  <g key={day.date}>
                    <rect
                      x={index * 20 + 3}
                      y={120 - barHeight}
                      width={14}
                      height={Math.max(barHeight, 1)}
                      fill="var(--color-brand-500)"
                      rx="2"
                    >
                      <title>
                        {day.date}: {formatPrice(revenue)} ({day.orders} pedidos)
                      </title>
                    </rect>
                    {index % 5 === 0 && (
                      <text
                        x={index * 20 + 10}
                        y="135"
                        fontSize="8"
                        textAnchor="middle"
                        fill="var(--color-ink-soft)"
                      >
                        {day.date?.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-surface p-5 shadow-sm">
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">
            Productos más vendidos
          </h3>
          {top_products.length === 0 ? (
            <p className="text-sm text-ink-soft">Todavía no hay ventas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-soft/10 text-left text-ink-soft">
                  <th className="py-2 font-medium">Producto</th>
                  <th className="py-2 font-medium">Vendidos</th>
                  <th className="py-2 font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {top_products.map((product) => (
                  <tr key={product.product_id} className="border-b border-ink-soft/10 last:border-none">
                    <td className="py-2 pr-2 text-ink">{product.product_name}</td>
                    <td className="py-2 pr-2 text-ink">{product.total_sold}</td>
                    <td className="py-2 text-ink">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl bg-surface p-5 shadow-sm">
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">Stock bajo</h3>
          {low_stock_products.length === 0 ? (
            <p className="text-sm text-ink-soft">Todo el stock está en orden.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {low_stock_products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 border-b border-ink-soft/10 pb-3 last:border-none last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{product.name}</p>
                    <p className="text-xs text-ink-soft">SKU: {product.sku || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={product.stock === 0 ? 'red' : 'orange'}>
                      Stock: {product.stock}
                    </Badge>
                    <Link
                      to={`/admin/productos/${product.id}/editar`}
                      className="text-ink-soft hover:text-brand-600"
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil size={16} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">Pedidos recientes</h3>
        {recent_orders.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-soft/10 text-left text-ink-soft">
                  <th className="py-2 pr-2 font-medium">Pedido</th>
                  <th className="py-2 pr-2 font-medium">Cliente</th>
                  <th className="py-2 pr-2 font-medium">Total</th>
                  <th className="py-2 pr-2 font-medium">Estado</th>
                  <th className="py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.map((order) => {
                  const statusBadge = getOrderStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="border-b border-ink-soft/10 last:border-none">
                      <td className="py-2 pr-2 text-ink">#{order.order_number}</td>
                      <td className="py-2 pr-2 text-ink">{order.customer_name}</td>
                      <td className="py-2 pr-2 text-ink">{formatPrice(order.total)}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </td>
                      <td className="py-2 text-ink-soft">{formatDate(order.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
