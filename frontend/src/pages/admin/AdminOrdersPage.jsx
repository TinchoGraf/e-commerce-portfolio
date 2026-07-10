import { useEffect, useState } from 'react';
import { Eye, Search, X } from 'lucide-react';
import * as adminApi from '../../api/admin';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../stores/toastStore';
import { formatPrice, formatDate } from '../../utils/formatters';
import { getOrderStatusBadge, getPaymentStatusBadge } from '../../utils/orderStatus';

const PAGE_SIZE = 20;

const ORDER_STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'];

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

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

function OrderDetailModal({ order, onClose, onStatusUpdated }) {
  const addToast = useToastStore((state) => state.addToast);
  const [nextStatus, setNextStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const statusBadge = getOrderStatusBadge(order.status);
  const paymentBadge = getPaymentStatusBadge(order.payment_status);
  const snapshot = order.shipping_address_snapshot || {};
  const availableTransitions = STATUS_TRANSITIONS[order.status] || [];

  async function handleUpdateStatus() {
    if (!nextStatus || nextStatus === order.status) return;
    if (
      nextStatus === 'CANCELLED' &&
      !window.confirm(`¿Cancelar el pedido #${order.order_number}? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      await adminApi.updateOrderStatus(order.id, { status: nextStatus });
      addToast('Estado del pedido actualizado correctamente', 'success');
      onStatusUpdated();
    } catch (error) {
      addToast(
        error.response?.data?.detail || 'No se pudo actualizar el estado del pedido',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-soft/10 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Pedido #{order.order_number}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-lg p-1 text-ink-soft hover:bg-surface-alt"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="rounded-lg border border-ink-soft/15 p-4">
            <h3 className="mb-1 font-semibold text-ink">Cliente</h3>
            <p className="text-sm text-ink-soft">{order.customer_name}</p>
            <p className="text-sm text-ink-soft">{order.customer_email}</p>
            <p className="mt-1 text-sm text-ink-soft">Fecha: {formatDate(order.created_at)}</p>
          </div>

          <div className="rounded-lg border border-ink-soft/15 p-4">
            <h3 className="mb-1 font-semibold text-ink">Dirección de envío</h3>
            <p className="font-medium text-ink">{snapshot.label || 'Dirección'}</p>
            <p className="text-sm text-ink-soft">{formatAddressLine(snapshot)}</p>
            {snapshot.phone && <p className="text-sm text-ink-soft">Tel: {snapshot.phone}</p>}
          </div>

          <div className="rounded-lg border border-ink-soft/15 p-4">
            <h3 className="mb-2 font-semibold text-ink">Productos</h3>
            <div className="flex flex-col divide-y divide-ink-soft/10">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2">
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

          <div className="flex flex-col gap-2 rounded-lg border border-ink-soft/15 p-4 text-sm">
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
              <span className={Number(order.shipping_cost) === 0 ? 'font-medium text-emerald-700' : 'text-ink'}>
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
              <span className="font-display text-lg font-bold text-ink">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-lg border border-ink-soft/15 p-4">
              <h3 className="mb-1 font-semibold text-ink">Notas</h3>
              <p className="text-sm text-ink-soft">{order.notes}</p>
            </div>
          )}

          <div className="rounded-lg border border-ink-soft/15 p-4">
            <h3 className="mb-2 font-semibold text-ink">Cambiar estado</h3>
            {availableTransitions.length === 0 ? (
              <p className="text-sm text-ink-soft">Este pedido está en un estado final.</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value)}
                  className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Seleccionar nuevo estado...</option>
                  {availableTransitions.map((status) => (
                    <option key={status} value={status}>
                      {getOrderStatusBadge(status).label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  disabled={!nextStatus || nextStatus === order.status}
                  loading={isSubmitting}
                  onClick={handleUpdateStatus}
                >
                  Actualizar estado
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  useDocumentTitle('Pedidos');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState([]);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, paymentStatusFilter]);

  function fetchOrders() {
    let isMounted = true;
    setIsLoading(true);

    const params = {
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      payment_status: paymentStatusFilter || undefined,
    };

    adminApi
      .getAllOrders(params)
      .then((response) => {
        if (!isMounted) return;
        setOrders(response.data.items);
        setPages(response.data.pages);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar los pedidos.');
        setOrders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }

  useEffect(() => {
    const cleanup = fetchOrders();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, paymentStatusFilter]);

  function handleStatusUpdated() {
    setSelectedOrder(null);
    fetchOrders();
  }

  const columns = [
    {
      key: 'order_number',
      header: 'Número de orden',
      render: (row) => <span className="font-mono font-semibold text-ink">{row.order_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Cliente',
      render: (row) => row.customer_name,
    },
    {
      key: 'created_at',
      header: 'Fecha',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const badge = getOrderStatusBadge(row.status);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'payment_status',
      header: 'Estado de pago',
      render: (row) => {
        const badge = getPaymentStatusBadge(row.payment_status);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'total',
      header: 'Total',
      render: (row) => formatPrice(row.total),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(row)}
          className="inline-flex items-center gap-1.5 text-ink-soft hover:text-brand-600"
          aria-label={`Ver detalle del pedido ${row.order_number}`}
        >
          <Eye size={16} />
          Ver detalle
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-2xl font-semibold text-ink">Pedidos</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <Input
            placeholder="Buscar por número de orden..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos los estados</option>
          {ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {getOrderStatusBadge(status).label}
            </option>
          ))}
        </select>

        <select
          value={paymentStatusFilter}
          onChange={(event) => setPaymentStatusFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos los estados de pago</option>
          {PAYMENT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {getPaymentStatusBadge(status).label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={orders}
            isLoading={isLoading}
            emptyMessage="No se encontraron pedidos con estos filtros."
          />
          <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
        </>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
