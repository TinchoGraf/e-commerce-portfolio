import { useState } from 'react';
import clsx from 'clsx';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EMPTY_ADDRESS = {
  label: '',
  street: '',
  number: '',
  floor_apt: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  is_default: false,
};

/** Formulario inline de dirección, reutilizado en checkout y en el perfil. */
export default function AddressForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar dirección',
  isSubmitting = false,
  className,
}) {
  const [values, setValues] = useState({ ...EMPTY_ADDRESS, ...initialValues });
  const [error, setError] = useState('');

  function updateField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!values.street.trim() || !values.number.trim() || !values.city.trim() ||
        !values.state.trim() || !values.zip_code.trim()) {
      setError('Completá los campos obligatorios.');
      return;
    }

    onSubmit({
      label: values.label.trim() || null,
      street: values.street.trim(),
      number: values.number.trim(),
      floor_apt: values.floor_apt.trim() || null,
      city: values.city.trim(),
      state: values.state.trim(),
      zip_code: values.zip_code.trim(),
      phone: values.phone.trim() || null,
      is_default: values.is_default,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('flex flex-col gap-3', className)}>
      <Input
        label="Etiqueta (opcional)"
        placeholder="Casa, Trabajo..."
        value={values.label}
        onChange={(event) => updateField('label', event.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Calle"
          value={values.street}
          onChange={(event) => updateField('street', event.target.value)}
          required
          className="sm:col-span-2"
        />
        <Input
          label="Número"
          value={values.number}
          onChange={(event) => updateField('number', event.target.value)}
          required
        />
      </div>

      <Input
        label="Piso/Depto (opcional)"
        value={values.floor_apt}
        onChange={(event) => updateField('floor_apt', event.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Ciudad"
          value={values.city}
          onChange={(event) => updateField('city', event.target.value)}
          required
        />
        <Input
          label="Provincia"
          value={values.state}
          onChange={(event) => updateField('state', event.target.value)}
          required
        />
        <Input
          label="Código postal"
          value={values.zip_code}
          onChange={(event) => updateField('zip_code', event.target.value)}
          required
        />
      </div>

      <Input
        label="Teléfono (opcional)"
        type="tel"
        value={values.phone}
        onChange={(event) => updateField('phone', event.target.value)}
      />

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.is_default}
          onChange={(event) => updateField('is_default', event.target.checked)}
          className="h-4 w-4 rounded border-ink-soft/30 text-brand-600 focus:ring-brand-500"
        />
        Marcar como principal
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
