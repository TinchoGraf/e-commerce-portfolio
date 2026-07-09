import clsx from 'clsx';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

const TYPE_CONFIG = {
  success: {
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Icon: CheckCircle2,
  },
  error: {
    className: 'bg-red-50 text-red-800 border-red-200',
    Icon: AlertCircle,
  },
  info: {
    className: 'bg-sky-50 text-sky-800 border-sky-200',
    Icon: Info,
  },
};

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
        const { Icon } = config;
        return (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              'flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg',
              config.className,
            )}
          >
            <Icon size={20} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 cursor-pointer text-current/60 hover:text-current"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
