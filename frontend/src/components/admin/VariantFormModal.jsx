import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import FormModal from './FormModal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EMPTY_FORM = {
  name: '',
  sku: '',
  price_adjustment: '0',
  stock: '0',
  is_active: true,
};

export default function VariantFormModal({ isOpen, onClose, onSubmit, isSubmitting, initialData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attributes, setAttributes] = useState([]);
  const [attrKey, setAttrKey] = useState('');
  const [attrValue, setAttrValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setForm({
        name: initialData.name || '',
        sku: initialData.sku || '',
        price_adjustment: String(initialData.price_adjustment ?? '0'),
        stock: String(initialData.stock ?? '0'),
        is_active: initialData.is_active ?? true,
      });
      setAttributes(Object.entries(initialData.attributes || {}).map(([key, value]) => ({ key, value })));
    } else {
      setForm(EMPTY_FORM);
      setAttributes([]);
    }
    setAttrKey('');
    setAttrValue('');
  }, [isOpen, initialData]);

  function handleAddAttribute() {
    if (!attrKey.trim() || !attrValue.trim()) return;
    setAttributes((prev) => [...prev, { key: attrKey.trim(), value: attrValue.trim() }]);
    setAttrKey('');
    setAttrValue('');
  }

  function handleRemoveAttribute(index) {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const data = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      price_adjustment: Number(form.price_adjustment) || 0,
      stock: Math.max(0, Number(form.stock) || 0),
      is_active: form.is_active,
      attributes: Object.fromEntries(attributes.map(({ key, value }) => [key, value])),
    };
    onSubmit(data);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title={initialData ? 'Editar variante' : 'Agregar variante'}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ajuste de precio"
            type="number"
            step="0.01"
            value={form.price_adjustment}
            onChange={(event) => setForm((prev) => ({ ...prev, price_adjustment: event.target.value }))}
          />
          <Input
            label="Stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            className="h-4 w-4 rounded border-ink-soft/25 text-brand-600 focus:ring-brand-500"
          />
          Activa
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Atributos</span>
          <div className="flex flex-wrap gap-2">
            {attributes.map((attr, index) => (
              <span
                key={`${attr.key}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {attr.key}: {attr.value}
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(index)}
                  aria-label={`Quitar atributo ${attr.key}`}
                  className="cursor-pointer text-brand-500 hover:text-brand-800"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Clave (ej: color)"
              value={attrKey}
              onChange={(event) => setAttrKey(event.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Valor (ej: rojo)"
              value={attrValue}
              onChange={(event) => setAttrValue(event.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleAddAttribute}>
              +
            </Button>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
