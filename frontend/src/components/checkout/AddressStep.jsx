import { useEffect, useState } from 'react';
import { Plus, MapPin } from 'lucide-react';
import clsx from 'clsx';
import * as addressesApi from '../../api/addresses';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import AddressForm from './AddressForm';
import { useToastStore } from '../../stores/toastStore';

function formatAddressLine(address) {
  const parts = [
    `${address.street} ${address.number}`,
    address.floor_apt || null,
    address.city,
    `${address.state} (${address.zip_code})`,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function AddressStep({ onNext, className }) {
  const addToast = useToastStore((state) => state.addToast);

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    addressesApi
      .getAddresses()
      .then((response) => {
        if (!isMounted) return;
        setAddresses(response.data);
        const defaultAddress = response.data.find((address) => address.is_default);
        if (defaultAddress) {
          setSelectedId(defaultAddress.id);
        } else if (response.data.length > 0) {
          setSelectedId(response.data[0].id);
        } else {
          setShowForm(true);
        }
      })
      .catch(() => setAddresses([]))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateAddress(data) {
    setIsSubmitting(true);
    try {
      const response = await addressesApi.createAddress(data);
      setAddresses((prev) => [...prev, response.data]);
      setSelectedId(response.data.id);
      setShowForm(false);
    } catch {
      addToast('No se pudo guardar la dirección', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col gap-5', className)}>
      <h2 className="font-display text-lg font-semibold text-ink">
        ¿A dónde enviamos tu pedido?
      </h2>

      {addresses.length === 0 && !showForm && (
        <p className="text-sm text-ink-soft">Todavía no tenés direcciones guardadas.</p>
      )}

      <div className="flex flex-col gap-3">
        {addresses.map((address) => {
          const isSelected = selectedId === address.id;
          return (
            <button
              key={address.id}
              type="button"
              onClick={() => setSelectedId(address.id)}
              aria-pressed={isSelected}
              className={clsx(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-ink-soft/15 bg-white hover:border-ink-soft/30',
              )}
            >
              <span
                className={clsx(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  isSelected ? 'border-brand-600' : 'border-ink-soft/30',
                )}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
              </span>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{address.label || 'Dirección'}</span>
                  {address.is_default && <Badge variant="purple">Principal</Badge>}
                </div>
                <p className="text-sm text-ink-soft">{formatAddressLine(address)}</p>
                {address.phone && <p className="text-sm text-ink-soft">Tel: {address.phone}</p>}
              </div>
            </button>
          );
        })}
      </div>

      {showForm ? (
        <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
          <AddressForm
            onSubmit={handleCreateAddress}
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            isSubmitting={isSubmitting}
            submitLabel="Guardar y usar esta dirección"
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-fit"
        >
          <Plus size={16} />
          Agregar nueva dirección
        </Button>
      )}

      <Button
        size="lg"
        disabled={!selectedId}
        onClick={() => onNext(selectedId)}
        className="w-fit"
      >
        <MapPin size={18} />
        Continuar
      </Button>
    </div>
  );
}
