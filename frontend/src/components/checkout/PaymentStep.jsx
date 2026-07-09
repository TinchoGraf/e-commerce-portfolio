import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import clsx from 'clsx';
import * as paymentsApi from '../../api/payments';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { formatPrice } from '../../utils/formatters';

export default function PaymentStep({ order, className }) {
  const navigate = useNavigate();

  const [paymentData, setPaymentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    paymentsApi
      .createPayment(order.id)
      .then((response) => {
        if (!isMounted) return;
        setPaymentData(response.data);
        if (!response.data.mock && response.data.init_point) {
          window.location.href = response.data.init_point;
        }
      })
      .catch(() => {
        if (isMounted) setError('No se pudo iniciar el pago. Intentá de nuevo.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [order.id]);

  async function handleMockApprove() {
    setIsConfirming(true);
    setError('');
    try {
      await paymentsApi.mockCheckout(order.id);
      navigate(`/checkout/exito?order_id=${order.id}`);
    } catch {
      setError('No se pudo confirmar el pago. Intentá de nuevo.');
      setIsConfirming(false);
    }
  }

  if (isLoading) {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-3 py-16', className)}>
        <Spinner size="lg" className="text-brand-600" />
        <p className="text-sm text-ink-soft">Preparando el pago...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('flex flex-col items-center gap-3 py-10 text-center', className)}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (paymentData && !paymentData.mock) {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-3 py-16', className)}>
        <Spinner size="lg" className="text-brand-600" />
        <p className="text-sm text-ink-soft">Redirigiendo a Mercado Pago...</p>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center gap-6 py-6 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <CreditCard size={28} strokeWidth={1.5} />
      </div>

      <div>
        <p className="text-sm text-ink-soft">Pedido</p>
        <p className="font-display text-lg font-semibold text-ink">#{order.order_number}</p>
      </div>

      <div>
        <p className="text-sm text-ink-soft">Total a pagar</p>
        <p className="font-display text-2xl font-bold text-ink">{formatPrice(order.total)}</p>
      </div>

      <p className="max-w-sm text-xs text-ink-soft">
        Este es un checkout de prueba (modo mock). Al simular el pago, tu pedido pasará a estado
        confirmado.
      </p>

      <Button size="lg" onClick={handleMockApprove} loading={isConfirming}>
        Simular pago aprobado
      </Button>
    </div>
  );
}
