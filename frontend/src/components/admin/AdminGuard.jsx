import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';

export default function AdminGuard({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-ink">Acceso denegado</h1>
        <p className="text-ink-soft">No tenés permisos de administrador.</p>
        <Button as={Link} to="/">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return children;
}
