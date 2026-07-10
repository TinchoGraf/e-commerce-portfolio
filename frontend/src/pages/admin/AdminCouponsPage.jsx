import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as adminApi from '../../api/admin';
import DataTable from '../../components/admin/DataTable';
import FormModal from '../../components/admin/FormModal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../stores/toastStore';
import { formatPrice, formatDate } from '../../utils/formatters';

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase_amount: '',
  max_discount_amount: '',
  usage_limit: '',
  per_user_limit: '1',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

function getCouponStatus(coupon) {
  if (!coupon.is_active) return { variant: 'gray', label: 'Inactivo' };
  if (new Date(coupon.valid_until) < new Date()) return { variant: 'gray', label: 'Expirado' };
  return { variant: 'green', label: 'Activo' };
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminCouponsPage() {
  useDocumentTitle('Cupones');
  const addToast = useToastStore((state) => state.addToast);

  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | expired | inactive

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function fetchCoupons() {
    let isMounted = true;
    setIsLoading(true);

    adminApi
      .getCoupons({ include_expired: true })
      .then((response) => {
        if (!isMounted) return;
        setCoupons(response.data);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar los cupones.');
        setCoupons([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }

  useEffect(() => {
    const cleanup = fetchCoupons();
    return cleanup;
  }, []);

  const filteredCoupons = useMemo(() => {
    if (statusFilter === 'all') return coupons;
    return coupons.filter((coupon) => {
      const now = new Date();
      const isExpired = new Date(coupon.valid_until) < now;
      if (statusFilter === 'active') return coupon.is_active && !isExpired;
      if (statusFilter === 'expired') return isExpired;
      if (statusFilter === 'inactive') return !coupon.is_active;
      return true;
    });
  }, [coupons, statusFilter]);

  function openCreateModal() {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? ''),
      min_purchase_amount: coupon.min_purchase_amount != null ? String(coupon.min_purchase_amount) : '',
      max_discount_amount: coupon.max_discount_amount != null ? String(coupon.max_discount_amount) : '',
      usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
      per_user_limit: coupon.per_user_limit != null ? String(coupon.per_user_limit) : '1',
      valid_from: toDatetimeLocalValue(coupon.valid_from),
      valid_until: toDatetimeLocalValue(coupon.valid_until),
      is_active: coupon.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm() {
    const errors = {};

    if (!form.code.trim()) {
      errors.code = 'El código es obligatorio.';
    }

    const discountValue = Number(form.discount_value);
    if (!form.discount_value || Number.isNaN(discountValue) || discountValue <= 0) {
      errors.discount_value = 'Ingresá un valor mayor a 0.';
    } else if (form.discount_type === 'percentage' && discountValue > 100) {
      errors.discount_value = 'El porcentaje no puede ser mayor a 100.';
    }

    if (!form.valid_from) {
      errors.valid_from = 'La fecha de inicio es obligatoria.';
    }
    if (!form.valid_until) {
      errors.valid_until = 'La fecha de fin es obligatoria.';
    }
    if (form.valid_from && form.valid_until && new Date(form.valid_until) <= new Date(form.valid_from)) {
      errors.valid_until = 'Debe ser posterior a la fecha de inicio.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_purchase_amount: form.min_purchase_amount ? Number(form.min_purchase_amount) : null,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : 1,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      is_active: form.is_active,
    };

    setIsSubmitting(true);
    try {
      if (editingCoupon) {
        await adminApi.updateCoupon(editingCoupon.id, payload);
        addToast('Cupón actualizado correctamente', 'success');
      } else {
        await adminApi.createCoupon(payload);
        addToast('Cupón creado correctamente', 'success');
      }
      closeModal();
      fetchCoupons();
    } catch (error) {
      addToast(error.response?.data?.detail || 'No se pudo guardar el cupón', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(coupon) {
    if (!window.confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
    try {
      await adminApi.deleteCoupon(coupon.id);
      addToast('Cupón eliminado correctamente', 'success');
      fetchCoupons();
    } catch (error) {
      addToast(error.response?.data?.detail || 'No se pudo eliminar el cupón', 'error');
    }
  }

  const columns = [
    {
      key: 'code',
      header: 'Código',
      render: (row) => <span className="font-mono font-semibold text-ink">{row.code}</span>,
    },
    {
      key: 'discount_type',
      header: 'Tipo',
      render: (row) =>
        row.discount_type === 'percentage' ? (
          <Badge variant="purple">Porcentaje</Badge>
        ) : (
          <Badge variant="blue">Monto fijo</Badge>
        ),
    },
    {
      key: 'discount_value',
      header: 'Valor',
      render: (row) =>
        row.discount_type === 'percentage'
          ? `${row.discount_value}%`
          : formatPrice(row.discount_value),
    },
    {
      key: 'min_purchase_amount',
      header: 'Compra mínima',
      render: (row) => (row.min_purchase_amount ? formatPrice(row.min_purchase_amount) : '—'),
    },
    {
      key: 'max_discount_amount',
      header: 'Tope de descuento',
      render: (row) => (row.max_discount_amount ? formatPrice(row.max_discount_amount) : '—'),
    },
    {
      key: 'usage_count',
      header: 'Usos',
      render: (row) => `${row.usage_count}/${row.usage_limit ?? '∞'}`,
    },
    {
      key: 'validity',
      header: 'Vigencia',
      render: (row) => (
        <span className="text-sm text-ink-soft">
          {formatDate(row.valid_from)} – {formatDate(row.valid_until)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const status = getCouponStatus(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="cursor-pointer text-ink-soft hover:text-brand-600"
            aria-label={`Editar ${row.code}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="cursor-pointer text-ink-soft hover:text-red-600"
            aria-label={`Eliminar ${row.code}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-2xl font-semibold text-ink">Cupones</h2>
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo cupón
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="expired">Expirados</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCoupons}
          isLoading={isLoading}
          emptyMessage="No se encontraron cupones con estos filtros."
        />
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCoupon ? 'Editar cupón' : 'Nuevo cupón'}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={editingCoupon ? 'Guardar cambios' : 'Crear cupón'}
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Código"
            value={form.code}
            onChange={(event) => updateField('code', event.target.value.toUpperCase())}
            error={formErrors.code}
            required
          />

          <Input
            label="Descripción"
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Tipo de descuento</label>
              <select
                value={form.discount_type}
                onChange={(event) => updateField('discount_type', event.target.value)}
                className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
              </select>
            </div>

            <Input
              label="Valor del descuento"
              type="number"
              min="0"
              value={form.discount_value}
              onChange={(event) => updateField('discount_value', event.target.value)}
              error={formErrors.discount_value}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Compra mínima"
              type="number"
              min="0"
              value={form.min_purchase_amount}
              onChange={(event) => updateField('min_purchase_amount', event.target.value)}
            />
            <Input
              label="Tope de descuento"
              type="number"
              min="0"
              value={form.max_discount_amount}
              onChange={(event) => updateField('max_discount_amount', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Límite de usos totales"
              type="number"
              min="0"
              placeholder="Ilimitado"
              value={form.usage_limit}
              onChange={(event) => updateField('usage_limit', event.target.value)}
            />
            <Input
              label="Límite por usuario"
              type="number"
              min="0"
              value={form.per_user_limit}
              onChange={(event) => updateField('per_user_limit', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Válido desde"
              type="datetime-local"
              value={form.valid_from}
              onChange={(event) => updateField('valid_from', event.target.value)}
              error={formErrors.valid_from}
              required
            />
            <Input
              label="Válido hasta"
              type="datetime-local"
              value={form.valid_until}
              onChange={(event) => updateField('valid_until', event.target.value)}
              error={formErrors.valid_until}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
              className="h-4 w-4 rounded border-ink-soft/25 text-brand-600 focus:ring-brand-500"
            />
            Activo
          </label>
        </div>
      </FormModal>
    </div>
  );
}
