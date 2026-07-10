import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Button from '../ui/Button';

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isSubmitting,
  submitLabel = 'Guardar',
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={clsx('w-full rounded-xl bg-surface shadow-lg', maxWidth)}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b border-ink-soft/10 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="cursor-pointer rounded-lg p-1 text-ink-soft hover:bg-surface-alt"
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

          <div className="flex justify-end gap-3 border-t border-ink-soft/10 px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
