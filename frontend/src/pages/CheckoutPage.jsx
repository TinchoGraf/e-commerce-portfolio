import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import AddressStep from '../components/checkout/AddressStep';
import ReviewStep from '../components/checkout/ReviewStep';
import PaymentStep from '../components/checkout/PaymentStep';
import { useCartStore } from '../stores/cartStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const STEPS = [
  { key: 'address', label: 'Dirección' },
  { key: 'review', label: 'Revisar pedido' },
  { key: 'payment', label: 'Pago' },
];

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();

  const itemCount = useCartStore((state) => state.itemCount);
  const isCartLoading = useCartStore((state) => state.isLoading);

  const [currentStep, setCurrentStep] = useState('address');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    if (!isCartLoading && itemCount === 0 && !createdOrder) {
      navigate('/carrito');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartLoading, itemCount, createdOrder]);

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink sm:text-3xl">Checkout</h1>

      <ol className="mb-8 flex items-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          return (
            <li key={step.key} className="flex flex-1 items-center gap-2 sm:gap-3">
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  isActive && 'bg-brand-600 text-white',
                  isCompleted && 'bg-emerald-100 text-emerald-700',
                  !isActive && !isCompleted && 'bg-surface-alt text-ink-soft',
                )}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </span>
              <span
                className={clsx(
                  'hidden text-sm font-medium sm:block',
                  isActive ? 'text-ink' : isCompleted ? 'text-emerald-700' : 'text-ink-soft',
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={clsx(
                    'h-px flex-1',
                    isCompleted ? 'bg-emerald-300' : 'bg-ink-soft/15',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {currentStep === 'address' && (
        <AddressStep
          onNext={(addressId) => {
            setSelectedAddressId(addressId);
            setCurrentStep('review');
          }}
        />
      )}

      {currentStep === 'review' && (
        <ReviewStep
          addressId={selectedAddressId}
          onBack={() => setCurrentStep('address')}
          onNext={(order) => {
            setCreatedOrder(order);
            setCurrentStep('payment');
          }}
        />
      )}

      {currentStep === 'payment' && createdOrder && <PaymentStep order={createdOrder} />}
    </div>
  );
}
