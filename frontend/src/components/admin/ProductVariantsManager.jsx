import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import * as adminApi from '../../api/admin';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import VariantFormModal from './VariantFormModal';
import { useToastStore } from '../../stores/toastStore';

export default function ProductVariantsManager({ productId, variants, onRefetch }) {
  const addToast = useToastStore((state) => state.addToast);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openCreateModal() {
    setEditingVariant(null);
    setIsModalOpen(true);
  }

  function openEditModal(variant) {
    setEditingVariant(variant);
    setIsModalOpen(true);
  }

  async function handleSubmit(data) {
    setIsSubmitting(true);
    try {
      if (editingVariant) {
        await adminApi.updateProductVariant(editingVariant.id, data);
        addToast('Variante actualizada correctamente', 'success');
      } else {
        await adminApi.addProductVariant(productId, data);
        addToast('Variante agregada correctamente', 'success');
      }
      setIsModalOpen(false);
      await onRefetch();
    } catch {
      addToast('No se pudo guardar la variante', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(variant) {
    if (!window.confirm(`¿Eliminar la variante "${variant.name}"?`)) return;
    try {
      await adminApi.deleteProductVariant(variant.id);
      addToast('Variante eliminada correctamente', 'success');
      await onRefetch();
    } catch {
      addToast('No se pudo eliminar la variante', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length === 0 ? (
        <p className="text-sm text-ink-soft">Este producto todavía no tiene variantes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-soft/10 text-left text-ink-soft">
                <th className="py-2 pr-2 font-medium">Nombre</th>
                <th className="py-2 pr-2 font-medium">SKU</th>
                <th className="py-2 pr-2 font-medium">Ajuste precio</th>
                <th className="py-2 pr-2 font-medium">Stock</th>
                <th className="py-2 pr-2 font-medium">Atributos</th>
                <th className="py-2 pr-2 font-medium">Estado</th>
                <th className="py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b border-ink-soft/10 last:border-none">
                  <td className="py-2 pr-2 text-ink">{variant.name}</td>
                  <td className="py-2 pr-2 text-ink-soft">{variant.sku || '—'}</td>
                  <td className="py-2 pr-2 text-ink">{variant.price_adjustment}</td>
                  <td className="py-2 pr-2 text-ink">{variant.stock}</td>
                  <td className="py-2 pr-2 text-ink-soft">
                    {Object.entries(variant.attributes || {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ') || '—'}
                  </td>
                  <td className="py-2 pr-2">
                    <Badge variant={variant.is_active ? 'green' : 'gray'}>
                      {variant.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(variant)}
                        aria-label={`Editar variante ${variant.name}`}
                        className="cursor-pointer text-ink-soft hover:text-brand-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(variant)}
                        aria-label={`Eliminar variante ${variant.name}`}
                        className="cursor-pointer text-ink-soft hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <Button type="button" variant="secondary" onClick={openCreateModal}>
          <Plus size={18} />
          Agregar variante
        </Button>
      </div>

      <VariantFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        initialData={editingVariant}
      />
    </div>
  );
}
