import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

export default function LoginForm({ onSuccess, className }) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('flex flex-col gap-4', className)}>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoComplete="email"
      />
      <Input
        label="Contraseña"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        autoComplete="current-password"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={isSubmitting} className="w-full">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-ink-soft">
        ¿No tenés cuenta?{' '}
        <Link to="/registro" className="font-medium text-brand-600 hover:text-brand-700">
          Registrate
        </Link>
      </p>
    </form>
  );
}
