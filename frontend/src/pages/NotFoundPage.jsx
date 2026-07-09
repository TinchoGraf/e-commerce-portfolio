import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-display text-7xl font-bold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-ink">Página no encontrada</h1>
      <p className="max-w-md text-ink-soft">
        La página que buscás no existe o fue movida. Volvé al inicio para seguir explorando
        TechStore.
      </p>
      <Button as={Link} to="/" className="mt-2">
        Volver al inicio
      </Button>
    </div>
  );
}
