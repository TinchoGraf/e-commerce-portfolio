import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import * as ordersApi from '../api/orders';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice, formatDate } from '../utils/formatters';
import { getOrderStatusBadge, getPaymentStatusBadge } from '../utils/orderStatus';

function formatAddressLine(snapshot) {
  const parts = [
    `${snapshot.street} ${snapshot.number}`,
    snapshot.floor_apt || null,
    snapshot.city,
    `${snapshot.state} (${snapshot.zip_code})`,
    snapshot.country || null,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(order ? `Pedido #${order.order_number}` : 'Pedido');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);

    ordersApi
      .getOrder(id)
      .then((response) => {
        if (isMounted) setOrder(response.data);
      })
      .catch(() => {
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState title="Pedido no encontrado" description="Revisá el enlace o volvé a tus pedidos." />
      </div>
    );
  }

  const statusBadge = getOrderStatusBadge(order.status);
  const paymentBadge = getPaymentStatusBadge(order.payment_status);
  const snapshot = order.shipping_address_snapshot || {};

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/pedidos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft size={16} />
        Volver a mis pedidos
      </Link>

      <h1 className="mb-6 font-display text-2xl font-semibold text-ink sm:text-3xl">
        Pedido #{order.order_number}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
            </div>
            <p className="text-sm text-ink-soft">Fecha: {formatDate(order.created_at)}</p>
            <p className="text-sm text-ink-soft">
              Método de envío: {order.shipping_method || 'Envío estándar'}
            </p>
          </div>

          <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
            <h2 className="mb-2 font-display text-lg font-semibold text-ink">
              Dirección de envío
            </h2>
            <p className="font-medium text-ink">{snapshot.label || 'Dirección'}</p>
            <p className="text-sm text-ink-soft">{formatAddressLine(snapshot)}</p>
            {snapshot.phone && <p className="text-sm text-ink-soft">Tel: {snapshot.phone}</p>}
          </div>

          <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Productos</h2>
            <div className="flex flex-col divide-y divide-ink-soft/10">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{item.product_name}</p>
                    <p className="text-xs text-ink-soft">
                      {item.product_sku && `SKU: ${item.product_sku} · `}
                      Cantidad: {item.quantity} · {formatPrice(item.unit_price)} c/u
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-ink">
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl border border-ink-soft/15 bg-white p-4 text-sm lg:w-[300px] lg:shrink-0">
          <h2 className="mb-1 font-display text-lg font-semibold text-ink">Resumen</h2>
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="text-ink">{formatPrice(order.subtotal)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Descuento</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-ink-soft">
            <span>Envío</span>
            <span className={order.shipping_cost == 0 ? 'font-medium text-emerald-700' : 'text-ink'}>
              {Number(order.shipping_cost) === 0 ? 'Gratis' : formatPrice(order.shipping_cost)}
            </span>
          </div>
          {Number(order.tax_amount) > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>Impuestos</span>
              <span className="text-ink">{formatPrice(order.tax_amount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ink-soft/10 pt-2">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-display text-xl font-bold text-ink">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
