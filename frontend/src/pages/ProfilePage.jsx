import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Package, Heart, Plus, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import * as addressesApi from '../api/addresses';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import AddressForm from '../components/checkout/AddressForm';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NAV_ITEMS = [
  { key: 'account', label: 'Mi cuenta' },
  { key: 'addresses', label: 'Mis direcciones' },
  { type: 'link', label: 'Mis pedidos', to: '/pedidos' },
  { type: 'link', label: 'Favoritos', to: '/favoritos' },
];

function formatAddressLine(address) {
  const parts = [
    `${address.street} ${address.number}`,
    address.floor_apt || null,
    address.city,
    `${address.state} (${address.zip_code})`,
  ].filter(Boolean);
  return parts.join(', ');
}

function AccountTab({ user }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-lg font-semibold text-ink">Mi cuenta</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-ink-soft/15 bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Nombre completo
          </p>
          <p className="text-ink">
            {user?.first_name} {user?.last_name}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Email</p>
          <p className="text-ink">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Teléfono</p>
          <p className="text-ink">{user?.phone || 'No cargado'}</p>
        </div>
      </div>

      <p className="text-sm text-ink-soft">Próximamente podrás editar tu perfil.</p>
    </div>
  );
}

function AddressesTab() {
  const addToast = useToastStore((state) => state.addToast);

  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadAddresses() {
    setIsLoading(true);
    addressesApi
      .getAddresses()
      .then((response) => setAddresses(response.data))
      .catch(() => setAddresses([]))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  async function handleCreate(data) {
    setIsSubmitting(true);
    try {
      const response = await addressesApi.createAddress(data);
      setAddresses((prev) => [...prev, response.data]);
      setShowCreateForm(false);
      addToast('Dirección agregada correctamente', 'success');
    } catch {
      addToast('No se pudo guardar la dirección', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(addressId, data) {
    setIsSubmitting(true);
    try {
      const response = await addressesApi.updateAddress(addressId, data);
      setAddresses((prev) =>
        prev.map((address) => (address.id === addressId ? response.data : address)),
      );
      setEditingId(null);
      addToast('Dirección actualizada correctamente', 'success');
    } catch {
      addToast('No se pudo actualizar la dirección', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(addressId) {
    if (!window.confirm('¿Eliminar esta dirección?')) return;
    try {
      await addressesApi.deleteAddress(addressId);
      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
      addToast('Dirección eliminada correctamente', 'success');
    } catch {
      addToast('No se pudo eliminar la dirección', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Mis direcciones</h2>
        {!showCreateForm && (
          <Button size="sm" variant="outline" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} />
            Agregar dirección
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="rounded-xl border border-ink-soft/15 bg-white p-4">
          <AddressForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-brand-600" />
        </div>
      ) : addresses.length === 0 && !showCreateForm ? (
        <EmptyState
          icon={MapPin}
          title="No tenés direcciones guardadas"
          description="Agregá una dirección para agilizar tus próximas compras."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((address) =>
            editingId === address.id ? (
              <div key={address.id} className="rounded-xl border border-ink-soft/15 bg-white p-4">
                <AddressForm
                  initialValues={address}
                  onSubmit={(data) => handleUpdate(address.id, data)}
                  onCancel={() => setEditingId(null)}
                  isSubmitting={isSubmitting}
                  submitLabel="Guardar cambios"
                />
              </div>
            ) : (
              <div
                key={address.id}
                className="flex flex-col gap-2 rounded-xl border border-ink-soft/15 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{address.label || 'Dirección'}</span>
                    {address.is_default && <Badge variant="purple">Principal</Badge>}
                  </div>
                  <p className="text-sm text-ink-soft">{formatAddressLine(address)}</p>
                  {address.phone && <p className="text-sm text-ink-soft">Tel: {address.phone}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(address.id)}>
                    <Pencil size={14} />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  useDocumentTitle('Mi perfil');
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink sm:text-3xl">Mi perfil</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          role="tablist"
          aria-label="Secciones de mi perfil"
          className="flex gap-1 overflow-x-auto rounded-xl border border-ink-soft/15 bg-white p-1.5 lg:w-[220px] lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-visible"
        >
          {NAV_ITEMS.map((item) =>
            item.type === 'link' ? (
              <Link
                key={item.label}
                to={item.to}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-alt hover:text-ink"
              >
                {item.label === 'Mis pedidos' ? <Package size={16} /> : <Heart size={16} />}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={activeTab === item.key}
                aria-controls={`profile-panel-${item.key}`}
                onClick={() => setActiveTab(item.key)}
                className={clsx(
                  'flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  activeTab === item.key
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-ink-soft hover:bg-surface-alt hover:text-ink',
                )}
              >
                {item.key === 'addresses' && <MapPin size={16} />}
                {item.label}
              </button>
            ),
          )}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === 'account' && (
            <div id="profile-panel-account" role="tabpanel">
              <AccountTab user={user} />
            </div>
          )}
          {activeTab === 'addresses' && (
            <div id="profile-panel-addresses" role="tabpanel">
              <AddressesTab />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
