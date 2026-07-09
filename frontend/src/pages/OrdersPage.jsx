import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import * as ordersApi from '../api/orders';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice, formatDate } from '../utils/formatters';
import { getOrderStatusBadge, getPaymentStatusBadge } from '../utils/orderStatus';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  useDocumentTitle('Mis pedidos');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const [orders, setOrders] = useState([]);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    ordersApi
      .getOrders({ page: currentPage, page_size: PAGE_SIZE })
      .then((response) => {
        if (!isMounted) return;
        setOrders(response.data.items);
        setPages(response.data.pages);
      })
      .catch(() => {
        if (!isMounted) return;
        setOrders([]);
        setPages(1);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  function handlePageChange(page) {
    const next = new URLSearchParams(searchParams);
    next.set('page', page);
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink sm:text-3xl">
        Mis pedidos
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-brand-600" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Todavía no hiciste ningún pedido"
          description="Cuando compres algo, vas a ver tus pedidos acá."
          action={
            <Button as={Link} to="/catalogo">
              Ir al catálogo
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const statusBadge = getOrderStatusBadge(order.status);
              const paymentBadge = getPaymentStatusBadge(order.payment_status);
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-xl border border-ink-soft/15 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-ink">Pedido #{order.order_number}</p>
                    <p className="text-sm text-ink-soft">{formatDate(order.created_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <div className="text-right">
                      <p className="font-display text-lg font-semibold text-ink">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {itemCount} producto{itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Link
                      to={`/pedidos/${order.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={pages}
            onPageChange={handlePageChange}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
