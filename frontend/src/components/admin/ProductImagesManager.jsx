import { useState } from 'react';
import { Trash2, Star } from 'lucide-react';
import * as adminApi from '../../api/admin';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToastStore } from '../../stores/toastStore';

export default function ProductImagesManager({ productId, images, onRefetch }) {
  const addToast = useToastStore((state) => state.addToast);
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddImage(event) {
    event.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    try {
      await adminApi.addProductImage(productId, {
        url: url.trim(),
        alt_text: altText.trim() || null,
        is_primary: images.length === 0,
      });
      addToast('Imagen agregada correctamente', 'success');
      setUrl('');
      setAltText('');
      await onRefetch();
    } catch {
      addToast('No se pudo agregar la imagen', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(imageId) {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    try {
      await adminApi.deleteProductImage(imageId);
      addToast('Imagen eliminada correctamente', 'success');
      await onRefetch();
    } catch {
      addToast('No se pudo eliminar la imagen', 'error');
    }
  }

  async function handleSetPrimary(image) {
    try {
      await adminApi.addProductImage(productId, {
        url: image.url,
        alt_text: image.alt_text,
        is_primary: true,
      });
      addToast('Imagen marcada como principal', 'success');
      await onRefetch();
    } catch {
      addToast('No se pudo marcar la imagen como principal', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {images.length === 0 ? (
        <p className="text-sm text-ink-soft">Este producto todavía no tiene imágenes.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="flex flex-col gap-2 rounded-lg border border-ink-soft/15 p-2">
              <img
                src={image.url}
                alt={image.alt_text || ''}
                className="h-24 w-full rounded object-cover"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(image)}
                  disabled={image.is_primary}
                  aria-label="Marcar como principal"
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium text-ink-soft hover:text-brand-600 disabled:cursor-default disabled:text-accent-600"
                >
                  <Star size={14} className={image.is_primary ? 'fill-accent-500 text-accent-500' : ''} />
                  {image.is_primary ? 'Principal' : 'Marcar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  aria-label="Eliminar imagen"
                  className="cursor-pointer text-ink-soft hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddImage} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="URL de la imagen"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          className="sm:flex-1"
        />
        <Input
          label="Texto alternativo"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          placeholder="Descripción de la imagen"
          className="sm:flex-1"
        />
        <Button type="submit" variant="secondary" loading={isSubmitting}>
          Agregar imagen
        </Button>
      </form>
    </div>
  );
}
