import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as adminApi from '../../api/admin';
import DataTable from '../../components/admin/DataTable';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../stores/toastStore';

const EMPTY_FORM = {
  name: '',
  slug: '',
  logo_url: '',
  is_active: true,
};

export default function AdminBrandsPage() {
  useDocumentTitle('Marcas');
  const addToast = useToastStore((state) => state.addToast);

  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function fetchBrands() {
    setIsLoading(true);
    return adminApi
      .getAdminBrands({ include_inactive: true })
      .then((response) => {
        setBrands(response.data);
        setError(null);
      })
      .catch(() => {
        setError('No se pudieron cargar las marcas.');
        setBrands([]);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchBrands();
  }, []);

  function handleOpenCreate() {
    setEditingBrand(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function handleOpenEdit(brand) {
    setEditingBrand(brand);
    setFormData({
      name: brand.name || '',
      slug: brand.slug || '',
      logo_url: brand.logo_url || '',
      is_active: brand.is_active ?? true,
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingBrand(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      logo_url: formData.logo_url.trim() || undefined,
      is_active: formData.is_active,
    };

    try {
      if (editingBrand) {
        await adminApi.updateBrand(editingBrand.id, payload);
        addToast('Marca actualizada correctamente', 'success');
      } else {
        await adminApi.createBrand(payload);
        addToast('Marca creada correctamente', 'success');
      }
      handleCloseModal();
      fetchBrands();
    } catch (submitError) {
      const message = submitError.response?.data?.detail || 'No se pudo guardar la marca.';
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(brand) {
    if (!window.confirm(`¿Eliminar la marca "${brand.name}"?`)) return;
    try {
      await adminApi.deleteBrand(brand.id);
      addToast('Marca eliminada correctamente', 'success');
      fetchBrands();
    } catch (deleteError) {
      const message = deleteError.response?.data?.detail || 'No se pudo eliminar la marca.';
      addToast(message, 'error');
    }
  }

  const columns = [
    {
      key: 'logo',
      header: 'Logo',
      width: 56,
      render: (row) =>
        row.logo_url ? (
          <img
            src={row.logo_url}
            alt={row.name}
            loading="lazy"
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-surface-alt" />
        ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (row) => (
        <Badge variant={row.is_active ? 'green' : 'gray'}>
          {row.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="cursor-pointer text-ink-soft hover:text-brand-600"
            aria-label={`Editar ${row.name}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="cursor-pointer text-ink-soft hover:text-red-600"
            aria-label={`Eliminar ${row.name}`}
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
        <h2 className="font-display text-2xl font-semibold text-ink">Marcas</h2>
        <Button onClick={handleOpenCreate}>
          <Plus size={18} />
          Nueva marca
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={brands}
          isLoading={isLoading}
          emptyMessage="No se encontraron marcas."
        />
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBrand ? 'Editar marca' : 'Nueva marca'}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={editingBrand ? 'Guardar cambios' : 'Crear marca'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Se genera automáticamente si se deja vacío"
          />
          <Input
            label="URL del logo"
            value={formData.logo_url}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, logo_url: event.target.value }))
            }
          />

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-soft/25 text-brand-600 focus:ring-brand-500"
              checked={formData.is_active}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Activa
          </label>
        </div>
      </FormModal>
    </div>
  );
}
