import { useSearchParams, useNavigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import { useCartStore } from '../stores/cartStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function RegisterPage() {
  useDocumentTitle('Crear cuenta');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mergeLocalCartToBackend = useCartStore((state) => state.mergeLocalCartToBackend);

  async function handleSuccess() {
    await mergeLocalCartToBackend();
    navigate(searchParams.get('redirect') || '/');
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[450px] flex-col justify-center px-4 py-12 sm:px-0">
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink">
        Crear cuenta
      </h1>
      <div className="rounded-xl border border-ink-soft/10 bg-white p-6">
        <RegisterForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
