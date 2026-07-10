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
  description: '',
  image_url: '',
  parent_id: '',
  display_order: 0,
  is_active: true,
};

export default function AdminCategoriesPage() {
  useDocumentTitle('Categorías');
  const addToast = useToastStore((state) => state.addToast);

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function fetchCategories() {
    setIsLoading(true);
    return adminApi
      .getAdminCategories({ include_inactive: true })
      .then((response) => {
        setCategories(response.data);
        setError(null);
      })
      .catch(() => {
        setError('No se pudieron cargar las categorías.');
        setCategories([]);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function findCategoryById(id) {
    for (const root of categories) {
      if (root.id === id) return root;
      const child = root.children?.find((item) => item.id === id);
      if (child) return child;
    }
    return null;
  }

  const rows = categories.flatMap((root) => [
    { ...root, depth: 0 },
    ...(root.children || []).map((child) => ({ ...child, depth: 1, parentName: root.name })),
  ]);

  function handleOpenCreate() {
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function handleOpenEdit(row) {
    const category = findCategoryById(row.id) || row;
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image_url: category.image_url || '',
      parent_id: category.parent_id ? String(category.parent_id) : '',
      display_order: category.display_order ?? 0,
      is_active: category.is_active ?? true,
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      description: formData.description.trim() || undefined,
      image_url: formData.image_url.trim() || undefined,
      parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      display_order: Number(formData.display_order) || 0,
      is_active: formData.is_active,
    };

    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, payload);
        addToast('Categoría actualizada correctamente', 'success');
      } else {
        await adminApi.createCategory(payload);
        addToast('Categoría creada correctamente', 'success');
      }
      handleCloseModal();
      fetchCategories();
    } catch (submitError) {
      const message = submitError.response?.data?.detail || 'No se pudo guardar la categoría.';
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`¿Eliminar la categoría "${row.name}"?`)) return;
    try {
      await adminApi.deleteCategory(row.id);
      addToast('Categoría eliminada correctamente', 'success');
      fetchCategories();
    } catch (deleteError) {
      const message = deleteError.response?.data?.detail || 'No se pudo eliminar la categoría.';
      addToast(message, 'error');
    }
  }

  const rootOptions = categories.filter(
    (root) => !editingCategory || root.id !== editingCategory.id,
  );

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (row) => (
        <span className={row.depth === 1 ? 'pl-4 text-ink' : 'font-medium text-ink'}>
          {row.depth === 1 ? `└─ ${row.name}` : row.name}
        </span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
    },
    {
      key: 'parentName',
      header: 'Categoría padre',
      render: (row) => row.parentName || '—',
    },
    {
      key: 'display_order',
      header: 'Orden',
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
        <h2 className="font-display text-2xl font-semibold text-ink">Categorías</h2>
        <Button onClick={handleOpenCreate}>
          <Plus size={18} />
          Nueva categoría
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyMessage="No se encontraron categorías."
        />
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={editingCategory ? 'Guardar cambios' : 'Crear categoría'}
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
            as="textarea"
            label="Descripción"
            value={formData.description}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <Input
            label="URL de imagen"
            value={formData.image_url}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, image_url: event.target.value }))
            }
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="parent-category" className="text-sm font-medium text-ink">
              Categoría padre
            </label>
            <select
              id="parent-category"
              value={formData.parent_id}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, parent_id: event.target.value }))
              }
              className="rounded-lg border border-ink-soft/25 bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Ninguna — categoría raíz</option>
              {rootOptions.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            type="number"
            label="Orden de visualización"
            value={formData.display_order}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, display_order: event.target.value }))
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
