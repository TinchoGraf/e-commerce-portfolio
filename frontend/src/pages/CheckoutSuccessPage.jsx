import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import * as ordersApi from '../api/orders';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CheckoutSuccessPage() {
  useDocumentTitle('Pedido confirmado');
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;
    ordersApi
      .getOrder(orderId)
      .then((response) => {
        if (isMounted) setOrder(response.data);
      })
      .catch(() => {
        if (isMounted) setOrder(null);
      });
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
      <CheckCircle2 size={72} strokeWidth={1.5} className="text-emerald-500" />

      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        ¡Pedido confirmado!
      </h1>

      {order && (
        <p className="text-ink-soft">
          Tu pedido <span className="font-semibold text-ink">#{order.order_number}</span> ha sido
          registrado.
        </p>
      )}

      <p className="text-sm text-ink-soft">
        Te enviaremos novedades sobre el estado de tu pedido. Podés hacer el seguimiento desde tu
        cuenta en cualquier momento.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {orderId && (
          <Button as={Link} to={`/pedidos/${orderId}`}>
            Ver mi pedido
          </Button>
        )}
        <Button as={Link} to="/catalogo" variant="outline">
          Seguir comprando
        </Button>
      </div>
    </div>
  );
}
